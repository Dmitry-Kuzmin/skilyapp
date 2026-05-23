-- Fix avatar upload RLS: replace auth.role() check with auth.uid() IS NOT NULL
-- auth.role() = 'authenticated' can fail for some JWT configurations
-- auth.uid() IS NOT NULL is the correct, reliable check for any logged-in user

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (name ~~ (auth.uid()::text || '/%'::text))
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (name ~~ (auth.uid()::text || '/%'::text))
  );
