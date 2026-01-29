import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

const { data, error } = await supabase.from('questions_new').select('*').limit(1);
if (error) {
    console.log('Error:', error);
} else {
    console.log('QUESTIONS_NEW columns:', data.length > 0 ? Object.keys(data[0]).join(', ') : 'no data');
}

const { data: ans, error: ansErr } = await supabase.from('answer_options').select('*').limit(1);
if (ansErr) {
    console.log('Answer Error:', ansErr);
} else {
    console.log('ANSWER_OPTIONS columns:', ans.length > 0 ? Object.keys(ans[0]).join(', ') : 'no data');
}

process.exit(0);
