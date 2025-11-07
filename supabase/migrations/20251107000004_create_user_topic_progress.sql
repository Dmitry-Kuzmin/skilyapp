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
CREATE POLICY "Users can view their own topic progress"
  ON public.user_topic_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own topic progress"
  ON public.user_topic_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own topic progress"
  ON public.user_topic_progress
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can delete their own topic progress"
  ON public.user_topic_progress
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_user_topic_progress_updated_at
  BEFORE UPDATE ON public.user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.user_topic_progress IS 'Tracks user progress through topics and subtopics';
COMMENT ON COLUMN public.user_topic_progress.score IS 'Score achieved (0-100) for the subtopic or topic';
COMMENT ON COLUMN public.user_topic_progress.completed IS 'Whether the subtopic/topic has been completed';

