-- ============================================================================
-- Add image_status to questions_new
-- ============================================================================
-- Purpose: Make the "approved vs generated" distinction explicit instead of
-- relying on the URL path (which was: contains "/generated/" → generated).
--
-- This protects manually-approved images from being overwritten by bulk
-- syncs (deployTestToDb / Sync All DB).
-- ============================================================================

ALTER TABLE public.questions_new
    ADD COLUMN IF NOT EXISTS image_status TEXT;

-- Constraint: allow only known values (NULL is fine for questions without images)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questions_new_image_status_check'
    ) THEN
        ALTER TABLE public.questions_new
            ADD CONSTRAINT questions_new_image_status_check
            CHECK (image_status IS NULL OR image_status IN ('generated', 'approved', 'manual'));
    END IF;
END$$;

-- Backfill: classify existing rows based on URL path
UPDATE public.questions_new
SET image_status = CASE
    WHEN image_url IS NULL OR image_url = '' THEN NULL
    WHEN image_url LIKE '%/dgt-images/generated/%' THEN 'generated'
    WHEN image_url LIKE '%/dgt-images/%' THEN 'approved'
    ELSE NULL
END
WHERE image_status IS NULL;

-- Index for fast lookups during sync (only used when filtering by status)
CREATE INDEX IF NOT EXISTS idx_questions_new_image_status
    ON public.questions_new (image_status)
    WHERE image_status IS NOT NULL;

COMMENT ON COLUMN public.questions_new.image_status IS
    'Image lifecycle status: generated (auto, can be overwritten by sync) | approved (manually approved, protected from sync) | manual (uploaded directly by admin)';
