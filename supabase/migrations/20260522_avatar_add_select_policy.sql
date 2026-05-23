-- Add SELECT policy for avatars bucket
-- Without it, upsert: true in storage upload cannot check if file already exists
-- and may fail with unexpected RLS errors

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
