-- ========================================
-- Migration: Fix materials table NOT NULL constraints
-- ========================================
-- Make old content_ru/es/en fields nullable since we're using content (JSONB) now
-- This fixes error 23502 (NOT NULL constraint violation) when creating materials

-- Make content fields nullable
-- This allows creating materials without these legacy fields
ALTER TABLE public.materials
  ALTER COLUMN content_ru DROP NOT NULL,
  ALTER COLUMN content_es DROP NOT NULL,
  ALTER COLUMN content_en DROP NOT NULL;

-- Note: We don't need to update existing records because:
-- 1. Old records already have these fields populated
-- 2. New records will be created with empty strings via materialApi.create
-- This migration only makes the fields nullable to allow new records without these fields

-- Add comment for documentation
COMMENT ON COLUMN public.materials.content_ru IS 'Legacy field - kept for backward compatibility. Use content (JSONB) instead.';
COMMENT ON COLUMN public.materials.content_es IS 'Legacy field - kept for backward compatibility. Use content (JSONB) instead.';
COMMENT ON COLUMN public.materials.content_en IS 'Legacy field - kept for backward compatibility. Use content (JSONB) instead.';

