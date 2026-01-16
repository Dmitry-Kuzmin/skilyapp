-- Test the create_referral function
-- Run this in Supabase SQL Editor to see detailed error

-- First, check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'create_referral';

-- Try to call it with test data
-- Replace with your actual profile ID and referral code
SELECT * FROM create_referral('701DF0', '532aae3f-0282-469a-be1c-a073ef6c870b');

