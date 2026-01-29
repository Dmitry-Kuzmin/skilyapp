#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function checkDuplicates() {
    console.log('🔍 ПРОВЕРКА ДУБЛИКАТОВ В answer_options\n');
    console.log('='.repeat(80) + '\n');

    // Проверяем дубликаты
    const { data: duplicates, error } = await supabase.rpc('check_answer_duplicates', {});

    if (error) {
        // Если функции нет, делаем прямой запрос
        const { data, error: queryError } = await supabase
            .from('answer_options')
            .select('question_id')
            .order('question_id');

        if (queryError) {
            console.error('❌ Ошибка:', queryError.message);
            return;
        }

        // Подсчитываем вручную
        const counts = {};
        data.forEach(row => {
            counts[row.question_id] = (counts[row.question_id] || 0) + 1;
        });

        const problemQuestions = Object.entries(counts)
            .filter(([_, count]) => count > 4)
            .sort((a, b) => b[1] - a[1]);

        console.log(`📊 Статистика:`);
        console.log(`   Всего вопросов: ${Object.keys(counts).length}`);
        console.log(`   Вопросов с дубликатами (>4 ответов): ${problemQuestions.length}`);

        if (problemQuestions.length > 0) {
            console.log('\n🚨 ТОП-10 ВОПРОСОВ С ДУБЛИКАТАМИ:\n');
            problemQuestions.slice(0, 10).forEach(([qid, count], idx) => {
                console.log(`   ${idx + 1}. ${qid.substring(0, 8)}... → ${count} ответов`);
            });

            console.log(`\n⚠️  Всего затронуто: ${problemQuestions.length} вопросов`);
        } else {
            console.log('\n✅ Дубликатов не найдено!');
        }
    }
}

checkDuplicates().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
