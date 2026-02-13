-- ========================================
-- Migration: Fix materials.updated_by foreign key constraint
-- ========================================
-- Change updated_by to reference profiles.id instead of auth.users.id
-- This fixes error 23503 (foreign key violation) when creating materials

-- Drop existing foreign key constraint
ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_updated_by_fkey;

-- Add new foreign key constraint referencing profiles.id
ALTER TABLE public.materials
  ADD CONSTRAINT materials_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Also fix material_versions table if it has the same issue
ALTER TABLE public.material_versions
  DROP CONSTRAINT IF EXISTS material_versions_updated_by_fkey;

ALTER TABLE public.material_versions
  ADD CONSTRAINT material_versions_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.materials.updated_by IS 'ID of profile who last updated the material (references profiles.id)';
COMMENT ON COLUMN public.material_versions.updated_by IS 'ID of profile who created this version (references profiles.id)';

