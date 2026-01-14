/**
 * ========================================
 * GOLDEN STANDARD IMPORTER (v2.0)
 * ========================================
 * Импорт вопросов в новую архитектуру (2 таблицы)
 * 
 * ФОРМАТ ВХОДНОГО JSON:
 * {
 *   "topic_id": 10,
 *   "question_number": 1,
 *   "category": "B",
 *   "question": { "es": "...", "en": "...", "ru": "..." },
 *   "answers": [
 *     { "id": "a", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": false },
 *     { "id": "b", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": true },
 *     { "id": "c", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": false }
 *   ],
 *   "explanation": { "es": "...", "en": "...", "ru": "..." },
 *   "image_url": "...",
 *   "source": "practicalvial"
 * }
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

// ========================================
// КОНФИГУРАЦИЯ
// ========================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const autoConfirm = args.includes('--yes') || args.includes('-y');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Ошибка: не заданы переменные окружения VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function loadQuestions(filePath) {
    try {
        console.log(`📂 Загрузка файла: ${filePath}`);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const questions = Array.isArray(data) ? data : data.questions;

        if (!Array.isArray(questions)) {
            throw new Error('JSON должен содержать массив вопросов');
        }

        console.log(`✅ Загружено ${questions.length} вопросов`);
        return questions;
    } catch (error) {
        console.error('❌ Ошибка загрузки файла:', error.message);
        throw error;
    }
}

function validateQuestion(q, index) {
    const errors = [];
    const num = index + 1;

    // Проверка обязательных полей
    if (!q.question?.es) errors.push(`Вопрос #${num}: отсутствует question.es`);
    if (!q.category) errors.push(`Вопрос #${num}: отсутствует category`);
    if (!q.answers || !Array.isArray(q.answers)) {
        errors.push(`Вопрос #${num}: отсутствует массив answers`);
    } else {
        if (q.answers.length !== 3) {
            errors.push(`Вопрос #${num}: должно быть ровно 3 ответа, найдено ${q.answers.length}`);
        }

        const correctCount = q.answers.filter(a => a.is_correct).length;
        if (correctCount !== 1) {
            errors.push(`Вопрос #${num}: должен быть ровно 1 правильный ответ, найдено ${correctCount}`);
        }

        q.answers.forEach((ans, idx) => {
            if (!ans.id || !['a', 'b', 'c'].includes(ans.id)) {
                errors.push(`Вопрос #${num}, ответ ${idx + 1}: некорректный id "${ans.id}"`);
            }
            if (!ans.text?.es) {
                errors.push(`Вопрос #${num}, ответ ${idx + 1}: отсутствует text.es`);
            }
        });
    }

    return errors;
}

async function insertQuestion(q, topicIdMap) {
    // 1. Вставляем ВОПРОС (Parent)
    const { data: qData, error: qError } = await supabase
        .from('questions_golden')
        .upsert({
            topic_id: topicIdMap[q.topic_id] || q.topic_id || null,
            question_number: q.question_number,
            category: q.category,
            country: q.country || 'es',

            text_es: q.question.es,
            text_en: q.question.en || null,
            text_ru: q.question.ru || null,

            explanation_es: q.explanation?.es || null,
            explanation_en: q.explanation?.en || null,
            explanation_ru: q.explanation?.ru || null,

            image_url: q.image_url || null,
            source: q.source || 'manual-import',
            difficulty: q.difficulty || 'medium',
            is_premium: q.is_premium || false
        }, {
            onConflict: 'topic_id,question_number,country'
        })
        .select('id')
        .single();

    if (qError) throw qError;

    const questionId = qData.id;

    // 2. Удаляем старые ответы для этого вопроса (для чистого обновления)
    const { error: deleteError } = await supabase
        .from('answers_golden')
        .delete()
        .eq('question_id', questionId);

    if (deleteError) throw deleteError;

    // 3. Вставляем ОТВЕТЫ (Children)
    const answersPayload = q.answers.map(ans => ({
        question_id: questionId,
        answer_id: ans.id,
        text_es: ans.text.es,
        text_en: ans.text.en || null,
        text_ru: ans.text.ru || null,
        is_correct: ans.is_correct
    }));

    const { error: aError } = await supabase
        .from('answers_golden')
        .insert(answersPayload);

    if (aError) throw aError;

    return { questionId, answersCount: answersPayload.length };
}

async function askConfirmation(message) {
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(message + ' ', (answer) => {
            rl.close();
            const normalized = answer.toLowerCase().trim();
            resolve(normalized === 'y' || normalized === 'yes' || normalized === 'д' || normalized === 'да' || answer === '');
        });
    });
}

// ========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ========================================

async function main() {
    const filePathArg = args.find(arg => !arg.startsWith('-'));

    if (!filePathArg) {
        console.error('❌ Ошибка: укажите путь к JSON файлу');
        console.error('Использование: node scripts/import-golden.js <путь-к-json> [--dry-run] [--yes]');
        process.exit(1);
    }

    const filePath = path.resolve(filePathArg);

    console.log('='.repeat(60));
    console.log('🏆 GOLDEN STANDARD IMPORT');
    console.log('='.repeat(60));

    if (isDryRun) {
        console.log('🧪 Режим DRY RUN активен. Изменения в БД не будут внесены.\n');
    }

    try {
        const questions = await loadQuestions(filePath);

        // Валидация
        console.log('\n🔍 Валидация данных...');
        const allErrors = [];
        questions.forEach((q, idx) => {
            const errors = validateQuestion(q, idx);
            allErrors.push(...errors);
        });

        if (allErrors.length > 0) {
            console.error('\n❌ ОШИБКИ ВАЛИДАЦИИ (первые 10):');
            allErrors.slice(0, 10).forEach(err => console.error(`  - ${err}`));

            if (!autoConfirm && !isDryRun) {
                const proceed = await askConfirmation('\n⚠️  Продолжить? (y/N)');
                if (!proceed) process.exit(1);
            }
        } else {
            console.log('✅ Валидация пройдена');
        }

        // Мапинг topic_id (если нужно)
        const topicIdMap = {}; // Пока пустой, можно добавить логику маппинга

        console.log(`\n📋 Готово к загрузке ${questions.length} вопросов`);

        if (!autoConfirm && !isDryRun) {
            const confirm = await askConfirmation('Начать импорт? (Y/n)');
            if (!confirm) process.exit(0);
        } else if (autoConfirm) {
            console.log('⚡ Автоматическое подтверждение (--yes)');
        }

        console.log('\n🚀 Начинаем импорт...\n');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const num = q.question_number || (i + 1);

            try {
                if (isDryRun) {
                    console.log(`🧪 [DRY RUN] Вопрос #${num}: вставка пропущена`);
                    successCount++;
                } else {
                    const result = await insertQuestion(q, topicIdMap);
                    console.log(`✅ Вопрос #${num} (ID: ${result.questionId.slice(0, 8)}...) + ${result.answersCount} ответов`);
                    successCount++;
                }

                // Небольшая задержка между вопросами
                if (!isDryRun && i < questions.length - 1) {
                    await new Promise(r => setTimeout(r, 100));
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Вопрос #${num}: ${error.message}`);
            }
        }

        // Итоги
        console.log('\n' + '='.repeat(60));
        console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
        console.log(`Всего вопросов:       ${questions.length}`);
        console.log(`✅ Успешно загружено:  ${successCount}`);
        console.log(`❌ Ошибок:             ${errorCount}`);
        console.log('='.repeat(60) + '\n');

        if (errorCount > 0) process.exit(1);

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
