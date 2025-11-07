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
CREATE POLICY "Anyone can view materials"
  ON public.materials
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete materials"
  ON public.materials
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.materials IS 'Learning materials (HTML/Markdown content) converted from PDFs';
COMMENT ON COLUMN public.materials.content_ru IS 'HTML or Markdown content in Russian';
COMMENT ON COLUMN public.materials.images IS 'JSON array of image URLs extracted from PDF';
COMMENT ON COLUMN public.materials.source_pdf IS 'Optional link to original PDF file for reference';

