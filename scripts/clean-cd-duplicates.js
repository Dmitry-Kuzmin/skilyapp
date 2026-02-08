import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanDuplicates() {
    console.log('🧹 Удаляем дубликаты C/D...');

    const { data: all } = await supabase
        .from('questions_new')
        .select('id, metadata, created_at')
        .eq('country', 'russia')
        .contains('metadata', { ticket_category: 'C_D' })
        .order('created_at', { ascending: true });

    if (!all) return;

    const seen = new Set();
    const toDelete = [];

    all.forEach(q => {
        const key = `${q.metadata.original_ticket_number}-${q.metadata.question_number}`;
        if (seen.has(key)) {
            toDelete.push(q.id);
        } else {
            seen.add(key);
        }
    });

    console.log(`❌ Найлено ${toDelete.length} дубликатов`);

    // Удаляем ответы
    if (toDelete.length > 0) {
        await supabase.from('answer_options').delete().in('question_id', toDelete);
        await supabase.from('questions_new').delete().in('id', toDelete);
    }

    console.log('✅ Дубликаты удалены!');
}

cleanDuplicates().then(() => process.exit(0));
