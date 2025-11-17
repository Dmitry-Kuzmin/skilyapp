-- Create test-covers bucket for test topic cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-covers',
  'test-covers',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for test-covers bucket
-- Anyone can view test covers (public)
CREATE POLICY "Anyone can view test covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'test-covers');

-- Only authenticated users can upload test covers
CREATE POLICY "Authenticated users can upload test covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

-- Only authenticated users can update test covers
CREATE POLICY "Authenticated users can update test covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

-- Only authenticated users can delete test covers
CREATE POLICY "Authenticated users can delete test covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

