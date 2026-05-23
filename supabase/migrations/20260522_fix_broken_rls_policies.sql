-- Fix broken RLS policies created during 2026-05-18 security refactor
--
-- Problems found:
-- 1. profiles: "Users can update their own profile" has malformed with_check
--    Contains multiple nested SELECTs with no semantic meaning (e.g., (SELECT (SELECT (SELECT auth.uid()))))
--    This prevents legitimate authenticated users from updating their own profiles
--
-- 2. storage.objects: "Users can upload their own avatar" uses auth.role() = 'authenticated'
--    But the qual is NULL on INSERT, which should have with_check instead
--    Likely never applied proper restrictions on upload

-- ============================================================
-- 1. Drop malformed policies on profiles
-- ============================================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- ============================================================
-- 2. Recreate profiles policies with correct logic
-- ============================================================

-- Everyone can view profiles (needed for leaderboard, duel opponents, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can insert their own profile when signing up
-- After signup, their user_id will match auth.uid()
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()) OR (telegram_id IS NOT NULL)
  );

-- Users can update their own profile
-- Match via user_id (which equals auth.uid()) or telegram_id or clerk_id
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR (telegram_id = (current_setting('request.jwt.claims'::text, true)::json ->> 'telegram_id')::bigint)
    OR (clerk_id = auth.uid()::text)
  )
  WITH CHECK (
    (user_id = auth.uid())
    OR (telegram_id = (current_setting('request.jwt.claims'::text, true)::json ->> 'telegram_id')::bigint)
    OR (clerk_id = auth.uid()::text)
  );

-- ============================================================
-- 3. Fix avatar upload policies in storage.objects
-- ============================================================

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Users can upload to avatars bucket
-- Must be authenticated and path must match their user ID
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'::text
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'::text
    AND (name ~~ (auth.uid()::text || '/%'::text))
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'::text
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'::text
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );
