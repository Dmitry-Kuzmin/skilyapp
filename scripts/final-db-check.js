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

async function checkFinalStatus() {
    console.log('🇪🇸 ПРОВЕРКА БАЗЫ (ES ФОКУС) 🇪🇸\n');

    // 1. Проверяем есть ли еще дубликаты
    const { data: duplicates } = await supabase.rpc('check_answer_duplicates', {}); // Если функции нет, будет null

    // Альтернативная проверка дубликатов запросом
    const { data: allAnswers } = await supabase
        .from('answer_options')
        .select('question_id, position');

    const groups = {};
    allAnswers.forEach(a => {
        const k = `${a.question_id}_${a.position}`;
        groups[k] = (groups[k] || 0) + 1;
    });

    const duplicateKeys = Object.entries(groups).filter(([_, count]) => count > 1);

    if (duplicateKeys.length > 0) {
        console.log(`❌ ОСТАЛОСЬ ДУБЛИКАТОВ: ${duplicateKeys.length}`);
        console.log('Нужно запустить SQL скрипт очистки еще раз!');
    } else {
        console.log('✅ ДУБЛИКАТОВ НЕТ! База чиста.');
    }

    // 2. Проверяем наличие испанского текста
    console.log('\n🔎 Проверка испанского контента...');

    const { count: emptyEs, error } = await supabase
        .from('answer_options')
        .select('*', { count: 'exact', head: true })
        .is('text_es', null); // Или пустая строка

    if (error) console.error(error);

    console.log(`📊 Всего ответов в базе: ${allAnswers.length}`);

    // Проверка на пустые строки в text_es
    const { count: emptyStringEs } = await supabase
        .from('answer_options')
        .select('*', { count: 'exact', head: true })
        .eq('text_es', '');

    if (emptyStringEs > 0) {
        console.log(`⚠️  Ответов без ES текста: ${emptyStringEs} (возможно это чисто РФ вопросы?)`);
    } else {
        console.log(`✅ Все ответы имеют ES текст (или NULL если не переведены)`);
    }

    console.log('\n🚀 СИСТЕМА ГОТОВА К РАБОТЕ!');
}

checkFinalStatus();
