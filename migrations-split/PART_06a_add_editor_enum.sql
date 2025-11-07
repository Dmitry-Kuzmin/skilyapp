-- ============================================
-- Безопасные миграции для Supabase
-- Часть 6a: Добавление enum значения 'editor'
-- ============================================
-- ВАЖНО: Примените этот файл ПЕРВЫМ, затем примените PART_06b.sql
-- В PostgreSQL нельзя использовать новое значение enum в той же транзакции

-- Миграция 51/53: 20251108000002_add_editor_role.sql
-- ============================================

-- ========================================
-- Migration: Add editor role to app_role enum
-- ========================================
-- Add 'editor' role to existing app_role enum

-- Add 'editor' to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'editor' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
      -- Add enum value - this will be committed automatically
      ALTER TYPE public.app_role ADD VALUE 'editor';
    END IF;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TYPE public.app_role IS 'User roles: admin (full access), editor (can edit but not delete), user (read-only)';

