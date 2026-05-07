-- One-shot backfill: legacy writers stored game_sessions.score as a percentage (0-100),
-- but the schema and dashboard RPC expect "number of correct answers".
-- Convert any rows where score > total_questions back to a count.
-- Blitz outliers (where score = correctCount*100 + timeBonus) are clamped to total_questions.
UPDATE public.game_sessions
SET score = LEAST(total_questions,
                  GREATEST(0, ROUND(score::numeric / 100 * total_questions)::int))
WHERE score > total_questions
  AND total_questions > 0
  AND game_type IN (
    'test_exam','test_practice','test_sequential',
    'test_module','test_blitz','test_marathon','test_nonstop','test_traps'
  );
