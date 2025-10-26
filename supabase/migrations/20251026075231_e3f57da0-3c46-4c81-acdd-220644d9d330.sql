-- Drop old terms table and create new questions table
DROP TABLE IF EXISTS terms;

-- Create questions table with proper structure
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_es TEXT NOT NULL,
  topic_ru TEXT NOT NULL,
  question_es TEXT NOT NULL,
  question_ru TEXT NOT NULL,
  options_es TEXT[] NOT NULL,
  options_ru TEXT[] NOT NULL,
  correct_answer_es TEXT NOT NULL,
  correct_answer_ru TEXT NOT NULL,
  explanation_es TEXT,
  explanation_ru TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view questions" 
ON public.questions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions" 
ON public.questions 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete questions" 
ON public.questions 
FOR DELETE 
USING (true);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 1,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for achievements
CREATE POLICY "Users can view their own achievements" 
ON public.achievements 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own achievements" 
ON public.achievements 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own achievements" 
ON public.achievements 
FOR UPDATE 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add trigger for questions updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();