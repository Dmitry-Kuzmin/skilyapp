
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAnswersCount() {
    const { count } = await supabase.from('pdd_russia_answers').select('*', { count: 'exact', head: true });
    console.log(`Total pdd_russia_answers count: ${count}`);
}

checkAnswersCount();
