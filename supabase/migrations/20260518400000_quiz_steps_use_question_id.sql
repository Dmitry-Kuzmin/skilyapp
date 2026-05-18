-- Convert quiz steps from inline content snapshots to question_id references.
-- Only affects steps that have image_url (DGT-backed) and don't yet have question_id.
-- Authored quizzes (no image_url) are left untouched.

UPDATE lesson_steps ls
SET
  content_es = jsonb_build_object(
    'question_id',
    (regexp_match(ls.content_es->>'image_url',
      '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
    )[1]::text,
    'explanation',
    ls.content_es->>'explanation'
  ),
  content_ru = jsonb_build_object(
    'question_id',
    (regexp_match(ls.content_es->>'image_url',
      '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
    )[1]::text,
    'explanation',
    ls.content_ru->>'explanation'
  )
FROM course_lessons cl
WHERE ls.lesson_id = cl.id
  AND cl.module_id = 'bef4ce90-5902-49d1-a082-173faeefda12'
  AND ls.type = 'quiz'
  AND ls.content_es ? 'image_url'
  AND NOT (ls.content_es ? 'question_id');
