-- Create answer_options table for questions_new
CREATE TABLE IF NOT EXISTS public.answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions_new(id) ON DELETE CASCADE,
  text_ru TEXT NOT NULL,
  text_es TEXT NOT NULL,
  text_en TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing answer options
CREATE POLICY "Anyone can view answer options"
  ON public.answer_options
  FOR SELECT
  USING (true);

-- Create policy for admins to manage answer options
CREATE POLICY "Admins can manage answer options"
  ON public.answer_options
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id 
  ON public.answer_options(question_id);

CREATE INDEX IF NOT EXISTS idx_answer_options_position 
  ON public.answer_options(question_id, position);