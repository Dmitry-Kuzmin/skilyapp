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
CREATE POLICY "Admins and editors can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete materials
CREATE POLICY "Admins can delete materials"
  ON public.materials
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

