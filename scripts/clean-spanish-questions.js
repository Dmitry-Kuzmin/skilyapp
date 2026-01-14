/**
 * ========================================
 * СКРИПТ ОЧИСТКИ ИСПАНСКИХ ВОПРОСОВ
 * ========================================
 * Удаляет все вопросы для Испании из старых таблиц
 * перед переходом на Golden Standard
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Ошибка: не заданы переменные окружения');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const forceClean = args.includes('--force');

async function checkTableExists(tableName) {
    const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

    return !error || !error.message.includes('does not exist');
}

async function getCount(tableName, filter = null) {
    let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

    if (filter) {
        query = query.eq('country', filter);
    }

    const { count, error } = await query;
    return error ? 0 : count;
}

async function cleanTable(tableName, description, filter = null) {
    console.log(`\n🗑️  ${description}...`);

    const count = await getCount(tableName, filter);

    if (count === 0) {
        console.log(`   ℹ️  Таблица пуста, пропускаем`);
        return { deleted: 0, skipped: true };
    }

    console.log(`   📊 Найдено записей: ${count}`);

    if (isDryRun) {
        console.log(`   🧪 [DRY RUN] Удаление пропущено`);
        return { deleted: count, dryRun: true };
    }

    let query = supabase.from(tableName).delete();

    if (filter) {
        query = query.eq('country', filter);
    } else {
        // Удаляем все кроме фиктивной записи
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;

    if (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        return { deleted: 0, error: true };
    }

    console.log(`   ✅ Удалено записей: ${count}`);
    return { deleted: count };
}

async function main() {
    console.log('='.repeat(60));
    console.log('🧹 ОЧИСТКА ИСПАНСКИХ ВОПРОСОВ');
    console.log('='.repeat(60));

    if (isDryRun) {
        console.log('🧪 Режим DRY RUN: изменения не будут применены\n');
    }

    if (!forceClean && !isDryRun) {
        console.log('\n⚠️  ВНИМАНИЕ! Это действие НЕОБРАТИМО!');
        console.log('Будут удалены все испанские вопросы из следующих таблиц:');
        console.log('  - dgt_questions (если существует)');
        console.log('  - questions_new (country = es)');
        console.log('  - driving_test_questions (если существует)');
        console.log('\nДля подтверждения используйте флаг --force\n');
        process.exit(1);
    }

    // Проверяем существование таблиц
    const tables = {
        'dgt_questions': await checkTableExists('dgt_questions'),
        'questions_new': await checkTableExists('questions_new'),
        'driving_test_questions': await checkTableExists('driving_test_questions')
    };

    console.log('\n📋 Статус таблиц:');
    Object.entries(tables).forEach(([name, exists]) => {
        console.log(`  ${exists ? '✅' : '❌'} ${name}`);
    });

    let totalDeleted = 0;

    // Очистка dgt_questions (старая таблица DGT)
    if (tables['dgt_questions']) {
        const result = await cleanTable('dgt_questions', 'Очистка dgt_questions');
        if (!result.error && !result.skipped) totalDeleted += result.deleted;
    }

    // Очистка questions_new (только country = 'es')
    if (tables['questions_new']) {
        const result = await cleanTable('questions_new', 'Очистка questions_new (country = es)', 'es');
        if (!result.error && !result.skipped) totalDeleted += result.deleted;
    }

    // Очистка driving_test_questions
    if (tables['driving_test_questions']) {
        const result = await cleanTable('driving_test_questions', 'Очистка driving_test_questions');
        if (!result.error && !result.skipped) totalDeleted += result.deleted;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ');
    console.log(`Всего удалено записей: ${totalDeleted}`);
    if (isDryRun) {
        console.log('🧪 Режим DRY RUN - реальные изменения не внесены');
    }
    console.log('='.repeat(60) + '\n');

    console.log('✨ Готово! Теперь можно импортировать вопросы в Golden Standard формате:');
    console.log('   node scripts/import-golden.js <your-file.json> --yes\n');
}

main().catch(console.error);
