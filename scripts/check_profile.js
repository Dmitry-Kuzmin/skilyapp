import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('coins', 98180)
    .eq('xp', 2257);
    
  if (error) {
    console.error(error);
  } else {
    console.log('Profile found by coins/xp:', JSON.stringify(data, null, 2));
  }
}

checkProfile();
