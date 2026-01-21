
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

console.log('URL:', url);
console.log('Key length:', key ? key.length : 'MISSING');

const supabase = createClient(url, key);

async function run() {
    console.log('Fetching questions_new...');
    const { data, error } = await supabase.from('questions_new').select('*').limit(1);
    if (error) {
        console.error('Error fetching questions_new:', error);
    } else if (data && data.length > 0) {
        console.log('questions_new Columns:', Object.keys(data[0]));
        console.log('ID Type:', typeof data[0].id);
        console.log('ID Value:', data[0].id);
        console.log('Source ID Type:', typeof data[0].source_id);
        console.log('Source ID Value:', data[0].source_id);
    } else {
        console.log('questions_new is EMPTY');
    }

    console.log('Fetching questions (old)...');
    const { data: oldData, error: oldError } = await supabase.from('questions').select('*').limit(1);
    if (oldError) {
        console.error('Error fetching questions:', oldError);
    } else if (oldData && oldData.length > 0) {
        console.log('questions Columns:', Object.keys(oldData[0]));
    }
}

run();
