
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testExecSql() {
    console.log("Testing exec_sql RPC...");
    const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1 as test' });

    if (error) {
        console.error("exec_sql failed:", error);
        // Try alternatives? apply_migration?
        const { data: d2, error: e2 } = await supabase.rpc('apply_migration', { migration_name: 'test', sql: 'SELECT 1;' });
        if (e2) console.error("apply_migration failed:", e2);
        else console.log("apply_migration success:", d2);
    } else {
        console.log("exec_sql success:", data);
    }
}

testExecSql();
