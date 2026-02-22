
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAdmins() {
    const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

    if (error) {
        console.error(error);
        return;
    }

    console.log('Admins list:');
    for (const row of data || []) {
        if (row.role === 'admin') {
            // Find user email
            const { data: userData } = await supabase.auth.admin.getUserById(row.user_id);
            console.log(`- ID: ${row.user_id}, Email: ${userData?.user?.email || 'N/A'}, Role: ${row.role}`);
        }
    }
}

checkAdmins();
