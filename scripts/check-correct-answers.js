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

async function checkQuestion() {
    console.log('🔍 Проверка правильности ответов в БД\n');

    const { data: question, error } = await supabase
        .from('questions_new')
        .select('id, question_ru, answer_options(id, text_ru, is_correct)')
        .eq('id', 'b4d6084e-a09d-406b-8c10-be05cdca4fbb')
        .single();

    if (error) {
        console.error('❌ Ошибка:', error.message);
        return;
    }

    console.log('📝 Вопрос:', question.question_ru.substring(0, 60) + '...\n');
    console.log('📊 Ответы:');

    question.answer_options.forEach((opt, idx) => {
        const icon = opt.is_correct ? '✅' : '❌';
        console.log(`  ${idx + 1}. ${icon} [${opt.is_correct ? 'ПРАВ' : 'НЕПР'}] ${opt.text_ru.substring(0, 50)}...`);
    });

    const correctCount = question.answer_options.filter(opt => opt.is_correct).length;
    console.log(`\n🎯 Правильных ответов: ${correctCount}`);

    if (correctCount === 0) {
        console.log('\n🚨 ПРОБЛЕМА: НИ ОДИН ОТВЕТ НЕ ПОМЕЧЕН КАК ПРАВИЛЬНЫЙ!');
    } else if (correctCount > 1) {
        console.log('\n⚠️ ВНИМАНИЕ: Больше одного правильного ответа (возможно это норма для некоторых вопросов)');
    } else {
        console.log('\n✅ ВСЁ ОКЕЙ: Один правильный ответ найден');
    }
}

checkQuestion().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
