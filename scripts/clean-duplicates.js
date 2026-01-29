#!/usr/bin/env node

/**
 * 🧹 ОЧИСТКА ДУБЛИКАТОВ В answer_options
 * 
 * Удаляет дублирующиеся ответы, оставляя только один экземпляр каждого
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

async function cleanDuplicates() {
    console.log('🧹 ОЧИСТКА answer_options ОТ ДУБЛИКАТОВ\n');
    console.log('='.repeat(80) + '\n');

    // Получаем все answer_options
    const { data: allAnswers, error } = await supabase
        .from('answer_options')
        .select('*')
        .order('question_id, position, created_at');

    if (error) {
        console.error('❌ Ошибка:', error.message);
        return;
    }

    console.log(`📊 Всего ответов в БД: ${allAnswers.length}\n`);

    // Группируем по question_id + position + text
    const groups = {};
    allAnswers.forEach(ans => {
        const key = `${ans.question_id}:${ans.position}:${ans.text_ru || ans.text_es}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(ans);
    });

    // Находим дубликаты
    const duplicates = Object.values(groups).filter(arr => arr.length > 1);
    const toDelete = [];

    duplicates.forEach(group => {
        // Оставляем первый (самый старый), удаляем остальные
        group.slice(1).forEach(ans => {
            toDelete.push(ans.id);
        });
    });

    console.log(`🔍 Найдено дубликатов: ${duplicates.length} групп`);
    console.log(`🗑️  К удалению: ${toDelete.length} записей\n`);

    if (toDelete.length === 0) {
        console.log('✅ Дубликатов не найдено!');
        return;
    }

    // Показываем примеры
    console.log('📋 Примеры дубликатов (первые 5):\n');
    duplicates.slice(0, 5).forEach((group, idx) => {
        const first = group[0];
        console.log(`  ${idx + 1}. "${(first.text_ru || first.text_es).substring(0, 40)}..."`);
        console.log(`     Question: ${first.question_id.substring(0, 8)}..., Position: ${first.position}`);
        console.log(`     Найдено копий: ${group.length}`);
        console.log(`     Оставляем: ${first.id.substring(0, 12)}...`);
        console.log(`     Удаляем: ${group.slice(1).map(a => a.id.substring(0, 12)).join(', ')}...`);
        console.log('');
    });

    // Запрашиваем подтверждение
    console.log('\n⚠️  ВНИМАНИЕ! Эта операция удалит дубликаты из БД!');
    console.log(`   Будет удалено: ${toDelete.length} записей\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('❓ Продолжить? (yes/no): ', async (answer) => {
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
            console.log('\n❌ Отменено пользователем');
            return;
        }

        console.log('\n🚀 Начинаем очистку...\n');

        // Удаляем пакетами по 100
        const batchSize = 100;
        let deleted = 0;

        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);

            const { error: deleteError } = await supabase
                .from('answer_options')
                .delete()
                .in('id', batch);

            if (deleteError) {
                console.error(`❌ Ошибка при удалении партии ${i}-${i + batch.length}:`, deleteError.message);
            } else {
                deleted += batch.length;
                console.log(`   ✅ Удалено: ${deleted}/${toDelete.length}`);
            }
        }

        console.log(`\n✅ ОЧИСТКА ЗАВЕРШЕНА!`);
        console.log(`   Удалено: ${deleted} дубликатов`);
        console.log(`   Осталось: ${allAnswers.length - deleted} записей\n`);
    });
}

cleanDuplicates().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
