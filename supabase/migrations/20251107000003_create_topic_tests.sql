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
CREATE POLICY "Anyone can view topic tests"
  ON public.topic_tests
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert topic tests"
  ON public.topic_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update topic tests"
  ON public.topic_tests
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete topic tests"
  ON public.topic_tests
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_topic_tests_updated_at
  BEFORE UPDATE ON public.topic_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.topic_tests IS 'Tests for topics and subtopics, including skip tests for unlocking topics';
COMMENT ON COLUMN public.topic_tests.is_skip_test IS 'If true, passing this test allows skipping required topics';
COMMENT ON COLUMN public.topic_tests.min_pass_percent IS 'Minimum percentage score (0-100) required to pass the test';

