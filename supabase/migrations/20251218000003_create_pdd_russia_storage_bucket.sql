-- ========================================
-- Migration: Create PDD Russia storage bucket
-- ========================================
-- Create storage bucket for PDD Russia images (questions, signs, etc.)

-- Create pdd_russia bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdd_russia',
  'pdd_russia',
  true, -- Public bucket for reading images
  10485760, -- 10MB limit (images can be large)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Anyone can view PDD Russia images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDD Russia images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PDD Russia images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDD Russia images" ON storage.objects;

-- RLS policies for pdd_russia bucket
-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view PDD Russia images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdd_russia');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload PDD Russia images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdd_russia'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update images
CREATE POLICY "Authenticated users can update PDD Russia images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pdd_russia'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete PDD Russia images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdd_russia'
  AND auth.role() = 'authenticated'
);

