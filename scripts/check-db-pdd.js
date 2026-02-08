
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { count: countOld } = await supabase.from('pdd_russia_questions').select('*', { count: 'exact', head: true });
    const { count: countNew } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'ru');

    console.log(`pdd_russia_questions count: ${countOld}`);
    console.log(`questions_new (ru) count: ${countNew}`);
}

check();
