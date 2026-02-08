import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function exactCount() {
    const { count, error } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .eq('country', 'russia');

    if (error) console.error(error);
    else console.log(`🇷🇺 Точное количество вопросов России: ${count}`);

    const { data: abCount } = await supabase.rpc('get_count_by_category', { p_country: 'russia', p_category: 'A_B' });
    // Ладно, сделаю проще
    const { count: ab } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'russia').contains('metadata', { ticket_category: 'A_B' });
    const { count: cd } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'russia').contains('metadata', { ticket_category: 'C_D' });

    console.log(`🚗 A/B: ${ab}`);
    console.log(`🚚 C/D: ${cd}`);
}
exactCount();
