-- =====================================================
-- LEADERBOARD REWARDS SYSTEM: Призы для топ-3 и топ-10
-- =====================================================

-- ============================================
-- 1. ТАБЛИЦА ПРИЗОВ ЛИДЕРБОРДА ПО СЕЗОНАМ
-- ============================================

CREATE TABLE IF NOT EXISTS public.leaderboard_season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES duel_pass_seasons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 10),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('skin', 'badge', 'frame', 'title', 'coins', 'aura')),
  reward_data JSONB NOT NULL, -- { id: 'skin_champion_season_1', amount: 500, etc. }
  is_exclusive BOOLEAN DEFAULT false, -- Для уникальных скинов, которые больше не появятся
  description_ru TEXT,
  description_es TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, position, reward_type)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_season_position 
  ON public.leaderboard_season_rewards(season_id, position);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_type 
  ON public.leaderboard_season_rewards(reward_type);

-- ============================================
-- 2. ТАБЛИЦА ПОЛУЧЕННЫХ ПРИЗОВ ПОЛЬЗОВАТЕЛЯМИ
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_leaderboard_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES duel_pass_seasons(id) ON DELETE CASCADE,
  final_position INTEGER NOT NULL CHECK (final_position BETWEEN 1 AND 10),
  final_duel_pass_level INTEGER NOT NULL,
  final_duel_pass_xp INTEGER NOT NULL,
  rewards_claimed JSONB DEFAULT '[]'::jsonb, -- Массив полученных наград
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_user_leaderboard_rewards_user_season 
  ON public.user_leaderboard_rewards(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_user_leaderboard_rewards_season_position 
  ON public.user_leaderboard_rewards(season_id, final_position);
CREATE INDEX IF NOT EXISTS idx_user_leaderboard_rewards_position 
  ON public.user_leaderboard_rewards(final_position);

-- ============================================
-- 3. RLS ПОЛИТИКИ
-- ============================================

ALTER TABLE public.leaderboard_season_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leaderboard_rewards ENABLE ROW LEVEL SECURITY;

-- Все могут читать призы лидерборда
CREATE POLICY "Anyone can view leaderboard rewards"
  ON public.leaderboard_season_rewards FOR SELECT
  USING (true);

-- Пользователи могут видеть свои призы и призы других
CREATE POLICY "Anyone can view user leaderboard rewards"
  ON public.user_leaderboard_rewards FOR SELECT
  USING (true);

-- Service role может управлять призами
CREATE POLICY "Service role can manage leaderboard rewards"
  ON public.leaderboard_season_rewards FOR ALL
  WITH CHECK (true);

CREATE POLICY "Service role can manage user rewards"
  ON public.user_leaderboard_rewards FOR ALL
  WITH CHECK (true);

-- ============================================
-- 4. ФУНКЦИЯ ДЛЯ НАЧИСЛЕНИЯ ПРИЗОВ
-- ============================================

CREATE OR REPLACE FUNCTION claim_leaderboard_rewards(
  p_user_id UUID,
  p_season_id INTEGER,
  p_position INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rewards JSONB[];
  v_reward_record RECORD;
  v_claimed_rewards JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  -- Получаем все призы для данной позиции в сезоне
  FOR v_reward_record IN
    SELECT * FROM leaderboard_season_rewards
    WHERE season_id = p_season_id AND position = p_position
  LOOP
    -- Добавляем награду в список полученных
    v_claimed_rewards := v_claimed_rewards || jsonb_build_object(
      'type', v_reward_record.reward_type,
      'data', v_reward_record.reward_data,
      'claimed_at', NOW()
    );
  END LOOP;

  -- Обновляем или создаем запись о полученных призах
  INSERT INTO user_leaderboard_rewards (
    user_id, 
    season_id, 
    final_position,
    final_duel_pass_level,
    final_duel_pass_xp,
    rewards_claimed,
    claimed_at
  )
  VALUES (
    p_user_id,
    p_season_id,
    p_position,
    (SELECT duel_pass_level FROM profiles WHERE id = p_user_id),
    (SELECT duel_pass_xp FROM profiles WHERE id = p_user_id),
    v_claimed_rewards,
    NOW()
  )
  ON CONFLICT (user_id, season_id) DO UPDATE
  SET 
    final_position = EXCLUDED.final_position,
    final_duel_pass_level = EXCLUDED.final_duel_pass_level,
    final_duel_pass_xp = EXCLUDED.final_duel_pass_xp,
    rewards_claimed = EXCLUDED.rewards_claimed,
    claimed_at = EXCLUDED.claimed_at;

  v_result := jsonb_build_object(
    'success', true,
    'position', p_position,
    'rewards_count', jsonb_array_length(v_claimed_rewards),
    'rewards', v_claimed_rewards
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. ГРАНТЫ
-- ============================================

GRANT SELECT ON public.leaderboard_season_rewards TO authenticated;
GRANT SELECT ON public.leaderboard_season_rewards TO anon;
GRANT SELECT ON public.user_leaderboard_rewards TO authenticated;
GRANT SELECT ON public.user_leaderboard_rewards TO anon;
GRANT EXECUTE ON FUNCTION public.claim_leaderboard_rewards(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_leaderboard_rewards(UUID, INTEGER, INTEGER) TO anon;

COMMENT ON TABLE public.leaderboard_season_rewards IS 'Призы лидерборда для топ-3 и топ-10 по сезонам';
COMMENT ON TABLE public.user_leaderboard_rewards IS 'Полученные призы лидерборда пользователями';
COMMENT ON FUNCTION public.claim_leaderboard_rewards(UUID, INTEGER, INTEGER) IS 'Начисляет призы лидерборда пользователю';

