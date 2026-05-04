import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TARGET_PROFILE_ID = '2b6e3b89-8699-498f-9275-065f69781912';

async function makePremium() {
  console.log(`🚀 Updating user profile for ID: ${TARGET_PROFILE_ID}...`);

  // Update profile
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'lifetime',
      is_premium: true,
      premium_until: '2099-12-31T23:59:59Z',
      duel_pass_premium: true,
      premium_forever_purchased_at: new Date().toISOString()
    })
    .eq('id', TARGET_PROFILE_ID)
    .select();

  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
  } else {
    console.log('🎉 Profile updated successfully! User is now Premium Forever.');
    console.log('Updated data:', JSON.stringify(data, null, 2));
  }
}

makePremium();
