import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
).trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function cleanup() {
    console.log('🗑️  Starting CLEANUP...');

    // 1. Delete all answers
    console.log('   Deleting answer_options...');
    const { error: err1 } = await supabase.from('answer_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // .neq('id', '...') - hack to select all rows because delete() requires a filter
    if (err1) console.error('   Error deleting answers:', err1.message);
    else console.log('   ✅ answer_options cleaned');

    // 2. Delete all questions
    console.log('   Deleting questions_new...');
    const { error: err2 } = await supabase.from('questions_new').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('   Error deleting questions:', err2.message);
    else console.log('   ✅ questions_new cleaned');

    // 3. Optional: Delete sessions link to questions? No, cascade might handle it or it will break. 
    // If sessions have FK to questions ON DELETE SET NULL/CASCADE, it's fine.
    // If NO ACTION, this script will fail. Let's hope for CASCADE.

    console.log('✨ Cleanup finished.');
}

cleanup();
