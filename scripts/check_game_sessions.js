
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking game_sessions table...');
    const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching game_sessions:', error);
    } else {
        console.log('Success! Row sample:', data[0]);
        if (data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        }
    }
}

check();
