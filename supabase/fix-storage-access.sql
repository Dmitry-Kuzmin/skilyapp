-- Fix Supabase Storage Access for dgt-images bucket
-- Run this in Supabase SQL Editor

-- 1. Make bucket public (if it's not already)
UPDATE storage.buckets 
SET public = true 
WHERE name = 'dgt-images';

-- 2. Add RLS policy to allow public read access
CREATE POLICY "Public Access to DGT Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'dgt-images');

-- 3. Verify bucket status
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'dgt-images';
