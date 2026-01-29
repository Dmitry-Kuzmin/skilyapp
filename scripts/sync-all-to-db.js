#!/usr/bin/env node

/**
 * 🔄 ПОЛНАЯ СИНХРОНИЗАЦИЯ (ROBUST)
 * 
 * - Сканирует ВСЕ папки
 * - Только с картинками
 * - Генерирует ID если его нет (из текста)
 * - Исправляет кривые ID (hash -> UUID)
 * - Стабильные UUID для ответов
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
).trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
});

const DATA_DIR = path.join(__dirname, '..', 'data', 'parsed');

const stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// Функция для генерации стабильного UUID из строки (Safe)
function generateDeterministicUUID(input) {
    if (input === undefined || input === null) {
        input = 'undefined-input-' + Math.random(); // Fallback, shouldn't happen with checks
    }
    const hash = crypto.createHash('md5').update(String(input)).digest('hex');
    // Форматируем как UUID (8-4-4-4-12)
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
    ].join('-');
}

function findAllEnrichedFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findAllEnrichedFiles(fullPath, files);
        } else if (item.endsWith('-enriched.json')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function syncAll() {
    console.log('🔄 Loading topic map from DB...');
    const { data: topicsDB } = await supabase.from('topics').select('id, order_index');
    const topicMap = {};
    if (topicsDB) {
        topicsDB.forEach(t => {
            if (t.order_index) topicMap[t.order_index] = t.id;
        });
        console.log(`🗺️  Mapped ${Object.keys(topicMap).length} topics by index`);
    }

    const files = findAllEnrichedFiles(DATA_DIR);
    console.log(`📂 Found ${files.length} enriched files to sync (ALL FOLDERS)`);

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const questions = JSON.parse(content);

            console.log(`\n📄 Processing: ${path.basename(file)} (${questions.length} questions)`);

            for (const q of questions) {
                stats.total++;

                // 🛑 SKIP IF NO IMAGE
                if (!q.image_url || q.image_url.trim() === '') {
                    stats.skipped++;
                    process.stdout.write('s');
                    continue;
                }

                // --- Fix Topic ID ---
                let finalTopicId = q.topic_id;
                if (!finalTopicId && q.topic_number && topicMap[q.topic_number]) {
                    finalTopicId = topicMap[q.topic_number];
                }
                if (finalTopicId && !finalTopicId.includes('-') && !isNaN(parseInt(finalTopicId))) {
                    const num = parseInt(finalTopicId);
                    if (topicMap[num]) finalTopicId = topicMap[num];
                    else finalTopicId = null;
                }
                if (!finalTopicId) finalTopicId = null;

                // --- Fix Question ID ---
                let questionId = q.id || q.external_id;

                if (!questionId) {
                    // Если ID нет, пробуем сгенерировать из текста вопроса
                    const qText = q.question?.es || q.question?.ru || q.text_es;
                    if (qText) {
                        // Используем текст вопроса как seed для UUID
                        questionId = generateDeterministicUUID(qText.trim());
                    } else {
                        // Если и текста нет - это мусор
                        stats.skipped++;
                        process.stdout.write('x'); // x for bad data
                        continue;
                    }
                }

                // Убеждаемся, что это UUID
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(questionId)) {
                    questionId = generateDeterministicUUID(questionId);
                }

                const data = {
                    id: questionId,
                    topic_id: finalTopicId,
                    question_ru: q.question?.ru || q.text_ru || '',
                    question_es: q.question?.es || q.text_es || '',
                    question_en: q.question?.en || q.text_en || '',
                    explanation_ru: q.explanation?.ru || q.explanation_ru || '',
                    explanation_es: q.explanation?.es || q.explanation_es || '',
                    explanation_en: q.explanation?.en || q.explanation_en || '',
                    image_url: q.image_url || null,
                    source: q.source || 'practicavial',
                    metadata: q.metadata || {}
                };

                // 1. Upsert Question
                const { error: qError } = await supabase
                    .from('questions_new')
                    .upsert(data, { onConflict: 'id' });

                if (qError) {
                    console.error(`   ❌ Failed to sync question ${data.id}: ${qError.message}`);
                    stats.failed++;
                    stats.errors.push(`${path.basename(file)}: Question error: ${qError.message}`);
                    continue;
                }

                // 2. Sync Answers
                if (q.answers && Array.isArray(q.answers)) {
                    for (let i = 0; i < q.answers.length; i++) {
                        const answer = q.answers[i];
                        const answerText = answer.text || {};

                        // Stable UUID for answer (depends on questionId and index)
                        const stableId = generateDeterministicUUID(`${data.id}_${i}`);

                        const { error: answerError } = await supabase
                            .from('answer_options')
                            .upsert({
                                id: stableId,
                                question_id: data.id,
                                text_ru: answerText.ru || answer.text || '',
                                text_es: answerText.es || '',
                                text_en: answerText.en || '',
                                is_correct: answer.is_correct || false,
                                position: i
                            }, {
                                onConflict: 'question_id,position',
                                ignoreDuplicates: false
                            });

                        if (answerError) {
                            console.warn(`   ⚠️  Answer ${i} failed: ${answerError.message}`);
                        }
                    }
                }

                stats.success++;
                process.stdout.write('.');
            }
        } catch (error) {
            console.error(`\n❌ Error processing file ${path.basename(file)}:`, error.message);
            stats.errors.push(`${path.basename(file)}: File error: ${error.message}`);
        }
    }

    console.log('\n\n========================================');
    console.log('✅ SYNC COMPLETED');
    console.log('========================================');
    console.log(`Total processed: ${stats.total}`);
    console.log(`Success: ${stats.success}`);
    console.log(`Skipped (no image/text): ${stats.skipped}`);
    console.log(`Failed: ${stats.failed}`);

    if (stats.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        stats.errors.slice(0, 20).forEach(e => console.log(e));
        if (stats.errors.length > 20) console.log(`...and ${stats.errors.length - 20} more`);
    }
}

syncAll();
