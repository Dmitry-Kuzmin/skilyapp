import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
  } else {
    users.forEach(u => console.log(`${u.id} | ${u.email} | ${u.user_metadata?.full_name || ''}`));
  }
}

listUsers();
