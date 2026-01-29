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

async function analyzeContentOrigin() {
    console.log('🕵️‍♂️ АНАЛИЗ ПРОИСХОЖДЕНИЯ ВОПРОСОВ\n');

    // 1. Группа "Только RU" (544 шт) - ЧТО ЭТО?
    console.log('🇷🇺 ГРУППА 1: Только Русский текст (без ES)');
    const { data: onlyRu, error: err1 } = await supabase
        .from('questions_new')
        .select('id, question_ru, topic_id, source')
        .is('question_es', null) // или пустая
        .limit(5);

    if (onlyRu && onlyRu.length > 0) {
        onlyRu.forEach(q => {
            console.log(`   ID: ${q.id.substring(0, 8)}... | Source: ${q.source} | Topic: ${q.topic_id}`);
            console.log(`   "${q.question_ru.substring(0, 60)}..."\n`);
        });
    } else {
        console.log('   (пусто)\n');
    }

    // 2. Группа "RU + ES" (860 шт) - ЧТО ЭТО?
    console.log('🇪🇸🇷🇺 ГРУППА 2: Билингвальные (Есть ES и RU)');
    const { data: bilingual, error: err2 } = await supabase
        .from('questions_new')
        .select('id, question_ru, question_es, topic_id, source')
        .not('question_es', 'is', null)
        .neq('question_es', '')
        .limit(5);

    if (bilingual && bilingual.length > 0) {
        bilingual.forEach(q => {
            console.log(`   ID: ${q.id.substring(0, 8)}... | Source: ${q.source} | Topic: ${q.topic_id}`);
            console.log(`   RU: "${q.question_ru.substring(0, 50)}..."`);
            console.log(`   ES: "${q.question_es.substring(0, 50)}..."\n`);
        });
    }

    // 3. Статистика по source
    console.log('📊 СТАТИСТИКА ПО SOURCE:');
    const { data: allQs } = await supabase.from('questions_new').select('source');
    const sources = {};
    allQs.forEach(q => {
        const s = q.source || 'unknown';
        sources[s] = (sources[s] || 0) + 1;
    });
    console.table(sources);
}

analyzeContentOrigin();
