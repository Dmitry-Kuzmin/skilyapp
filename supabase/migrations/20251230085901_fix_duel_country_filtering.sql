-- Migration: Fix Duel Country Filtering
-- 1. Add country column to duel_matchmaking_queue
ALTER TABLE public.duel_matchmaking_queue 
ADD COLUMN IF NOT EXISTS preferred_country TEXT NOT NULL DEFAULT 'spain';

-- 2. Add country column to duels to track what country the duel is for
ALTER TABLE public.duels
ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'spain';

-- 3. Update get_random_duel_questions to filter by country
CREATE OR REPLACE FUNCTION get_random_duel_questions(
    p_limit INT,
    p_categories UUID[] DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'spain'
)
RETURNS TABLE (
    id UUID,
    question_ru TEXT,
    question_es TEXT,
    question_en TEXT,
    image_url TEXT,
    difficulty TEXT,
    category_id UUID,
    answer_options JSON
) AS $$
DECLARE
    v_country_code TEXT;
BEGIN
    -- Map full country names to short codes if necessary
    v_country_code := CASE 
        WHEN p_country = 'russia' THEN 'ru'
        WHEN p_country = 'spain' THEN 'es'
        ELSE COALESCE(p_country, 'es')
    END;

    RETURN QUERY
    SELECT 
        q.id,
        q.question_ru,
        q.question_es,
        q.question_en,
        q.image_url,
        q.difficulty,
        q.category_id,
        COALESCE(
            (
                SELECT json_agg(json_build_object(
                    'id', ao.id,
                    'text_ru', ao.text_ru,
                    'text_es', ao.text_es,
                    'text_en', ao.text_en,
                    'is_correct', ao.is_correct,
                    'position', ao.position
                ) ORDER BY ao.position)
                FROM answer_options ao
                WHERE ao.question_id = q.id
            ),
            '[]'::json
        ) as answer_options
    FROM questions_new q
    WHERE 
        (q.country = v_country_code) -- STRICT FILTER BY COUNTRY
        AND (p_difficulty IS NULL OR p_difficulty = 'mix' OR q.difficulty = p_difficulty)
        AND (p_categories IS NULL OR q.category_id = ANY(p_categories))
    ORDER BY random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update find_matchmaking_opponent to filter by country
CREATE OR REPLACE FUNCTION find_matchmaking_opponent(
  p_profile_id UUID,
  p_bet_amount INTEGER,
  p_difficulty TEXT,
  p_country TEXT DEFAULT 'spain'
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  num_questions INTEGER,
  difficulty TEXT,
  categories JSONB,
  bet_amount INTEGER,
  bet_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent RECORD;
BEGIN
  -- Ищем подходящего соперника с той же страной обучания
  SELECT 
    q.id,
    q.profile_id,
    q.num_questions,
    q.difficulty,
    q.categories,
    q.bet_amount,
    q.bet_type
  INTO v_opponent
  FROM duel_matchmaking_queue q
  WHERE q.matched = false
    AND q.preferred_country = p_country -- MATCH BY COUNTRY
    AND q.bet_amount = p_bet_amount
    AND (q.difficulty = p_difficulty OR q.difficulty = 'mix' OR p_difficulty = 'mix')
    AND q.profile_id != p_profile_id
    AND q.expires_at > now()
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Если нашли - помечаем как matched и возвращаем
  IF v_opponent.id IS NOT NULL THEN
    UPDATE duel_matchmaking_queue
    SET matched = true
    WHERE id = v_opponent.id;

    RETURN QUERY SELECT 
      v_opponent.id,
      v_opponent.profile_id,
      v_opponent.num_questions,
      v_opponent.difficulty,
      v_opponent.categories,
      v_opponent.bet_amount,
      v_opponent.bet_type;
  END IF;

  RETURN;
END;
$$;
