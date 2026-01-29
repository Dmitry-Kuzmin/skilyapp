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

async function countQuestions() {
    console.log('📊 ПОДСЧЁТ ВОПРОСОВ В БАЗЕ\n');

    // 1. Общее количество
    const { count: total, error: err1 } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true });

    if (err1) { console.error(err1); return; }

    // 2. Количество по странам (если есть колонка country)
    const { count: spainCount, error: err2 } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .eq('country', 'spain');

    if (err2) {
        // Если колонки нет, считаем всё как Испания (так как это дефолт)
        console.log(`🇪🇸 Всего вопросов: ${total}`);
    } else {
        console.log(`🇪🇸 Испания (country='spain'): ${spainCount}`);

        const otherCount = total - spainCount;
        if (otherCount > 0) {
            console.log(`🌍 Другие страны: ${otherCount}`);
        }
    }

    // 3. Проверка по языкам (сколько имеют текст ES)
    const { count: esTextCount } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .not('question_es', 'is', null)
        .neq('question_es', '');

    console.log(`📝 Имеют текст на испанском: ${esTextCount}`);
}

countQuestions();
