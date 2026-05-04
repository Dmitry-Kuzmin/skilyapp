import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_EMAIL = 'kuzmin.public@gmail.com';

async function makePremium() {
  console.log(`🚀 Searching for user: ${TARGET_EMAIL}...`);

  // 1. Find user in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === TARGET_EMAIL);

  if (!user) {
    console.error(`❌ User with email ${TARGET_EMAIL} not found.`);
    // Try finding by username if email search fails (fallback)
    return;
  }

  console.log(`✅ Found user ID: ${user.id}`);

  // 2. Update profile
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'lifetime',
      premium_until: '2099-12-31T23:59:59Z',
      duel_pass_premium: true,
      premium_forever_purchased_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select();

  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
  } else {
    console.log('🎉 Profile updated successfully! User is now Premium Forever.');
    console.log('Updated data:', JSON.stringify(data, null, 2));
  }
}

makePremium();
