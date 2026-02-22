
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

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sql = `
DO $$
DECLARE
  v_user RECORD;
  v_admin_count INTEGER := 0;
BEGIN
  -- We look for ALL users with this email
  FOR v_user IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email ILIKE 'kuzmin.public@gmail.com'
  LOOP
    -- Ensure the admin role exists for this user ID
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    v_admin_count := v_admin_count + 1;
    RAISE NOTICE 'Admin role ensured for user_id: % (%)', v_user.id, v_user.email;
  END LOOP;
  
  -- Also handle any profile matching this email if no user found (unlikely but safe)
  IF v_admin_count = 0 THEN
     RAISE WARNING 'No user found for email kuzmin.public@gmail.com';
  END IF;
END $$;
`;

async function applyAdmin() {
    console.log('🚀 Applying Admin permissions for kuzmin.public@gmail.com...');

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing SQL:', error);
            process.exit(1);
        }

        console.log('✅ Successfully applied admin permissions!');
        console.log('---');
        console.log('Результат проверки:');

        const { data: adminUsers, error: fetchError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('role', 'admin');

        if (fetchError) {
            console.error('❌ Error fetching admins:', fetchError);
        } else {
            console.log(`Всего админов в базе: ${adminUsers.length}`);
        }

    } catch (error) {
        console.error('❌ Critical error:', error);
        process.exit(1);
    }
}

applyAdmin();
