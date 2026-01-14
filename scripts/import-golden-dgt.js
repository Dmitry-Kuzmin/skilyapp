#!/usr/bin/env node

/**
 * ИМПОРТ ВОПРОСОВ DGT (GOLDEN STANDARD)
 * 
 * Этот скрипт импортирует один JSON файл в таблицу questions_new.
 * Поддерживает сохранение оригинальной ссылки на картинку в метадате.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function importFile(filePath, options = {}) {
    const { overwrite = false, topicId = null } = options;

    // Проверка переменных окружения
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("❌ Ошибка: Не найдены параметры SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY");
        throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`\n🚀 Начинаем импорт: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Файл не найден: ${filePath}`);
        return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(rawData);

    // Извлекаем номер теста из имени файла (например, topic-01_test-001-enriched.json -> 1)
    const fileName = path.basename(filePath);
    const testMatch = fileName.match(/test-(\d+)/);
    const testNumber = testMatch ? parseInt(testMatch[1]) : null;

    // Извлекаем номер темы из имени файла или данных
    const topicMatch = fileName.match(/topic-(\d+)/);
    const fileTopicNumber = topicMatch ? parseInt(topicMatch[1]) : null;
    const topicNumber = fileTopicNumber || (questions[0] && questions[0].topic_number);

    console.log(`📦 Найдено вопросов: ${questions.length}`);
    console.log(`ℹ️ Тема: ${topicNumber}, Тест: ${testNumber}`);

    if (overwrite && topicNumber) {
        console.log(`🧹 Удаляем старые вопросы для темы ${topicNumber}, теста ${testNumber}...`);

        // 1. Сначала находим ID вопросов, которые нужно удалить
        let deleteQuery = supabase
            .from('questions_new')
            .select('id')
            .eq('country', 'es')
            .eq('metadata->topic_number', topicNumber);

        if (testNumber !== null) {
            deleteQuery = deleteQuery.eq('metadata->test_number', testNumber);
        }

        const { data: toDelete, error: findError } = await deleteQuery;

        if (findError) {
            console.error(`❌ Ошибка при поиске вопросов для удаления:`, findError);
        } else if (toDelete && toDelete.length > 0) {
            const idsToDelete = toDelete.map(q => q.id);
            console.log(`🗑️ Найдено ${idsToDelete.length} вопросов для удаления.`);

            // Удаляем ответы (каскадное удаление если настроено, или вручную)
            const { error: aDelError } = await supabase
                .from('answer_options')
                .delete()
                .in('question_id', idsToDelete);

            if (aDelError) console.error(`⚠️ Ошибка при удалении ответов:`, aDelError);

            // Удаляем сами вопросы
            const { error: qDelError } = await supabase
                .from('questions_new')
                .delete()
                .in('id', idsToDelete);

            if (qDelError) {
                console.error(`❌ Ошибка при удалении вопросов:`, qDelError);
            } else {
                console.log(`✅ Старые вопросы удалены.`);
            }
        } else {
            console.log(`📭 Вопросов для удаления не найдено.`);
        }
    }

    const records = questions.map(q => {
        // Формируем метадату
        const metadata = {
            source: q.source || 'practicavial',
            source_image_url: q.image_url || null,
            source_schema_url: q.schema_url || null,
            topic_number: topicNumber,
            test_number: testNumber,
            question_number: q.question_number,
            category: q.category || 'B'
        };

        return {
            country: 'es',
            topic_id: topicId,
            question_es: q.question.es,
            question_ru: q.question.ru || null,
            question_en: q.question.en || null,
            image_url: q.image_url || q.schema_url || null,
            explanation_es: q.explanation?.es || null,
            explanation_ru: q.explanation?.ru || null,
            explanation_en: q.explanation?.en || null,
            difficulty: 'medium',
            metadata: metadata
        };
    });

    // 1. Вставляем вопросы
    console.log(`📤 Вставляем ${records.length} вопросов в questions_new...`);
    const { data: insertedQuestions, error: qError } = await supabase
        .from('questions_new')
        .insert(records)
        .select();

    if (qError) {
        console.error(`❌ Ошибка при вставке вопросов:`, qError);
        return;
    }

    console.log(`✅ Вопросы успешно вставлены (${insertedQuestions.length})`);

    // 2. Вставляем ответы для каждого вопроса
    console.log(`📤 Вставляем варианты ответов...`);
    const answerRecords = [];

    insertedQuestions.forEach((insertedQ) => {
        // Находим исходный вопрос по номеру или тексту для сопоставления ответов
        const originalQ = questions.find(oq =>
            oq.question.es === insertedQ.question_es &&
            oq.question_number === insertedQ.metadata.question_number
        );

        if (originalQ && originalQ.answers) {
            originalQ.answers.forEach((ans, index) => {
                answerRecords.push({
                    question_id: insertedQ.id,
                    text_es: ans.text.es,
                    text_ru: ans.text.ru || null,
                    text_en: ans.text.en || null,
                    is_correct: ans.is_correct,
                    position: index + 1
                });
            });
        }
    });

    const { error: aError } = await supabase
        .from('answer_options')
        .insert(answerRecords);

    if (aError) {
        console.error(`❌ Ошибка при вставке ответов:`, aError);
    } else {
        console.log(`✅ Ответы успешно вставлены (${answerRecords.length})`);
    }

    console.log(`\n🎉 Импорт файла ${path.basename(filePath)} завершен!`);
}

// Если скрипт запущен напрямую
const args = process.argv.slice(2);
if (args.length > 0) {
    const filePath = path.resolve(args[0]);
    const overwrite = args.includes('--overwrite');
    const topicIdArg = args.find(a => a.startsWith('--topic-id='));
    const topicId = topicIdArg ? topicIdArg.split('=')[1] : null;

    importFile(filePath, { overwrite, topicId });
}

export { importFile };
