-- ========================================
-- Migration: Create materials storage bucket
-- ========================================
-- Create storage bucket for materials images
-- This fixes "Bucket not found" error when uploading images

-- Create materials bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view all materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete materials" ON storage.objects;

-- RLS policies for materials bucket
-- Allow authenticated users to view all materials
CREATE POLICY "Users can view all materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials');

-- Allow authenticated users to upload materials
CREATE POLICY "Users can upload materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update materials
CREATE POLICY "Users can update materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'materials'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete materials
CREATE POLICY "Users can delete materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materials'
  AND auth.role() = 'authenticated'
);

