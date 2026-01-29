import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    auth: { persistSession: false, autoRefreshToken: false }
});

async function getTableSchema(tableName) {
    console.log(`\n📊 Schema for table: ${tableName}\n`);
    console.log('='.repeat(80));

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`❌ Error:`, error.message);
        return null;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('\n✅ Columns found:\n');
        columns.forEach((col, idx) => {
            const value = data[0][col];
            const type = typeof value === 'object' && value !== null ? 'JSONB/Object' : typeof value;
            console.log(`  ${idx + 1}. ${col.padEnd(30)} → ${type}`);
        });
        console.log(`\n📈 Total columns: ${columns.length}\n`);
        return columns;
    } else {
        console.log('⚠️  Table is empty, getting schema from API...\n');
        return null;
    }
}

async function main() {
    console.log('🔍 GETTING SUPABASE SCHEMA\n');

    // Get questions_new schema
    const questionsColumns = await getTableSchema('questions_new');

    // Get answer_options schema
    const answersColumns = await getTableSchema('answer_options');

    console.log('='.repeat(80));
    console.log('\n✅ Schema check complete!\n');
}

main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
