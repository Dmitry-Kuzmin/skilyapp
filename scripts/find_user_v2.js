import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findSpecificUser() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });
  
  if (error) {
    console.error(error);
    return;
  }

  const targetEmail = 'kuzmin.public@gmail.com';
  const user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

  if (user) {
    console.log('FOUND USER:');
    console.log(`${user.id} | ${user.email} | ${user.user_metadata?.full_name || ''}`);
  } else {
    console.log('User not found in auth.users among ' + users.length + ' users.');
    // Check profiles table by coins/xp again just in case
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, coins, xp')
      .eq('coins', 98180)
      .eq('xp', 2257);
    
    if (profiles && profiles.length > 0) {
      console.log('FOUND IN PROFILES BY COINS/XP:');
      console.log(JSON.stringify(profiles, null, 2));
    }
  }
}

findSpecificUser();
