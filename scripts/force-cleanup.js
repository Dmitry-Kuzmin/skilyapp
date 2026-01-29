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

async function forceCleanup() {
    console.log('🧹 FORCE CLEANUP STARTED...\n');

    // 1. УДАЛЯЕМ ВОПРОСЫ БЕЗ ОТВЕТОВ
    console.log('1️⃣ Deleting questions without answers...');

    // Получаем ID плохих вопросов
    const { data: answered } = await supabase.from('answer_options').select('question_id');
    const answeredSet = new Set(answered.map(x => x.question_id));

    const { data: allQuestions } = await supabase.from('questions_new').select('id');

    const toDelete = allQuestions
        .filter(q => !answeredSet.has(q.id))
        .map(q => q.id);

    console.log(`   Found ${toDelete.length} orphan questions.`);

    if (toDelete.length > 0) {
        // Удаляем пачками по 100
        for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100);
            const { error } = await supabase.from('questions_new').delete().in('id', batch);
            if (error) console.error('   ❌ Error deleting batch:', error.message);
            else console.log(`   Deleted batch ${i}-${i + batch.length}`);
        }
    }

    // 2. УДАЛЯЕМ СЛОМАННЫЕ ВОПРОСЫ (где нет правильного ответа)
    console.log('\n2️⃣ Deleting questions without correct answers...');

    // Снова берем данные, так как мы уже что-то удалили
    const { data: questionsWithAnswers } = await supabase
        .from('questions_new')
        .select(`id, answer_options(id, is_correct)`);

    const badQs = questionsWithAnswers
        .filter(q => q.answer_options && q.answer_options.length > 0 && !q.answer_options.some(a => a.is_correct))
        .map(q => q.id);

    console.log(`   Found ${badQs.length} broken questions.`);

    if (badQs.length > 0) {
        const { error } = await supabase.from('questions_new').delete().in('id', badQs);
        if (error) console.error('   ❌ Error deleting broken questions:', error.message);
        else console.log('   ✅ Deleted broken questions');
    }

    // 3. СОЗДАЕМ ИНДЕКС ЧЕРЕЗ RPC (самый надежный способ)
    console.log('\n3️⃣ Creating Unique Index...');

    const sql = `
    CREATE UNIQUE INDEX IF NOT EXISTS answer_options_question_position_unique 
    ON public.answer_options(question_id, position);
  `;

    // Пытаемся выполнить через RPC exec_sql (если такая функция есть у тебя)
    // Если нет - просто предупредим
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (rpcError) {
        console.warn(`   ⚠️  RPC exec_sql failed (maybe not installed?): ${rpcError.message}`);
        console.log('   👉 Please run this SQL manually in Dashboard if index is missing:');
        console.log(sql);
    } else {
        console.log('   ✅ Dictionary Index created via RPC!');
    }

    console.log('\n🏁 DONE!');
}

forceCleanup();
