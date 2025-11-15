-- ============================================
-- ПРИМЕНИТЕ ЭТОТ ФАЙЛ В SQL EDITOR SUPABASE
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- ============================================
-- Duel Pass Season System - Complete Migration
-- ============================================

-- 1. Таблица сезонов Duel Pass
CREATE TABLE IF NOT EXISTS public.duel_pass_seasons (
  id SERIAL PRIMARY KEY,
  season_number INTEGER UNIQUE NOT NULL,
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('winter', 'spring', 'summer', 'autumn', 'special')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banner_image_url TEXT,
  description_ru TEXT,
  description_es TEXT,
  description_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_duel_pass_seasons_active 
  ON public.duel_pass_seasons(is_active, start_date);
CREATE INDEX IF NOT EXISTS idx_duel_pass_seasons_dates 
  ON public.duel_pass_seasons(start_date, end_date);

-- 2. Сезонные награды (30 уровней)
CREATE TABLE IF NOT EXISTS public.duel_pass_season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES public.duel_pass_seasons(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 30),
  sp_required INTEGER NOT NULL,
  free_reward JSONB,
  premium_reward JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, level)
);

CREATE INDEX IF NOT EXISTS idx_season_rewards_season_level 
  ON public.duel_pass_season_rewards(season_id, level);

-- 3. Прогресс пользователя в сезоне
CREATE TABLE IF NOT EXISTS public.user_season_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.duel_pass_seasons(id) ON DELETE CASCADE,
  season_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  premium_pass_purchased BOOLEAN NOT NULL DEFAULT false,
  premium_pass_purchased_at TIMESTAMPTZ,
  levels_skipped INTEGER NOT NULL DEFAULT 0,
  final_level INTEGER,
  final_sp INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_user_season_progress_user 
  ON public.user_season_progress(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_user_season_progress_season 
  ON public.user_season_progress(season_id);

-- 4. Сезонные челленджи
CREATE TABLE IF NOT EXISTS public.season_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES public.duel_pass_seasons(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'season')),
  title_ru TEXT NOT NULL,
  title_es TEXT,
  title_en TEXT,
  description_ru TEXT,
  description_es TEXT,
  description_en TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN (
    'tests_completed', 
    'tests_perfect', 
    'questions_answered', 
    'duels_played', 
    'duels_won',
    'streak_days',
    'coins_earned',
    'sp_earned'
  )),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  reward_sp INTEGER NOT NULL DEFAULT 0 CHECK (reward_sp >= 0),
  reward_coins INTEGER NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_challenges_season_type 
  ON public.season_challenges(season_id, challenge_type, is_active);
CREATE INDEX IF NOT EXISTS idx_season_challenges_dates 
  ON public.season_challenges(start_date, end_date);

-- 5. Прогресс пользователя по челленджам
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.season_challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user 
  ON public.user_challenge_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge 
  ON public.user_challenge_progress(challenge_id);

-- 6. История завершенных сезонов пользователя
CREATE TABLE IF NOT EXISTS public.user_season_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.duel_pass_seasons(id) ON DELETE CASCADE,
  final_level INTEGER NOT NULL,
  final_sp INTEGER NOT NULL,
  premium_pass_purchased BOOLEAN NOT NULL DEFAULT false,
  total_rewards_claimed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_user_season_history_user 
  ON public.user_season_history(user_id, season_id);

-- Enable RLS
ALTER TABLE public.duel_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_pass_season_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies для duel_pass_seasons
DROP POLICY IF EXISTS "Anyone can view active seasons" ON public.duel_pass_seasons;
CREATE POLICY "Anyone can view active seasons"
  ON public.duel_pass_seasons FOR SELECT
  USING (true);

-- RLS Policies для duel_pass_season_rewards
DROP POLICY IF EXISTS "Anyone can view season rewards" ON public.duel_pass_season_rewards;
CREATE POLICY "Anyone can view season rewards"
  ON public.duel_pass_season_rewards FOR SELECT
  USING (true);

-- RLS Policies для user_season_progress
DROP POLICY IF EXISTS "Users can view their own season progress" ON public.user_season_progress;
CREATE POLICY "Users can view their own season progress"
  ON public.user_season_progress FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

DROP POLICY IF EXISTS "Service role can manage season progress" ON public.user_season_progress;
CREATE POLICY "Service role can manage season progress"
  ON public.user_season_progress FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies для season_challenges
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.season_challenges;
CREATE POLICY "Anyone can view active challenges"
  ON public.season_challenges FOR SELECT
  USING (is_active = true);

-- RLS Policies для user_challenge_progress
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Users can view their own challenge progress"
  ON public.user_challenge_progress FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

DROP POLICY IF EXISTS "Service role can manage challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Service role can manage challenge progress"
  ON public.user_challenge_progress FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies для user_season_history
DROP POLICY IF EXISTS "Users can view their own season history" ON public.user_season_history;
CREATE POLICY "Users can view their own season history"
  ON public.user_season_history FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

-- Функция для получения активного сезона
CREATE OR REPLACE FUNCTION public.get_active_season()
RETURNS TABLE (
  id INTEGER,
  season_number INTEGER,
  name_ru TEXT,
  name_es TEXT,
  name_en TEXT,
  theme TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_time TIMESTAMPTZ := now();
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.season_number,
    s.name_ru,
    s.name_es,
    s.name_en,
    s.theme,
    s.start_date,
    s.end_date,
    GREATEST(0, EXTRACT(EPOCH FROM (s.end_date - current_time))::INTEGER / 86400)::INTEGER as days_remaining
  FROM public.duel_pass_seasons s
  WHERE s.is_active = true
    AND s.start_date <= current_time
    AND s.end_date >= current_time
  ORDER BY s.season_number DESC
  LIMIT 1;
END;
$$;

-- Функция для получения или создания прогресса пользователя в сезоне
CREATE OR REPLACE FUNCTION public.get_or_create_season_progress(
  p_user_id UUID,
  p_season_id INTEGER
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  season_id INTEGER,
  season_points INTEGER,
  level INTEGER,
  premium_pass_purchased BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress_id UUID;
BEGIN
  -- Пытаемся найти существующий прогресс
  SELECT id INTO v_progress_id
  FROM public.user_season_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;

  -- Если не найден, создаем новый
  IF v_progress_id IS NULL THEN
    INSERT INTO public.user_season_progress (user_id, season_id, season_points, level)
    VALUES (p_user_id, p_season_id, 0, 1)
    RETURNING id INTO v_progress_id;
  END IF;

  -- Возвращаем прогресс
  RETURN QUERY
  SELECT 
    usp.id,
    usp.user_id,
    usp.season_id,
    usp.season_points,
    usp.level,
    usp.premium_pass_purchased
  FROM public.user_season_progress usp
  WHERE usp.id = v_progress_id;
END;
$$;

-- Создаем первый сезон "Operación Asfalto"
INSERT INTO public.duel_pass_seasons (
  season_number, 
  name_ru, 
  name_es, 
  name_en, 
  theme, 
  start_date, 
  end_date,
  description_ru,
  description_es,
  description_en
) VALUES (
  1,
  'Операция Асфальт',
  'Operación Asfalto',
  'Operation Asphalt',
  'special',
  NOW(),
  NOW() + INTERVAL '30 days',
  'Первый сезон Duel Pass! Получайте награды за активность и обучение.',
  '¡Primera temporada de Duel Pass! Obtén recompensas por tu actividad y aprendizaje.',
  'First Duel Pass season! Earn rewards for your activity and learning.'
) ON CONFLICT (season_number) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  theme = EXCLUDED.theme,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  description_en = EXCLUDED.description_en,
  is_active = true;

-- Создаем награды для первого сезона (30 уровней, по 100 SP каждый)
DO $$
DECLARE
  v_season_id INTEGER;
  v_level INTEGER;
  v_sp_required INTEGER;
BEGIN
  SELECT id INTO v_season_id FROM public.duel_pass_seasons WHERE season_number = 1;
  
  IF v_season_id IS NOT NULL THEN
    FOR v_level IN 1..30 LOOP
      v_sp_required := v_level * 100; -- Накопительное значение
      
      -- Free награды на уровнях: 1, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30 (16 уровней)
      -- Premium награды на всех уровнях
      
      IF v_level IN (1, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30) THEN
        -- Уровень с бесплатной наградой
        INSERT INTO public.duel_pass_season_rewards (
          season_id, 
          level, 
          sp_required,
          free_reward,
          premium_reward
        ) VALUES (
          v_season_id,
          v_level,
          v_sp_required,
          CASE 
            WHEN v_level IN (1, 3, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28) THEN 
              jsonb_build_object('type', 'coins', 'amount', 15 + (v_level * 2))
            WHEN v_level = 5 THEN 
              jsonb_build_object('type', 'skin', 'id', 'frame_novice')
            WHEN v_level = 30 THEN 
              jsonb_build_object('type', 'badge', 'id', 'season_1_silver')
            ELSE 
              jsonb_build_object('type', 'coins', 'amount', 20)
          END,
          jsonb_build_object(
            'type', 
            CASE 
              WHEN v_level IN (2, 4, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29) THEN 'coins'
              WHEN v_level = 5 THEN 'skin'
              WHEN v_level = 10 THEN 'badge'
              WHEN v_level = 15 THEN 'boost'
              WHEN v_level = 20 THEN 'skin'
              WHEN v_level = 25 THEN 'boost'
              WHEN v_level = 30 THEN 'badge'
              ELSE 'coins'
            END,
            'amount',
            CASE 
              WHEN v_level IN (2, 4, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29) THEN 50 + (v_level * 3)
              ELSE NULL
            END,
            'id',
            CASE 
              WHEN v_level = 2 THEN 'sticker_traffic_light'
              WHEN v_level = 5 THEN 'frame_season_1_premium'
              WHEN v_level = 10 THEN 'badge_season_1_gold'
              WHEN v_level = 15 THEN 'boost_life'
              WHEN v_level = 20 THEN 'skin_avatar_premium'
              WHEN v_level = 25 THEN 'boost_double_coins'
              WHEN v_level = 30 THEN 'badge_season_1_platinum'
              ELSE NULL
            END
          )
        ) ON CONFLICT (season_id, level) DO UPDATE
        SET 
          sp_required = EXCLUDED.sp_required,
          free_reward = EXCLUDED.free_reward,
          premium_reward = EXCLUDED.premium_reward;
      ELSE
        -- Уровень только с Premium наградой
        INSERT INTO public.duel_pass_season_rewards (
          season_id, 
          level, 
          sp_required,
          free_reward,
          premium_reward
        ) VALUES (
          v_season_id,
          v_level,
          v_sp_required,
          NULL,
          jsonb_build_object(
            'type', 
            CASE 
              WHEN v_level IN (2, 4, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29) THEN 'coins'
              WHEN v_level = 2 THEN 'sticker'
              WHEN v_level = 4 THEN 'boost'
              WHEN v_level = 7 THEN 'boost'
              WHEN v_level = 9 THEN 'skin'
              ELSE 'coins'
            END,
            'amount',
            CASE 
              WHEN v_level IN (2, 4, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29) THEN 50 + (v_level * 3)
              ELSE NULL
            END,
            'id',
            CASE 
              WHEN v_level = 2 THEN 'sticker_traffic_light'
              WHEN v_level = 4 THEN 'boost_double_coins'
              WHEN v_level = 7 THEN 'boost_mega_test'
              WHEN v_level = 9 THEN 'skin_avatar_premium'
              ELSE NULL
            END
          )
        ) ON CONFLICT (season_id, level) DO UPDATE
        SET 
          sp_required = EXCLUDED.sp_required,
          free_reward = EXCLUDED.free_reward,
          premium_reward = EXCLUDED.premium_reward;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Создаем примеры челленджей для первого сезона
DO $$
DECLARE
  v_season_id INTEGER;
BEGIN
  SELECT id INTO v_season_id FROM public.duel_pass_seasons WHERE season_number = 1;
  
  IF v_season_id IS NOT NULL THEN
    -- Daily челленджи
    INSERT INTO public.season_challenges (
      season_id,
      challenge_type,
      title_ru,
      description_ru,
      target_type,
      target_value,
      reward_sp,
      reward_coins,
      start_date,
      end_date
    ) VALUES
    (v_season_id, 'daily', '3 идеальных теста', 'Пройди 3 теста без ошибок за день', 'tests_perfect', 3, 25, 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
    (v_season_id, 'daily', '100 SP за день', 'Набери 100 Season Points за день', 'sp_earned', 100, 15, 5, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
    
    -- Weekly челленджи
    INSERT INTO public.season_challenges (
      season_id,
      challenge_type,
      title_ru,
      description_ru,
      target_type,
      target_value,
      reward_sp,
      reward_coins,
      start_date,
      end_date
    ) VALUES
    (v_season_id, 'weekly', '150 вопросов за неделю', 'Ответь на 150 вопросов за неделю', 'questions_answered', 150, 100, 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
    (v_season_id, 'weekly', '5 дуэлей', 'Сыграй 5 дуэлей за неделю', 'duels_played', 5, 75, 30, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days')
    ON CONFLICT DO NOTHING;
    
    -- Season челленджи
    INSERT INTO public.season_challenges (
      season_id,
      challenge_type,
      title_ru,
      description_ru,
      target_type,
      target_value,
      reward_sp,
      reward_coins,
      start_date,
      end_date
    ) VALUES
    (v_season_id, 'season', 'Закрой все игры', 'Пройди все игровые режимы за сезон', 'tests_completed', 10, 200, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
    (v_season_id, 'season', '10 дней подряд', 'Держи streak 10 дней подряд', 'streak_days', 10, 150, 75, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

