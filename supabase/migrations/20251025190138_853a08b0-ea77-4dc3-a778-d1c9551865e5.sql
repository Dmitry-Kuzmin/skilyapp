-- Create terms table for storing test data
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spanish TEXT NOT NULL,
  russian TEXT NOT NULL,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('Лёгкая', 'Средняя', 'Сложная')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read terms (for games)
CREATE POLICY "Anyone can view terms" 
ON public.terms 
FOR SELECT 
USING (true);

-- Only authenticated admins can insert/update/delete terms
-- For now, we'll allow all authenticated users to manage terms
-- You can modify this later to check for admin role
CREATE POLICY "Authenticated users can insert terms" 
ON public.terms 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update terms" 
ON public.terms 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete terms" 
ON public.terms 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_terms_updated_at
BEFORE UPDATE ON public.terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create game_sessions table to track game history
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own game sessions
CREATE POLICY "Users can view their own sessions" 
ON public.game_sessions 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can insert their own game sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);