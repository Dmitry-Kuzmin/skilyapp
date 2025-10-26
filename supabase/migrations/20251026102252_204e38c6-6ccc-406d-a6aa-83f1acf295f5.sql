-- Create road_signs table
CREATE TABLE IF NOT EXISTS public.road_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_es TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  sign_type TEXT NOT NULL,
  sign_number TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create language_terms table
CREATE TABLE IF NOT EXISTS public.language_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_es TEXT NOT NULL,
  term_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  category UUID,
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.road_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_terms ENABLE ROW LEVEL SECURITY;

-- Create policies for road_signs (public read access)
CREATE POLICY "Anyone can view road signs"
ON public.road_signs
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert road signs"
ON public.road_signs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update road signs"
ON public.road_signs
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete road signs"
ON public.road_signs
FOR DELETE
USING (true);

-- Create policies for language_terms (public read access)
CREATE POLICY "Anyone can view language terms"
ON public.language_terms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert language terms"
ON public.language_terms
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update language terms"
ON public.language_terms
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete language terms"
ON public.language_terms
FOR DELETE
USING (true);