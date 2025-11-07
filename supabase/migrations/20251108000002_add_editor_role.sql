-- ========================================
-- Migration: Add editor role to app_role enum
-- ========================================
-- Add 'editor' role to existing app_role enum

-- Add 'editor' to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role' 
    AND EXISTS (
      SELECT 1 FROM pg_enum WHERE enumlabel = 'editor' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'app_role'
      )
    )
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TYPE public.app_role IS 'User roles: admin (full access), editor (can edit but not delete), user (read-only)';

