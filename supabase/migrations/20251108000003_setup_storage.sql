-- ========================================
-- Migration: Setup Supabase Storage for materials
-- ========================================
-- Create storage bucket for materials images
-- Note: This migration creates the bucket structure, but actual bucket creation
-- should be done through Supabase Dashboard or Storage API

-- Create a function to check if storage bucket exists
CREATE OR REPLACE FUNCTION public.storage_bucket_exists(bucket_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = bucket_name
  );
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.storage_bucket_exists IS 'Check if a storage bucket exists';

-- Note: Actual bucket creation should be done via:
-- 1. Supabase Dashboard: Storage > Create bucket > name: 'materials'
-- 2. Or via Storage API in application code
-- 3. Bucket should be public for reading images, but only admins/editors can upload

-- Storage policies should be set via Supabase Dashboard:
-- - Public read access for bucket 'materials'
-- - Upload access only for authenticated users with admin/editor role
-- - Path: /materials/images/{material_id}/{filename}

