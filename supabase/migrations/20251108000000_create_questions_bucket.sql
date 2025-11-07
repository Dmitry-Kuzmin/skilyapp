-- Create questions bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'questions',
  'questions',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for questions bucket
-- Anyone can view question images
CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'questions');

-- Authenticated users can upload question images
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'questions'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can update question images
CREATE POLICY "Authenticated users can update question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'questions'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can delete question images
CREATE POLICY "Authenticated users can delete question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'questions'
  AND auth.role() = 'authenticated'
);

