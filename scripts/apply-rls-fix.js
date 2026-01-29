import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function apply() {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260129_fix_answer_options_rls.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('Applying migration: 20260129_fix_answer_options_rls.sql\n');
    console.log(sql);
    console.log('\n---\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('✅ Migration applied successfully!');
}

apply();
