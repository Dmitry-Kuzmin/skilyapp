import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { count: ruCount } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'ru');
    const { count: russiaCount } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'russia');
    console.log(`ru: ${ruCount}, russia: ${russiaCount}`);
}
check();
