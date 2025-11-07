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
ADD COLUMN IF NOT EXISTS order_index INTEGER;

UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

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
  content JSONB,
  html_preview TEXT,
  type public.material_type DEFAULT 'theory',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_pdf TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON public.materials(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_is_published ON public.materials(is_published);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON public.materials(updated_by);
CREATE INDEX IF NOT EXISTS idx_materials_version ON public.materials(version);

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