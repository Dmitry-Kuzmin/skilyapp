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

async function analyzeLanguagesDetail() {
    console.log('🌍 ДЕТАЛЬНЫЙ АНАЛИЗ ЯЗЫКОВОГО ПОКРЫТИЯ\n');

    // Получаем все вопросы с полями
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select('id, question_ru, question_es, question_en, source');

    if (error) { console.error(error); return; }

    let trilingual = 0; // ES + RU + EN
    let es_ru = 0;      // ES + RU (без EN)
    let ru_only = 0;    // Только RU
    let es_only = 0;    // Только ES
    let other = 0;

    // Счетчики по источникам
    const sourceStats = {};

    questions.forEach(q => {
        const hasRu = !!q.question_ru;
        const hasEs = !!q.question_es;
        const hasEn = !!q.question_en;
        const src = q.source || 'unknown';

        if (!sourceStats[src]) sourceStats[src] = { total: 0, trilingual: 0, ru_only: 0 };
        sourceStats[src].total++;

        if (hasEs && hasRu && hasEn) {
            trilingual++;
            sourceStats[src].trilingual++;
        } else if (hasEs && hasRu) {
            es_ru++;
        } else if (hasRu && !hasEs && !hasEn) {
            ru_only++;
            sourceStats[src].ru_only++;
        } else if (hasEs && !hasRu && !hasEn) {
            es_only++;
        } else {
            other++;
        }
    });

    console.log(`📦 Всего вопросов: ${questions.length}\n`);

    console.log('🌐 ПОКРЫТИЕ ЯЗЫКОВ:');
    console.log(`✅ ES + RU + EN (Идеал): ${trilingual}`);
    console.log(`⚠️ ES + RU (без EN):      ${es_ru}`);
    console.log(`🇷🇺 Только RU:             ${ru_only}`);
    console.log(`🇪🇸 Только ES:             ${es_only}`);
    console.log(`❓ Остальное:             ${other}\n`);

    console.log('📊 РАЗБИВКА ПО SOURCE:');
    Object.entries(sourceStats).forEach(([src, stats]) => {
        console.log(`🔹 Source: "${src}"`);
        console.log(`   Всего: ${stats.total}`);
        console.log(`   3 языка: ${stats.trilingual}`);
        console.log(`   Только RU: ${stats.ru_only}`);
        console.log('');
    });
}

analyzeLanguagesDetail();
