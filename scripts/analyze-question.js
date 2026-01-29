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

async function analyzeQuestion(questionId) {
    console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ВОПРОСА\n');
    console.log('='.repeat(80) + '\n');
    console.log(`ID: ${questionId}\n`);

    // Получаем все ответы
    const { data: answers, error } = await supabase
        .from('answer_options')
        .select('*')
        .eq('question_id', questionId)
        .order('position');

    if (error) {
        console.error('❌ Ошибка:', error.message);
        return;
    }

    console.log(`📊 Найдено ответов: ${answers.length}\n`);

    // Группируем по тексту
    const byText = {};
    answers.forEach(ans => {
        const key = ans.text_ru || ans.text_es || ans.text_en;
        if (!byText[key]) {
            byText[key] = [];
        }
        byText[key].push(ans);
    });

    console.log('📝 Уникальные тексты:\n');
    Object.entries(byText).forEach(([text, ans], idx) => {
        const isCorrect = ans[0].is_correct;
        const icon = isCorrect ? '✅' : '❌';
        console.log(`  ${idx + 1}. ${icon} "${text.substring(0, 50)}..."`);
        console.log(`     Дубликатов: ${ans.length}`);
        if (ans.length > 1) {
            console.log(`     🚨 IDs: ${ans.map(a => a.id.substring(0, 8)).join(', ')}...`);
            console.log(`     Positions: ${ans.map(a => a.position).join(', ')}`);
        }
        console.log('');
    });

    const duplicateTexts = Object.values(byText).filter(arr => arr.length > 1);

    if (duplicateTexts.length > 0) {
        console.log(`\n🚨 ПРОБЛЕМА: ${duplicateTexts.length} текстов имеют дубликаты!\n`);
        console.log('💡 РЕШЕНИЕ: Удалить лишние дубликаты\n');

        // Предлагаем план очистки
        console.log('📋 ПЛАН ОЧИСТКИ:\n');
        duplicateTexts.forEach((dups, idx) => {
            const keepId = dups[0].id;
            const removeIds = dups.slice(1).map(d => d.id);
            console.log(`  ${idx + 1}. Оставить: ${keepId.substring(0, 12)}...`);
            console.log(`     Удалить: ${removeIds.map(id => id.substring(0, 12)).join(', ')}...`);
        });
    } else {
        console.log('\n✅ Дубликатов текстов нет!');
    }
}

const questionId = process.argv[2] || 'b4d6084e-a09d-406b-8c10-be05cdca4fbb';
analyzeQuestion(questionId).catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
