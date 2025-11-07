-- ========================================
-- Migration: Create material_versions table
-- ========================================
-- Stores version history for materials (last 3 versions)

CREATE TABLE IF NOT EXISTS public.material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- JSON TipTap content
  html_preview TEXT NOT NULL, -- HTML version
  version INTEGER NOT NULL, -- Version number
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Editor ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_versions_material_id ON public.material_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_versions_version ON public.material_versions(material_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_material_versions_updated_by ON public.material_versions(updated_by);

-- Enable RLS
ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view material versions"
  ON public.material_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and editors can insert material versions"
  ON public.material_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete versions (for cleanup)
CREATE POLICY "Admins can delete material versions"
  ON public.material_versions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON TABLE public.material_versions IS 'Version history for materials (stores last 3 versions)';
COMMENT ON COLUMN public.material_versions.content IS 'TipTap JSON content at this version';
COMMENT ON COLUMN public.material_versions.html_preview IS 'HTML preview at this version';
COMMENT ON COLUMN public.material_versions.version IS 'Version number';

