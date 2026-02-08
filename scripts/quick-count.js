import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function count() {
    const { count: total, error } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true });

    const { count: russia, error: rError } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .in('country', ['ru', 'russia']);

    console.log(`Total questions: ${total}`);
    console.log(`Russia questions: ${russia}`);

    const { data: catCounts } = await supabase.from('questions_new').select('metadata->ticket_category');
    const stats = {};
    catCounts?.forEach(c => {
        const cat = c.ticket_category || 'NULL';
        stats[cat] = (stats[cat] || 0) + 1;
    });
    console.log('Categories:', stats);
}
count();
