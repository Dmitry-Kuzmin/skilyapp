import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanRussia() {
    console.log('🧹 Очистка вопросов России...');

    // 1. Получаем список ID вопросов России чтобы удалить их ответы
    const { data: qIds } = await supabase
        .from('questions_new')
        .select('id')
        .in('country', ['ru', 'russia']);

    if (qIds && qIds.length > 0) {
        const ids = qIds.map(q => q.id);
        console.log(`🗑️ Удаляю ответы для ${ids.length} вопросов...`);

        // Удаляем порциями по 500
        for (let i = 0; i < ids.length; i += 500) {
            const chunk = ids.slice(i, i + 500);
            await supabase.from('answer_options').delete().in('question_id', chunk);
        }
    }

    // 2. Удаляем вопросы
    const { error } = await supabase
        .from('questions_new')
        .delete()
        .in('country', ['ru', 'russia']);

    if (error) console.error('❌ Ошибка удаления:', error.message);
    else console.log('✅ Вопросы России удалены успешно.');
}

cleanRussia().then(() => process.exit(0));
