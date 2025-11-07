-- ============================================
-- Безопасные миграции для Supabase
-- Часть 5
-- ============================================

-- Note: 'editor' role will be added in PART_06.sql
-- For now, we use only 'admin' role in RLS policies

-- Миграция 41/53: 20251106170000_add_source_id_to_questions.sql
-- ============================================

-- Add source_id column to questions_new table for Google Sheets synchronization
-- This allows upsert operations based on source_id from Google Sheets

ALTER TABLE public.questions_new
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create unique index on source_id to enable upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.questions_new.source_id IS 'Unique identifier from Google Sheets (e.g., GS-1, GS-2) for synchronization';



-- Миграция 42/53: 20251107000000_update_topics_for_learning_map.sql
-- ============================================

-- ========================================
-- Migration: Update topics table for learning map
-- ========================================
-- Add fields for learning map functionality:
-- - unlock_condition: JSONB for unlock conditions
-- - description: TEXT for topic description
-- - order_index: INTEGER (alias for number, for consistency)

-- Add description field
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add unlock_condition field (JSONB)
-- Structure: { "required_topics": [1, 2], "min_score": 80, "skip_test_id": "uuid" }
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS unlock_condition JSONB DEFAULT '{"required_topics": [], "min_score": 0}'::jsonb;

-- Add order_index as alias for number (for consistency with subtopics)
-- We'll keep number for backward compatibility, but add order_index
-- Use DEFAULT to ensure new inserts have a value
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Populate order_index from number for existing records
-- Also handle case where order_index might be NULL due to concurrent inserts
UPDATE public.topics
SET order_index = COALESCE(order_index, number, 0)
WHERE order_index IS NULL OR order_index = 0;

-- Ensure all records have order_index before making it NOT NULL
-- This handles any edge cases where NULL might still exist
UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

-- Make order_index NOT NULL after populating
-- Keep DEFAULT until all inserts are done, then remove it
ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

-- Remove DEFAULT only after NOT NULL is set (to prevent issues with concurrent inserts)
-- This ensures that any INSERT that happens between ADD COLUMN and SET NOT NULL will get DEFAULT value
DO $$
BEGIN
  -- Check if column is NOT NULL before removing DEFAULT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'topics'
    AND column_name = 'order_index'
    AND is_nullable = 'NO'
  ) THEN
    -- Column is NOT NULL, safe to remove DEFAULT
    ALTER TABLE public.topics ALTER COLUMN order_index DROP DEFAULT;
  END IF;
END $$;

-- Create index on order_index for faster sorting
CREATE INDEX IF NOT EXISTS idx_topics_order_index ON public.topics(order_index);

-- Add comment for documentation
COMMENT ON COLUMN public.topics.unlock_condition IS 'JSON object with unlock conditions: required_topics (array of topic numbers), min_score (integer), skip_test_id (UUID)';
COMMENT ON COLUMN public.topics.order_index IS 'Order of topic in learning map (same as number for backward compatibility)';



-- Миграция 43/53: 20251107000001_create_subtopics.sql
-- ============================================

-- ========================================
-- Migration: Create subtopics table
-- ========================================
-- Subtopics represent individual learning units within a topic
-- Types: 'material', 'test', 'terms'

-- Create enum for subtopic types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subtopic_type') THEN
    CREATE TYPE public.subtopic_type AS ENUM ('material', 'test', 'terms');
  END IF;
END $$;

-- Create subtopics table
CREATE TABLE IF NOT EXISTS public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type public.subtopic_type NOT NULL,
  content_id UUID, -- Reference to material, test, or terms collection
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_id, order_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON public.subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_order_index ON public.subtopics(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtopics_type ON public.subtopics(type);

-- Enable RLS
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view subtopics" ON public.subtopics;
CREATE POLICY "Anyone can view subtopics" ON public.subtopics
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert subtopics" ON public.subtopics;
CREATE POLICY "Authenticated users can insert subtopics" ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update subtopics" ON public.subtopics;
CREATE POLICY "Authenticated users can update subtopics" ON public.subtopics
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete subtopics" ON public.subtopics;
CREATE POLICY "Authenticated users can delete subtopics" ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_subtopics_updated_at ON public.subtopics;
CREATE TRIGGER update_subtopics_updated_at
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.subtopics IS 'Subtopics represent individual learning units within a topic (materials, tests, or terms)';
COMMENT ON COLUMN public.subtopics.type IS 'Type of subtopic: material (learning content), test (quiz), or terms (vocabulary)';
COMMENT ON COLUMN public.subtopics.content_id IS 'Reference to specific content: material ID, test ID, or NULL for terms (filtered by topic_id)';
COMMENT ON COLUMN public.subtopics.is_required IS 'Whether this subtopic must be completed to finish the parent topic';



-- Миграция 44/53: 20251107000002_create_materials.sql
-- ============================================

-- ========================================
-- Migration: Create materials table
-- ========================================
-- Materials store learning content (HTML/Markdown) converted from PDFs

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ru TEXT NOT NULL, -- HTML/Markdown content
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  source_pdf TEXT, -- Optional: link to original PDF file
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs: ["url1", "url2"]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON public.materials(subtopic_id);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Anyone can view materials" ON public.materials
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
CREATE POLICY "Authenticated users can insert materials" ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
CREATE POLICY "Authenticated users can update materials" ON public.materials
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete materials" ON public.materials;
CREATE POLICY "Authenticated users can delete materials" ON public.materials
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.materials IS 'Learning materials (HTML/Markdown content) converted from PDFs';
COMMENT ON COLUMN public.materials.content_ru IS 'HTML or Markdown content in Russian';
COMMENT ON COLUMN public.materials.images IS 'JSON array of image URLs extracted from PDF';
COMMENT ON COLUMN public.materials.source_pdf IS 'Optional link to original PDF file for reference';



-- Миграция 45/53: 20251107000003_create_topic_tests.sql
-- ============================================

-- ========================================
-- Migration: Create topic_tests table
-- ========================================
-- Tests for topics and subtopics, including skip tests

CREATE TABLE IF NOT EXISTS public.topic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE, -- Nullable: can be topic-level test
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  min_pass_percent INTEGER NOT NULL DEFAULT 80, -- Minimum score to pass (0-100)
  is_skip_test BOOLEAN NOT NULL DEFAULT FALSE, -- If true, this test allows skipping previous topics
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure skip tests are topic-level only
  CONSTRAINT skip_test_must_be_topic_level CHECK (
    (is_skip_test = FALSE) OR (subtopic_id IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_tests_topic_id ON public.topic_tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_subtopic_id ON public.topic_tests(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_skip_test ON public.topic_tests(is_skip_test);

-- Enable RLS
ALTER TABLE public.topic_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view topic tests" ON public.topic_tests;
CREATE POLICY "Anyone can view topic tests" ON public.topic_tests
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can insert topic tests" ON public.topic_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can update topic tests" ON public.topic_tests
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can delete topic tests" ON public.topic_tests
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_topic_tests_updated_at ON public.topic_tests;
CREATE TRIGGER update_topic_tests_updated_at
  BEFORE UPDATE ON public.topic_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.topic_tests IS 'Tests for topics and subtopics, including skip tests for unlocking topics';
COMMENT ON COLUMN public.topic_tests.is_skip_test IS 'If true, passing this test allows skipping required topics';
COMMENT ON COLUMN public.topic_tests.min_pass_percent IS 'Minimum percentage score (0-100) required to pass the test';



-- Миграция 46/53: 20251107000004_create_user_topic_progress.sql
-- ============================================

-- ========================================
-- Migration: Create user_topic_progress table
-- ========================================
-- Tracks user progress through topics and subtopics

CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE, -- Nullable: can track topic-level progress
  score INTEGER DEFAULT 0, -- Score achieved (0-100)
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure unique progress per user per subtopic (or topic if subtopic is null)
  UNIQUE(user_id, subtopic_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_topic_id ON public.user_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_subtopic_id ON public.user_topic_progress(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_completed ON public.user_topic_progress(user_id, completed);

-- Enable RLS
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can view their own topic progress" ON public.user_topic_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can insert their own topic progress" ON public.user_topic_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can update their own topic progress" ON public.user_topic_progress
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can delete their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can delete their own topic progress" ON public.user_topic_progress
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_topic_progress_updated_at ON public.user_topic_progress;
CREATE TRIGGER update_user_topic_progress_updated_at
  BEFORE UPDATE ON public.user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.user_topic_progress IS 'Tracks user progress through topics and subtopics';
COMMENT ON COLUMN public.user_topic_progress.score IS 'Score achieved (0-100) for the subtopic or topic';
COMMENT ON COLUMN public.user_topic_progress.completed IS 'Whether the subtopic/topic has been completed';



-- Миграция 47/53: 20251107000005_update_language_terms.sql
-- ============================================

-- ========================================
-- Migration: Update language_terms table
-- ========================================
-- Add topic_id to link terms with topics

-- Add topic_id column
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_language_terms_topic_id ON public.language_terms(topic_id);

-- Add comment for documentation
COMMENT ON COLUMN public.language_terms.topic_id IS 'Optional link to topic for organizing terms by learning path';



-- Миграция 48/53: 20251107100112_dabf4f52-64d6-49a4-a7a3-a015cc93cdc0.sql
-- ============================================

-- ========================================
-- Migration: Learning Map System
-- ========================================
-- This migration creates the complete learning map system including:
-- 1. source_id for questions_new (Google Sheets sync)
-- 2. topics table enhancements (descriptions, unlock conditions, order_index)
-- 3. subtopics table (learning units within topics)
-- 4. materials table (learning content)
-- 5. topic_tests table (tests for topics/subtopics)
-- 6. user_topic_progress table (progress tracking)
-- 7. material_versions table (version history)
-- 8. editor role support

-- ========================================
-- 1. Add source_id to questions_new table
-- ========================================
ALTER TABLE public.questions_new
ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;

COMMENT ON COLUMN public.questions_new.source_id IS 'Unique identifier from Google Sheets (e.g., GS-1, GS-2) for synchronization';

-- ========================================
-- 2. Update topics table for learning map
-- ========================================
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS unlock_condition JSONB DEFAULT '{"required_topics": [], "min_score": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Populate order_index from number for existing records
-- Also handle case where order_index might be NULL due to concurrent inserts
UPDATE public.topics
SET order_index = COALESCE(order_index, number, 0)
WHERE order_index IS NULL OR order_index = 0;

-- Ensure all records have order_index before making it NOT NULL
-- This handles any edge cases where NULL might still exist
UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

-- Remove DEFAULT only after NOT NULL is set (to prevent issues with concurrent inserts)
DO $$
BEGIN
  -- Check if column is NOT NULL before removing DEFAULT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'topics'
    AND column_name = 'order_index'
    AND is_nullable = 'NO'
  ) THEN
    -- Column is NOT NULL, safe to remove DEFAULT
    ALTER TABLE public.topics ALTER COLUMN order_index DROP DEFAULT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_topics_order_index ON public.topics(order_index);

COMMENT ON COLUMN public.topics.unlock_condition IS 'JSON object with unlock conditions: required_topics (array of topic numbers), min_score (integer), skip_test_id (UUID)';
COMMENT ON COLUMN public.topics.order_index IS 'Order of topic in learning map (same as number for backward compatibility)';

-- ========================================
-- 3. Create subtopics table
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.subtopic_type AS ENUM ('material', 'test', 'terms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type public.subtopic_type NOT NULL,
  content_id UUID,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON public.subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_order_index ON public.subtopics(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtopics_type ON public.subtopics(type);

ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subtopics" ON public.subtopics;
CREATE POLICY "Anyone can view subtopics"
  ON public.subtopics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can insert subtopics"
  ON public.subtopics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and editors can update subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can update subtopics"
  ON public.subtopics FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete subtopics" ON public.subtopics;
CREATE POLICY "Admins can delete subtopics"
  ON public.subtopics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_subtopics_updated_at ON public.subtopics;
CREATE TRIGGER update_subtopics_updated_at
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.subtopics IS 'Subtopics represent individual learning units within a topic (materials, tests, or terms)';

-- ========================================
-- 4. Create materials table
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.material_type AS ENUM ('theory', 'test', 'terms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ru TEXT NOT NULL,
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  source_pdf TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Note: Additional columns (content, html_preview, type, is_published, version, updated_by) 
-- will be added below via ALTER TABLE to ensure they exist even if table was created earlier

-- Ensure columns exist (they will be added in migration 49 if not already present)
-- Add columns that might not exist if table was created earlier
DO $$
BEGIN
  -- Add content column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN content JSONB;
  END IF;
  
  -- Add html_preview column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'html_preview'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN html_preview TEXT;
  END IF;
  
  -- Add type column if not exists (will be properly set in migration 49)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN type public.material_type DEFAULT 'theory';
  END IF;
  
  -- Add is_published column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  
  -- Add version column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
  
  -- Add updated_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'materials'
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON public.materials(subtopic_id);
-- Note: These indexes will be created later after columns are added (see migration 49)
-- CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
-- CREATE INDEX IF NOT EXISTS idx_materials_is_published ON public.materials(is_published);
-- CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON public.materials(updated_by);
-- CREATE INDEX IF NOT EXISTS idx_materials_version ON public.materials(version);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Anyone can view materials"
  ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
CREATE POLICY "Admins and editors can insert materials"
  ON public.materials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
CREATE POLICY "Admins and editors can update materials"
  ON public.materials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials"
  ON public.materials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.materials IS 'Learning materials (HTML/Markdown content) converted from PDFs';

-- ========================================
-- 5. Create topic_tests table
-- ========================================
CREATE TABLE IF NOT EXISTS public.topic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  min_pass_percent INTEGER NOT NULL DEFAULT 80,
  is_skip_test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT skip_test_must_be_topic_level CHECK (
    (is_skip_test = FALSE) OR (subtopic_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_topic_tests_topic_id ON public.topic_tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_subtopic_id ON public.topic_tests(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_skip_test ON public.topic_tests(is_skip_test);

ALTER TABLE public.topic_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view topic tests" ON public.topic_tests;
CREATE POLICY "Anyone can view topic tests"
  ON public.topic_tests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can insert topic tests"
  ON public.topic_tests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can update topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can update topic tests"
  ON public.topic_tests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can delete topic tests"
  ON public.topic_tests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_topic_tests_updated_at ON public.topic_tests;
CREATE TRIGGER update_topic_tests_updated_at
  BEFORE UPDATE ON public.topic_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.topic_tests IS 'Tests for topics and subtopics, including skip tests for unlocking topics';

-- ========================================
-- 6. Create user_topic_progress table
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_topic_id ON public.user_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_subtopic_id ON public.user_topic_progress(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_completed ON public.user_topic_progress(user_id, completed);

ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can view their own topic progress"
  ON public.user_topic_progress FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can insert their own topic progress"
  ON public.user_topic_progress FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can update their own topic progress"
  ON public.user_topic_progress FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can delete their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can delete their own topic progress"
  ON public.user_topic_progress FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP TRIGGER IF EXISTS update_user_topic_progress_updated_at ON public.user_topic_progress;
CREATE TRIGGER update_user_topic_progress_updated_at
  BEFORE UPDATE ON public.user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_topic_progress IS 'Tracks user progress through topics and subtopics';

-- ========================================
-- 7. Update language_terms table
-- ========================================
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_language_terms_topic_id ON public.language_terms(topic_id);

COMMENT ON COLUMN public.language_terms.topic_id IS 'Optional link to topic for organizing terms by learning path';

-- ========================================
-- 8. Create material_versions table
-- ========================================
CREATE TABLE IF NOT EXISTS public.material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  html_preview TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_versions_material_id ON public.material_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_versions_version ON public.material_versions(material_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_material_versions_updated_by ON public.material_versions(updated_by);

ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view material versions" ON public.material_versions;
CREATE POLICY "Anyone can view material versions"
  ON public.material_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert material versions" ON public.material_versions;
CREATE POLICY "Admins and editors can insert material versions"
  ON public.material_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete material versions" ON public.material_versions;
CREATE POLICY "Admins can delete material versions"
  ON public.material_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.material_versions IS 'Version history for materials (stores last 3 versions)';

-- Миграция 49/53: 20251108000000_update_materials_for_editor.sql
-- ============================================

-- ========================================
-- Migration: Update materials table for visual editor
-- ========================================
-- Add fields for TipTap editor: content (JSONB), html_preview (TEXT), type (ENUM), is_published (BOOLEAN), version (INTEGER), updated_by (UUID)

-- Create enum for material types (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
    CREATE TYPE public.material_type AS ENUM ('theory', 'test', 'terms');
  END IF;
END $$;

-- Add new columns to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS content JSONB, -- JSON TipTap content
ADD COLUMN IF NOT EXISTS html_preview TEXT, -- HTML version for preview
ADD COLUMN IF NOT EXISTS type public.material_type DEFAULT 'theory', -- Type of material
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE, -- Draft/published status
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1, -- Content version
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL; -- Editor ID

-- Migrate existing content_ru to content JSONB (if exists)
-- Convert HTML/Markdown to TipTap JSON format
-- For now, we'll keep content_ru as is and populate content later
UPDATE public.materials
SET content = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', COALESCE(content_ru, ''))
      )
    )
  )
)
WHERE content IS NULL AND content_ru IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_is_published ON public.materials(is_published);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON public.materials(updated_by);
CREATE INDEX IF NOT EXISTS idx_materials_version ON public.materials(version);

-- Update RLS policies for editors
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can delete materials" ON public.materials;

-- Create new policies for admins and editors
DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
CREATE POLICY "Admins and editors can insert materials" ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    -- Note: 'editor' role will be added in PART_06.sql, policies will be updated there
  );

DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
CREATE POLICY "Admins and editors can update materials" ON public.materials
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    -- Note: 'editor' role will be added in PART_06.sql, policies will be updated there
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    -- Note: 'editor' role will be added in PART_06.sql, policies will be updated there
  );

-- Only admins can delete materials
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials" ON public.materials
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comments for documentation
COMMENT ON COLUMN public.materials.content IS 'TipTap JSON content';
COMMENT ON COLUMN public.materials.html_preview IS 'HTML version for preview';
COMMENT ON COLUMN public.materials.type IS 'Type of material: theory, test, or terms';
COMMENT ON COLUMN public.materials.is_published IS 'Whether material is published (true) or draft (false)';
COMMENT ON COLUMN public.materials.version IS 'Content version number';
COMMENT ON COLUMN public.materials.updated_by IS 'ID of user who last updated the material';



-- Миграция 50/53: 20251108000001_create_material_versions.sql
-- ============================================

-- ========================================
-- Migration: Create material_versions table
-- ========================================
-- Stores version history for materials (last 3 versions)

CREATE TABLE IF NOT EXISTS public.material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- JSON TipTap content
  html_preview TEXT NOT NULL, -- HTML version
  version INTEGER NOT NULL, -- Version number
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Editor ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_versions_material_id ON public.material_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_versions_version ON public.material_versions(material_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_material_versions_updated_by ON public.material_versions(updated_by);

-- Enable RLS
ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view material versions" ON public.material_versions;
CREATE POLICY "Anyone can view material versions" ON public.material_versions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert material versions" ON public.material_versions;
CREATE POLICY "Admins and editors can insert material versions" ON public.material_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    -- Note: 'editor' role will be added in PART_06.sql, policies will be updated there
  );

-- Only admins can delete versions (for cleanup)
DROP POLICY IF EXISTS "Admins can delete material versions" ON public.material_versions;
CREATE POLICY "Admins can delete material versions" ON public.material_versions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON TABLE public.material_versions IS 'Version history for materials (stores last 3 versions)';
COMMENT ON COLUMN public.material_versions.content IS 'TipTap JSON content at this version';
COMMENT ON COLUMN public.material_versions.html_preview IS 'HTML preview at this version';
COMMENT ON COLUMN public.material_versions.version IS 'Version number';



