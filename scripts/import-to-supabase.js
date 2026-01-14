/**
 * ========================================
 * ИМПОРТ ВОПРОСОВ В SUPABASE
 * ========================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

// ========================================
// КОНФИГУРАЦИЯ
// ========================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const BATCH_SIZE = 50;
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const autoConfirm = args.includes('--yes') || args.includes('-y');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Ошибка: не заданы переменные окружения VITE_SUPABASE_URL или SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ SUPABASE
// ========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// ========================================
// ОСНОВНЫЕ ФУНКЦИИ
// ========================================

async function loadQuestions(filePath) {
    try {
        console.log(`📂 Загрузка файла: ${filePath}`);
        const content = await fs.readFile(filePath, 'utf-8');
        const questions = JSON.parse(content);

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

function validateQuestions(questions) {
    const errors = [];
    const requiredFields = [
        'category',
        'question_es',
        'option_a_es',
        'option_b_es',
        'option_c_es',
        'correct_answer'
    ];

    questions.forEach((q, index) => {
        const num = index + 1;
        requiredFields.forEach(field => {
            if (!q[field]) {
                errors.push(`Вопрос #${num}: отсутствует поле "${field}"`);
            }
        });
        if (q.category && !['A1', 'B', 'D'].includes(q.category)) {
            errors.push(`Вопрос #${num}: некорректная категория "${q.category}"`);
        }
        if (q.correct_answer && !['a', 'b', 'c'].includes(q.correct_answer)) {
            errors.push(`Вопрос #${num}: некорректный правильный ответ "${q.correct_answer}"`);
        }
    });

    return errors;
}

function prepareForInsert(questions) {
    return questions.map(q => ({
        category: q.category,

        // ES
        question_es: q.question_es,
        option_a_es: q.option_a_es,
        option_b_es: q.option_b_es,
        option_c_es: q.option_c_es,
        explanation_es: q.explanation_es || null,

        // EN
        question_en: q.question_en || null,
        option_a_en: q.option_a_en || null,
        option_b_en: q.option_b_en || null,
        option_c_en: q.option_c_en || null,
        explanation_en: q.explanation_en || null,

        // RU
        question_ru: q.question_ru || null,
        option_a_ru: q.option_a_ru || null,
        option_b_ru: q.option_b_ru || null,
        option_c_ru: q.option_c_ru || null,
        explanation_ru: q.explanation_ru || null,

        // Meta
        correct_answer: q.correct_answer,
        image_url: q.image_url || null,
        source: q.source || 'manual-import'
    }));
}

async function insertQuestions(questions) {
    const batches = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        batches.push(questions.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📦 Разбито на ${batches.length} батчей по ${BATCH_SIZE} вопросов\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNum = i + 1;

        if (isDryRun) {
            console.log(`🧪 [DRY RUN] Пропуск вставки батча ${batchNum}.`);
            successCount += batch.length;
            continue;
        }

        try {
            console.log(`⏳ Загрузка батча ${batchNum}/${batches.length} (${batch.length} вопросов)...`);
            const { data, error } = await supabase
                .from('dgt_questions')
                .upsert(batch, {
                    onConflict: 'question_es, category',
                    ignoreDuplicates: false
                })
                .select('id');

            if (error) throw error;

            successCount += batch.length;
            console.log(`✅ Батч ${batchNum} загружен успешно (${data?.length || batch.length} вопросов)`);

        } catch (error) {
            errorCount += batch.length;
            console.error(`❌ Ошибка в батче ${batchNum}:`, error.message);

            console.log(`   ⏳ Ожидание 2 секунды перед попыткой поштучной вставки...`);
            await new Promise(r => setTimeout(r, 2000));

            console.log(`   🔄 Попытка загрузки вопросов по одному...`);
            for (const question of batch) {
                if (isDryRun) {
                    successCount++;
                    continue;
                }
                try {
                    const { error: singleError } = await supabase.from('dgt_questions').upsert([question], {
                        onConflict: 'question_es, category'
                    });
                    if (singleError) throw singleError;
                    successCount++;
                } catch (singleError) {
                    errorCount++;
                    console.error(`   ❌ Не удалось загрузить вопрос:`, singleError.message);
                }
            }
        }

        if (i < batches.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    return { successCount, errorCount };
}

async function checkDuplicates(questions) {
    console.log('\n🔍 Проверка дубликатов...');
    const category = questions[0]?.category;
    if (!category) return [];

    // Оптимизация: проверяем только те вопросы, которые есть в текущем файле
    const questionTexts = questions.map(q => q.question_es.trim());

    // Проверяем первые 100 для экономии ресурсов
    const { data: existing, error } = await supabase
        .from('dgt_questions')
        .select('question_es')
        .eq('category', category)
        .in('question_es', questionTexts.slice(0, 100));

    if (error) {
        console.error('❌ Ошибка проверки дубликатов:', error.message);
        return [];
    }

    const existingTexts = new Set(existing.map(q => q.question_es.trim().toLowerCase()));
    const duplicates = questions.filter(q =>
        existingTexts.has(q.question_es.trim().toLowerCase())
    );

    if (duplicates.length > 0) {
        console.log(`⚠️  Найдено ${duplicates.length} потенциальных дубликатов (проверено по первым 100 из файла)`);
    } else {
        console.log(`✅ Дубликатов среди первых 100 не найдено`);
    }
    return duplicates;
}

function showSummary(questions, results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log(`Категория:            ${questions[0]?.category || 'N/A'}`);
    console.log(`Всего вопросов:       ${questions.length}`);
    console.log(`✅ Успешно загружено:  ${results.successCount}`);
    console.log(`❌ Ошибок:             ${results.errorCount}`);
    console.log('='.repeat(60) + '\n');
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
        process.exit(1);
    }

    const filePath = path.resolve(filePathArg);

    if (isDryRun) {
        console.log('🧪 Режим DRY RUN активен. Изменения в БД не будут внесены.');
    }

    try {
        const rawQuestions = await loadQuestions(filePath);

        console.log('\n🔍 Валидация данных...');
        const validationErrors = validateQuestions(rawQuestions);
        if (validationErrors.length > 0) {
            console.error('\n❌ ОШИБКИ ВАЛИДАЦИИ (первые 10):');
            validationErrors.slice(0, 10).forEach(err => console.error(`  - ${err}`));
            const proceed = await askConfirmation('\n⚠️  Продолжить? (y/N)');
            if (!proceed) process.exit(1);
        } else {
            console.log('✅ Валидация пройдена');
        }

        const duplicates = await checkDuplicates(rawQuestions);

        if (duplicates.length > 0 && !autoConfirm && !isDryRun) {
            const proceed = await askConfirmation(`\n⚠️  Найдено ${duplicates.length} дубликатов (из выборки). Продолжить? (y/N)`);
            if (!proceed) process.exit(1);
        }

        console.log('\n🔧 Подготовка данных...');
        const questions = prepareForInsert(rawQuestions);

        console.log(`\n📋 Готово к загрузке ${questions.length} вопросов`);

        if (!autoConfirm) {
            const confirm = await askConfirmation('Начать импорт? (Y/n)');
            if (!confirm) process.exit(0);
        } else {
            console.log('⚡ Автоматическое подтверждение (--yes)');
        }

        console.log('\n🚀 Начинаем импорт...\n');
        const results = await insertQuestions(questions);
        showSummary(questions, results);

        if (results.errorCount > 0) process.exit(1);

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
