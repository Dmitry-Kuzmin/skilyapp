// Script to fix referral function via Supabase API
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('Please set these in your .env file or run:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fixSQL = `
DROP FUNCTION IF EXISTS create_referral(TEXT, UUID);

CREATE OR REPLACE FUNCTION create_referral(
  p_referrer_code TEXT,
  p_referred_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  result_referrer_id UUID,
  referred_bonus INTEGER,
  message TEXT
) AS $$
DECLARE
  v_referrer_profile_id UUID;
  v_referred_bonus INTEGER := 50;
  v_new_referral_id UUID;
  v_existing_referrer UUID;
BEGIN
  SELECT profiles.id INTO v_referrer_profile_id
  FROM profiles
  WHERE profiles.referral_code = UPPER(p_referrer_code)
  LIMIT 1;
  
  IF v_referrer_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral code not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_referrer_profile_id = p_referred_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Cannot refer yourself'::TEXT;
    RETURN;
  END IF;
  
  SELECT profiles.referred_by INTO v_existing_referrer
  FROM profiles
  WHERE profiles.id = p_referred_id;
  
  IF v_existing_referrer IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Already referred by someone'::TEXT;
    RETURN;
  END IF;
  
  INSERT INTO referrals (referrer_id, referred_id, referred_bonus)
  VALUES (v_referrer_profile_id, p_referred_id, v_referred_bonus)
  ON CONFLICT (referrer_id, referred_id) DO NOTHING
  RETURNING referrals.id INTO v_new_referral_id;
  
  IF v_new_referral_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral already exists'::TEXT;
    RETURN;
  END IF;
  
  UPDATE profiles
  SET referred_by = v_referrer_profile_id, coins = profiles.coins + v_referred_bonus
  WHERE profiles.id = p_referred_id;
  
  RETURN QUERY SELECT true, v_referrer_profile_id, v_referred_bonus, 'Referral created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

console.log('🔧 Fixing referral function...\n');
console.log('📝 SQL to execute:');
console.log(fixSQL);
console.log('\n');
console.log('📋 Copy the SQL above and paste it into Supabase SQL Editor:');
console.log('🔗 https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql');
console.log('\n✅ Then press RUN in the SQL Editor');

