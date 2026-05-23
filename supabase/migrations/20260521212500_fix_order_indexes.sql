-- Migration: Fix order indexes for Module 1 lessons to ensure they are sequential without gaps
-- Path: supabase/migrations/20260521212500_fix_order_indexes.sql

DO $$
BEGIN
  WITH reordered AS (
    SELECT id, row_number() OVER (ORDER BY order_index) as new_index
    FROM course_lessons
    WHERE module_id = 'bef4ce90-5902-49d1-a082-173faeefda12'
  )
  UPDATE course_lessons cl
  SET order_index = r.new_index
  FROM reordered r
  WHERE cl.id = r.id;
END $$;
