-- Remove remaining broad SELECT policies on public storage buckets.
-- Public buckets serve files by URL without any policy; SELECT policies
-- only enable directory listing which exposes all filenames.

DROP POLICY IF EXISTS "Anyone can view ambient music" ON storage.objects;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;

DROP POLICY IF EXISTS "chat images are public" ON storage.objects;

DROP POLICY IF EXISTS "Public read course-images" ON storage.objects;
