-- ============================================
-- Безопасные миграции для Supabase
-- Часть 6b: Обновление RLS политик для редакторов
-- ============================================
-- ВАЖНО: Примените этот файл ПОСЛЕ PART_06a.sql
-- Enum значение 'editor' должно быть добавлено в отдельной транзакции

-- Миграция 52/53: 20251108000003_setup_storage.sql
-- ============================================

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



-- Миграция 53/53: 20251108000004_update_rls_for_editors.sql
-- ============================================

-- ========================================
-- Migration: Update RLS policies for editors
-- ========================================
-- Editors can edit materials but not delete them
-- Only admins can delete materials

-- Update subtopics policies
DROP POLICY IF EXISTS "Authenticated users can insert subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can update subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can delete subtopics" ON public.subtopics;

DROP POLICY IF EXISTS "Admins and editors can insert subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can insert subtopics" ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

DROP POLICY IF EXISTS "Admins and editors can update subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can update subtopics" ON public.subtopics
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete subtopics
DROP POLICY IF EXISTS "Admins can delete subtopics" ON public.subtopics;
CREATE POLICY "Admins can delete subtopics" ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update topics policies (if not already updated)
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;

-- Check if admin policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Admins can manage topics'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Update materials policies (if not already updated in 20251108000000)
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;

-- Recreate with editor support
DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
CREATE POLICY "Admins and editors can insert materials" ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
CREATE POLICY "Admins and editors can update materials" ON public.materials
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete materials
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials" ON public.materials
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update material_versions policies
DROP POLICY IF EXISTS "Admins and editors can insert material versions" ON public.material_versions;
CREATE POLICY "Admins and editors can insert material versions" ON public.material_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete material versions
DROP POLICY IF EXISTS "Admins can delete material versions" ON public.material_versions;
CREATE POLICY "Admins can delete material versions" ON public.material_versions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON POLICY "Admins and editors can insert subtopics" ON public.subtopics IS 'Editors can create subtopics';
COMMENT ON POLICY "Admins and editors can update subtopics" ON public.subtopics IS 'Editors can update subtopics';
COMMENT ON POLICY "Admins can delete subtopics" ON public.subtopics IS 'Only admins can delete subtopics';
COMMENT ON POLICY "Admins and editors can insert materials" ON public.materials IS 'Editors can create materials';
COMMENT ON POLICY "Admins and editors can update materials" ON public.materials IS 'Editors can update materials';
COMMENT ON POLICY "Admins can delete materials" ON public.materials IS 'Only admins can delete materials';

