-- Split Errors and Favorites logic in user_challenge_questions

-- 1. Add is_favorite column
ALTER TABLE user_challenge_questions ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- 2. Migrate existing data
-- Records with times_wrong = 0 were created by the "Bookmark" button (as per previous logic).
-- We mark them as favorites and "mastered" (so they don't appear in the Errors list).
UPDATE user_challenge_questions 
SET is_favorite = TRUE, mastered = TRUE 
WHERE times_wrong = 0;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_challenge_questions_is_favorite ON user_challenge_questions(is_favorite);

-- 4. Function to get user favorites
CREATE OR REPLACE FUNCTION get_user_favorites(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  question_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  question_ru TEXT,
  question_es TEXT,
  question_en TEXT,
  image_url TEXT,
  topic_title_ru TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ucq.id,
    ucq.question_id,
    ucq.created_at,
    q.question_ru,
    q.question_es,
    q.question_en,
    q.image_url,
    t.title_ru as topic_title_ru
  FROM user_challenge_questions ucq
  JOIN questions_new q ON q.id = ucq.question_id
  LEFT JOIN topics t ON t.id = q.topic_id
  WHERE ucq.user_id = p_user_id
    AND ucq.is_favorite = TRUE
  ORDER BY ucq.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Updated Stats function
CREATE OR REPLACE FUNCTION get_challenge_stats_v2(p_user_id UUID)
RETURNS TABLE (
  error_count INTEGER,
  favorite_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM user_challenge_questions WHERE user_id = p_user_id AND mastered = FALSE) as error_count,
    (SELECT COUNT(*)::INTEGER FROM user_challenge_questions WHERE user_id = p_user_id AND is_favorite = TRUE) as favorite_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions (just in case)
GRANT EXECUTE ON FUNCTION get_user_favorites(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_stats_v2(UUID) TO authenticated;
