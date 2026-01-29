import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function checkSafety() {
    console.log('🛡️  ПРОВЕРКА БЕЗОПАСНОСТИ УДАЛЕНИЯ (v2)\n');

    // 1. Проверяем конкретный вопрос с известными дубликатами
    const questionId = 'b4d6084e-a09d-406b-8c10-be05cdca4fbb';
    console.log(`🔎 Анализ вопроса: ${questionId}`);

    const { data: answers } = await supabase
        .from('answer_options')
        .select('id, position, created_at')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });

    console.log(`📊 Всего вариантов ответа: ${answers.length} (должно быть 3-4)`);

    const seen = new Set();
    const keep = [];
    const remove = [];

    answers.forEach(a => {
        if (seen.has(a.position)) {
            remove.push(a.id);
        } else {
            seen.add(a.position);
            keep.push(a.id);
        }
    });

    console.log(`✅ Оригиналы (оставляем): ${keep.length}`);
    console.log(`🗑️  Дубликаты (удаляем): ${remove.length}`);
    console.log(`📝 IDs дубликатов: ${remove.join(', ')}\n`);

    if (remove.length === 0) {
        console.log('🤷 Дубликатов нет. Возможно уже почистили?');
        return;
    }

    // 2. Проверяем использование в duel_answers
    console.log('🕵️‍♂️ Проверяем, использовались ли эти дубликаты в играх...');

    const { count, error } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .in('selected_option_id', remove);

    if (error) {
        console.error('❌ Ошибка проверки:', error.message);
        return;
    }

    if (count > 0) {
        console.log(`\n🚨 ВНИМАНИЕ: ${count} раз(а) пользователи выбрали ответы-дубликаты!`);
        console.log('❌ Если их удалить прямо сейчас — история игр повредится.');
        console.log('\n💡 НУЖНА МИГРАЦИЯ "MERGE":');
        console.log('1. Найти оригинальный ID для каждой позиции.');
        console.log('2. Обновить duel_answers: set selected_option_id = original_id WHERE selected_option_id = duplicate_id');
        console.log('3. Только потом удалять дубликаты.');
    } else {
        console.log(`\n✅ БЕЗОПАСНО: Дубликаты использовались 0 раз.`);
        console.log('👍 Можно безопасно удалять.');
    }
}

checkSafety();
