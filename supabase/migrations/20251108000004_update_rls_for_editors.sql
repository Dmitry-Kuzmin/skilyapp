-- ========================================
-- Migration: Update RLS policies for editors
-- ========================================
-- Editors can edit materials but not delete them
-- Only admins can delete materials

-- Update subtopics policies
DROP POLICY IF EXISTS "Authenticated users can insert subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can update subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can delete subtopics" ON public.subtopics;

CREATE POLICY "Admins and editors can insert subtopics"
  ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update subtopics"
  ON public.subtopics
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

-- Only admins can delete subtopics
CREATE POLICY "Admins can delete subtopics"
  ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update topics policies (if not already updated)
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;

-- Check if admin policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Admins can manage topics'
  ) THEN
    CREATE POLICY "Admins can manage topics"
      ON public.topics
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON POLICY "Admins and editors can insert subtopics" ON public.subtopics IS 'Editors can create subtopics';
COMMENT ON POLICY "Admins and editors can update subtopics" ON public.subtopics IS 'Editors can update subtopics';
COMMENT ON POLICY "Admins can delete subtopics" ON public.subtopics IS 'Only admins can delete subtopics';

