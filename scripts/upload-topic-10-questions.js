/**
 * Скрипт для загрузки вопросов темы 10 в Supabase
 * Все вопросы из test-results.json относятся к теме 10
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env.local файл (приоритет над .env)
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// UUID темы 10 из таблицы topics
const TOPIC_10_ID = '4ee11103-1725-4869-96b1-3bfa1236a6b2';
const COUNTRY = 'es';

async function loadTopic10Questions() {
    try {
        console.log('📖 Reading topic-10-all-60.json...');
        const jsonPath = path.join(__dirname, '../data/topic-10-all-60.json');
        const jsonContent = await fs.readFile(jsonPath, 'utf-8');
        const questions = JSON.parse(jsonContent);

        console.log(`✅ Found ${questions.length} questions in JSON`);

        // Подготовка вопросов для вставки
        const questionsToInsert = questions.map((q, index) => ({
            topic_id: TOPIC_10_ID,
            country: COUNTRY,
            // Обязательные поля с дефолтными значениями
            difficulty: 'easy',
            is_premium: false,
            type: q.type || 'single',
            version: 1,
            // Вопросы на разных языках
            question_es: q.question_es,
            question_ru: q.question_ru || null,
            question_en: q.question_en || null,
            // Объяснения на разных языках
            explanation_es: q.metadata?.explanation_es || q.explanation_es || null,
            explanation_ru: q.metadata?.explanation_ru || q.explanation_ru || null,
            explanation_en: q.metadata?.explanation_en || q.explanation_en || null,
            // Изображения
            image_url: q.image_url || null,
            // Метаданные с опциями и дополнительной информацией
            metadata: {
                category: q.category || q.metadata?.category || 'B',
                source: q.metadata?.source || q.source || 'practicalvial',
                question_number: q.metadata?.original_number || q.question_number || (index + 1),
                // НОВЫЙ ФОРМАТ: answer_options
                answer_options: q.metadata?.answer_options || [],
                // Поддержка старого формата для обратной совместимости
                ...(q.correct_answer && {
                    correct_answer: q.correct_answer,
                    options: {
                        es: {
                            a: q.option_a_es,
                            b: q.option_b_es,
                            c: q.option_c_es
                        },
                        ru: {
                            a: q.option_a_ru || null,
                            b: q.option_b_ru || null,
                            c: q.option_c_ru || null
                        },
                        en: {
                            a: q.option_a_en || null,
                            b: q.option_b_en || null,
                            c: q.option_c_en || null
                        }
                    }
                }),
                images: {
                    main: q.image_filename || null,
                    schema: q.schema_filename || null,
                    schema_url: q.schema_url || null
                }
            }
        }));

        console.log(`\n🚀 Inserting ${questionsToInsert.length} questions into Supabase...`);
        console.log(`   Topic: Tipos y técnicas de conducción (${TOPIC_10_ID})`);
        console.log(`   Country: ${COUNTRY}\n`);

        // Вставка пакетами по 10 вопросов
        const batchSize = 10;
        let inserted = 0;

        for (let i = 0; i < questionsToInsert.length; i += batchSize) {
            const batch = questionsToInsert.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('questions_new')
                .insert(batch)
                .select('id');

            if (error) {
                console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
                throw error;
            }

            inserted += batch.length;
            console.log(`✅ Inserted ${inserted}/${questionsToInsert.length} questions`);
        }

        console.log(`\n🎉 SUCCESS! Loaded ${inserted} questions for Topic 10`);

        // Проверка результата
        const { count, error: countError } = await supabase
            .from('questions_new')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', TOPIC_10_ID)
            .eq('country', COUNTRY);

        if (countError) {
            console.error('❌ Error checking count:', countError);
        } else {
            console.log(`\n📊 Total questions for Topic 10 in DB: ${count}`);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

loadTopic10Questions();
