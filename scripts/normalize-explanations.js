import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Просто грузим из текущей папки (запускаем из корня)
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Checked .env.local and .env');
    console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
    console.error('KEY:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeExplanations() {
    console.log('🔄 Fetching questions...');

    // Получаем все вопросы DGT
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select('id, explanation_ru')
        .eq('source', 'practicavial');

    if (error) {
        console.error('❌ Error fetching questions:', error);
        return;
    }

    console.log(`✅ Found ${questions.length} questions. Processing...`);

    let updatedCount = 0;

    for (const q of questions) {
        let text = q.explanation_ru;
        if (!text) continue;

        let originalText = text;

        /**
         * 🧹 ЧИСТКА ТЕКСТА
         * Задача: убрать "1️⃣ 🎓 Правило" -> оставить "🎓"
         * И так далее для всех секций.
         */

        // 1. Правило
        // Паттерн: 1️⃣ (пробелы) (**)? 🎓 (пробелы) Правило (любой текст до конца строки или **) (**)?
        text = text.replace(/1️⃣\s*\**\s*🎓\s*Правило.*?\**(\n|$)/g, '🎓 ');

        // 2. Сравнение с РФ
        // Паттерн: 2️⃣ (пробелы) (**)? 🇷🇺 (пробелы) Сравнение с РФ (любой текст до конца строки или **) (**)?
        text = text.replace(/2️⃣\s*\**\s*🇷🇺\s*Сравнение с РФ.*?\**(\n|$)/g, '🇷🇺 ');

        // 3. Шпаргалка
        // Паттерн: 3️⃣ (пробелы) (**)? 💡 (пробелы) Шпаргалка (любой текст до конца строки или **) (**)?
        text = text.replace(/3️⃣\s*\**\s*💡\s*Шпаргалка.*?\**(\n|$)/g, '💡 ');


        // Дополнительная зачистка двойных пробелов после эмодзи
        text = text.replace(/🎓\s+/g, '🎓 ');
        text = text.replace(/🇷🇺\s+/g, '🇷🇺 ');
        text = text.replace(/💡\s+/g, '💡 ');

        if (text !== originalText) {
            // Обновляем в базе
            const { error: updateError } = await supabase
                .from('questions_new')
                .update({ explanation_ru: text })
                .eq('id', q.id);

            if (updateError) {
                console.error(`❌ Failed to update ${q.id}:`, updateError);
            } else {
                console.log(`✅ Updated ${q.id}`);
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} explanations.`);
}

normalizeExplanations().catch(console.error);
