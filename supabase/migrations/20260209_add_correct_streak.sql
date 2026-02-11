-- Add correct_streak to user_challenge_questions for Interval Learning feature
ALTER TABLE user_challenge_questions ADD COLUMN IF NOT EXISTS correct_streak INTEGER DEFAULT 0;

-- Update column comments
COMMENT ON COLUMN user_challenge_questions.correct_streak IS 'Количество правильных ответов подряд (для Interval Learning)';
