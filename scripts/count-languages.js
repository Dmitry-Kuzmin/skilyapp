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

async function countByLanguage() {
    console.log('📊 СТАТИСТИКА ПО ЯЗЫКАМ\n');

    // Всего
    const { count: total } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true });

    // Только ES (есть текст)
    const { count: esOnly } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .not('question_es', 'is', null)
        .neq('question_es', '');

    // Только RU (есть текст)
    const { count: ruOnly } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .not('question_ru', 'is', null)
        .neq('question_ru', '');

    // И то и другое (билингвальные)
    const { count: fullBilingual } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .not('question_es', 'is', null)
        .neq('question_es', '')
        .not('question_ru', 'is', null)
        .neq('question_ru', '');

    console.log(`📦 ВСЕГО ВОПРОСОВ: ${total}`);
    console.log(`--------------------------------`);
    console.log(`🇪🇸 С испанским текстом: ${esOnly}`);
    console.log(`🇷🇺 С русским текстом:   ${ruOnly}`);
    console.log(`✨ Билингвальные (ES+RU): ${fullBilingual}`);
    console.log(`--------------------------------`);

    if (total - fullBilingual > 0) {
        console.log(`⚠️  Не переведены полностью: ${total - fullBilingual}`);
    }
}

countByLanguage();
