import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TARGET_USER_ID = '88533a8b-3ca0-40c1-9ee2-619833b79491';

async function makePremium() {
  console.log(`🚀 Updating user profile for ID: ${TARGET_USER_ID}...`);

  // Update profile
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'lifetime',
      premium_until: '2099-12-31T23:59:59Z',
      duel_pass_premium: true,
      premium_forever_purchased_at: new Date().toISOString()
    })
    .eq('id', TARGET_USER_ID)
    .select();

  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
  } else {
    console.log('🎉 Profile updated successfully! User is now Premium Forever.');
    console.log('Updated data:', JSON.stringify(data, null, 2));
  }
}

makePremium();
