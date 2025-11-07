-- ========================================
-- Migration: Create subtopics table
-- ========================================
-- Subtopics represent individual learning units within a topic
-- Types: 'material', 'test', 'terms'

-- Create enum for subtopic types
CREATE TYPE public.subtopic_type AS ENUM ('material', 'test', 'terms');

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
CREATE POLICY "Anyone can view subtopics"
  ON public.subtopics
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert subtopics"
  ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subtopics"
  ON public.subtopics
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete subtopics"
  ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_subtopics_updated_at
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.subtopics IS 'Subtopics represent individual learning units within a topic (materials, tests, or terms)';
COMMENT ON COLUMN public.subtopics.type IS 'Type of subtopic: material (learning content), test (quiz), or terms (vocabulary)';
COMMENT ON COLUMN public.subtopics.content_id IS 'Reference to specific content: material ID, test ID, or NULL for terms (filtered by topic_id)';
COMMENT ON COLUMN public.subtopics.is_required IS 'Whether this subtopic must be completed to finish the parent topic';

