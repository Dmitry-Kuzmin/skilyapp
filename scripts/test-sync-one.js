#!/usr/bin/env node

/**
 * 🧪 ТЕСТОВАЯ СИНХРОНИЗАЦИЯ (1 вопрос)
 * 
 * Обновлено с актуальной схемой БД (2026-01-28)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function testSync() {
    console.log('🧪 ТЕСТОВАЯ СИНХРОНИЗАЦИЯ (1 вопрос)');
    console.log('===================================\n');

    const testFile = path.join(__dirname, '..', 'data/parsed/topic-03/topic-03_test-004-enriched.json');

    if (!fs.existsSync(testFile)) {
        console.error('❌ Тестовый файл не найден:', testFile);
        return;
    }

    const jsonData = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    const questions = Array.isArray(jsonData) ? jsonData : [jsonData];
    const question = questions[0];

    if (!question || !question.id) {
        console.error('❌ ID вопроса не найден');
        return;
    }

    console.log('📝 Тестовый вопрос:', question.id);
    console.log('📄 Из файла:', path.basename(testFile));
    console.log('\n🔍 ЧТО БУДЕТ СДЕЛАНО:\n');

    // Проверка текущего состояния
    console.log('1️⃣ Проверка текущего состояния в БД...\n');

    const { data: existing, error: checkError } = await supabase
        .from('questions_new')
        .select('*')
        .eq('id', question.id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Ошибка проверки:', checkError.message);
        return;
    }

    if (existing) {
        console.log('✅ Вопрос УЖЕ СУЩЕСТВУЕТ в БД');
        console.log('   ID:', existing.id);
        console.log('   Текст (RU):', (existing.question_ru || '').substring(0, 50) + '...');
        console.log('   Обновлен:', existing.updated_at);
        console.log('\n⚠️  Будет выполнен UPDATE (обновление)\n');
    } else {
        console.log('ℹ️  Вопрос НЕ НАЙДЕН в БД');
        console.log('   Будет выполнен INSERT (добавление)\n');
    }

    console.log('2️⃣ Данные для синхронизации:\n');
    const questionText = question.question?.ru || question.text || '';
    console.log('   question_ru:', questionText.substring(0, 60) + '...');
    console.log('   explanation_ru:', question.explanation?.ru ? 'Есть' : 'Нет');
    console.log('   image_url:', question.image_url || 'Нет');
    console.log('   answers:', question.answers?.length || 0);

    console.log('\n\n❓ ЗАПУСТИТЬ СИНХРОНИЗАЦИЮ? (Enter = да)');

    process.stdin.resume();
    process.stdin.once('data', async () => {
        console.log('\n🚀 ЗАПУСКАЕМ СИНХРОНИЗАЦИЮ...\n');

        try {
            const questionData = question.question || {};
            const explanationData = question.explanation || {};

            // Готовим topic_id (может быть null если не UUID)
            let topicId = null;
            if (question.topic_id && isValidUUID(question.topic_id)) {
                topicId = question.topic_id;
            }
            // Не используем question.topic_number для topic_id, так как это UUID поле

            // UPSERT вопроса с ПРАВИЛЬНЫМИ колонками
            const { error: questionError } = await supabase
                .from('questions_new')
                .upsert({
                    id: question.id,
                    topic_id: topicId,
                    difficulty: question.difficulty || 'medium',
                    is_premium: question.is_premium || false,
                    image_url: question.image_url || null,
                    source: question.source || 'practicavial',
                    question_ru: questionData.ru || question.text || '',
                    question_es: questionData.es || '',
                    question_en: questionData.en || '',
                    explanation_ru: explanationData.ru || '',
                    explanation_es: explanationData.es || '',
                    explanation_en: explanationData.en || '',
                    country: 'spain',
                    metadata: {
                        ...question.metadata,
                        topic_number: question.topic_number // сохраняем в metadata
                    },
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (questionError) {
                console.error('❌ Ошибка вопроса:', questionError.message);
            } else {
                console.log('✅ Вопрос успешно синхронизирован');
            }

            // UPSERT ответов с ПРАВИЛЬНЫМИ колонками
            if (question.answers && Array.isArray(question.answers)) {
                for (let i = 0; i < question.answers.length; i++) {
                    const answer = question.answers[i];
                    const answerText = answer.text || {};

                    // Генерируем UUID для ID если текущий ID не валидный UUID
                    let answerId = answer.id;
                    if (!isValidUUID(answerId)) {
                        answerId = randomUUID();
                    }

                    const { error: answerError } = await supabase
                        .from('answer_options')
                        .upsert({
                            id: answerId,
                            question_id: question.id,
                            text_ru: answerText.ru || answer.text || '',
                            text_es: answerText.es || '',
                            text_en: answerText.en || '',
                            is_correct: answer.is_correct || false,
                            position: i
                        }, {
                            onConflict: 'id'
                        });

                    if (answerError) {
                        console.error(`❌ Ошибка ответа ${i}:`, answerError.message);
                    }
                }
                console.log(`✅ ${question.answers.length} ответов синхронизировано`);
            }

            console.log('\n✅ ТЕСТ ЗАВЕРШЕН!\n');

            // Показываем результат
            const { data: updated } = await supabase
                .from('questions_new')
                .select('*')
                .eq('id', question.id)
                .single();

            if (updated) {
                console.log('📊 Результат в БД:');
                console.log('   ID:', updated.id);
                console.log('   Текст (RU):', (updated.question_ru || '').substring(0, 50) + '...');
                console.log('   Обновлен:', updated.updated_at);
            }

            process.exit(0);
        } catch (err) {
            console.error('\n❌ Ошибка:', err.message);
            process.exit(1);
        }
    });
}

testSync();
