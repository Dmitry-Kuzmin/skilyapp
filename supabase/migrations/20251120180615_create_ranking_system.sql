-- =====================================================
-- RANKING SYSTEM: Ранги на основе Duel Pass уровня
-- =====================================================

-- ============================================
-- 1. ТАБЛИЦА НАГРАД ПО РАНГАМ
-- ============================================

CREATE TABLE IF NOT EXISTS public.rank_rewards (
  rank TEXT PRIMARY KEY CHECK (rank IN ('rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master')),
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  free_reward JSONB, -- { type: 'frame', id: 'frame_rookie' } или { type: 'skin', id: 'skin_gold' }
  premium_reward JSONB, -- { type: 'frame', id: 'frame_gold_premium' } или { type: 'skin', id: 'skin_platinum' }
  title_ru TEXT, -- "Новичок", "Мастер сезона"
  title_es TEXT,
  min_level INTEGER NOT NULL, -- Минимальный уровень Duel Pass для ранга
  max_level INTEGER, -- Максимальный уровень (NULL для master)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ТАБЛИЦА РАНГОВ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES duel_pass_seasons(id) ON DELETE CASCADE,
  rank TEXT NOT NULL CHECK (rank IN ('rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master')),
  duel_pass_level INTEGER NOT NULL, -- Уровень Duel Pass на момент присвоения ранга
  duel_pass_xp INTEGER NOT NULL, -- XP на момент присвоения ранга
  is_master_top_100 BOOLEAN DEFAULT false, -- True если Master получен через топ 100
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ranks_user_season ON public.user_ranks(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_user_ranks_season_rank ON public.user_ranks(season_id, rank);
CREATE INDEX IF NOT EXISTS idx_user_ranks_rank ON public.user_ranks(rank);

-- ============================================
-- 3. ФУНКЦИЯ РАСЧЕТА РАНГА
-- ============================================

CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_season_id INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duel_pass_level INTEGER;
  v_rank TEXT;
  v_season_id INTEGER;
BEGIN
  -- Если сезон не указан, берем активный сезон
  IF p_season_id IS NULL THEN
    SELECT id INTO v_season_id 
    FROM duel_pass_seasons 
    WHERE is_active = true 
    ORDER BY season_number DESC 
    LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  -- Получаем уровень Duel Pass пользователя
  SELECT duel_pass_level INTO v_duel_pass_level
  FROM profiles
  WHERE id = p_user_id;

  -- Если уровень NULL, возвращаем Rookie
  IF v_duel_pass_level IS NULL THEN
    RETURN 'rookie';
  END IF;

  -- Определяем ранг на основе уровня
  CASE
    WHEN v_duel_pass_level BETWEEN 1 AND 5 THEN
      v_rank := 'rookie';
    WHEN v_duel_pass_level BETWEEN 6 AND 10 THEN
      v_rank := 'bronze';
    WHEN v_duel_pass_level BETWEEN 11 AND 15 THEN
      v_rank := 'silver';
    WHEN v_duel_pass_level BETWEEN 16 AND 20 THEN
      v_rank := 'gold';
    WHEN v_duel_pass_level BETWEEN 21 AND 25 THEN
      v_rank := 'platinum';
    WHEN v_duel_pass_level >= 26 THEN
      v_rank := 'diamond';
    ELSE
      v_rank := 'rookie';
  END CASE;

  RETURN v_rank;
END;
$$;

-- ============================================
-- 4. ФУНКЦИЯ ОБНОВЛЕНИЯ РАНГА ПОЛЬЗОВАТЕЛЯ
-- ============================================

CREATE OR REPLACE FUNCTION update_user_rank(
  p_user_id UUID,
  p_season_id INTEGER DEFAULT NULL,
  p_force_update BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id INTEGER;
  v_duel_pass_level INTEGER;
  v_duel_pass_xp INTEGER;
  v_current_rank TEXT;
  v_new_rank TEXT;
  v_rank_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Если сезон не указан, берем активный сезон
  IF p_season_id IS NULL THEN
    SELECT id INTO v_season_id 
    FROM duel_pass_seasons 
    WHERE is_active = true 
    ORDER BY season_number DESC 
    LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'Нет активного сезона'
    );
  END IF;

  -- Получаем текущий уровень и XP пользователя
  SELECT duel_pass_level, duel_pass_xp 
  INTO v_duel_pass_level, v_duel_pass_xp
  FROM profiles
  WHERE id = p_user_id;

  IF v_duel_pass_level IS NULL THEN
    v_duel_pass_level := 1;
    v_duel_pass_xp := 0;
  END IF;

  -- Рассчитываем новый ранг
  v_new_rank := get_user_rank(p_user_id, v_season_id);

  -- Проверяем, есть ли уже запись о ранге
  SELECT EXISTS(
    SELECT 1 FROM user_ranks 
    WHERE user_id = p_user_id AND season_id = v_season_id
  ) INTO v_rank_exists;

  IF v_rank_exists THEN
    -- Получаем текущий ранг
    SELECT rank INTO v_current_rank
    FROM user_ranks
    WHERE user_id = p_user_id AND season_id = v_season_id;

    -- Обновляем только если ранг изменился или принудительное обновление
    IF v_new_rank != v_current_rank OR p_force_update THEN
      UPDATE user_ranks
      SET 
        rank = v_new_rank,
        duel_pass_level = v_duel_pass_level,
        duel_pass_xp = v_duel_pass_xp,
        obtained_at = CASE 
          WHEN v_new_rank != v_current_rank THEN NOW()
          ELSE obtained_at
        END
      WHERE user_id = p_user_id AND season_id = v_season_id;

      v_result := jsonb_build_object(
        'success', true,
        'rank_changed', v_new_rank != v_current_rank,
        'old_rank', v_current_rank,
        'new_rank', v_new_rank,
        'level', v_duel_pass_level,
        'xp', v_duel_pass_xp
      );
    ELSE
      v_result := jsonb_build_object(
        'success', true,
        'rank_changed', false,
        'rank', v_current_rank,
        'level', v_duel_pass_level,
        'xp', v_duel_pass_xp
      );
    END IF;
  ELSE
    -- Создаем новую запись
    INSERT INTO user_ranks (user_id, season_id, rank, duel_pass_level, duel_pass_xp)
    VALUES (p_user_id, v_season_id, v_new_rank, v_duel_pass_level, v_duel_pass_xp);

    v_result := jsonb_build_object(
      'success', true,
      'rank_changed', true,
      'new_rank', v_new_rank,
      'level', v_duel_pass_level,
      'xp', v_duel_pass_xp
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. RLS ПОЛИТИКИ
-- ============================================

ALTER TABLE public.rank_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

-- Все могут читать награды рангов
CREATE POLICY "Anyone can view rank rewards"
  ON public.rank_rewards FOR SELECT
  USING (true);

-- Пользователи могут видеть свои ранги и ранги других
CREATE POLICY "Anyone can view user ranks"
  ON public.user_ranks FOR SELECT
  USING (true);

-- Service role может вставлять и обновлять ранги
CREATE POLICY "Service role can manage ranks"
  ON public.user_ranks FOR ALL
  WITH CHECK (true);

-- ============================================
-- 6. SEED DATA - Награды по рангам
-- ============================================

INSERT INTO public.rank_rewards (rank, name_ru, name_es, description_ru, description_es, free_reward, premium_reward, title_ru, title_es, min_level, max_level) VALUES
('rookie', 'Новичок', 'Novato', 'Начальный ранг для новых игроков', 'Rango inicial para nuevos jugadores', 
 '{"type": "frame", "id": "frame_rookie"}', 
 '{"type": "frame", "id": "frame_rookie_premium"}',
 'Новичок', 'Novato', 1, 5),

('bronze', 'Бронза', 'Bronce', 'Достиг уровня 6 в Duel Pass', 'Alcanzó el nivel 6 en Duel Pass',
 '{"type": "frame", "id": "frame_bronze"}',
 '{"type": "frame", "id": "frame_bronze_premium"}',
 'Бронзовый водитель', 'Conductor de Bronce', 6, 10),

('silver', 'Серебро', 'Plata', 'Достиг уровня 11 в Duel Pass', 'Alcanzó el nivel 11 en Duel Pass',
 '{"type": "frame", "id": "frame_silver"}',
 '{"type": "frame", "id": "frame_silver_premium"}',
 'Серебряный водитель', 'Conductor de Plata', 11, 15),

('gold', 'Золото', 'Oro', 'Достиг уровня 16 в Duel Pass', 'Alcanzó el nivel 16 en Duel Pass',
 '{"type": "skin", "id": "skin_gold_basic"}',
 '{"type": "frame", "id": "frame_gold_premium"}',
 'Золотой водитель', 'Conductor de Oro', 16, 20),

('platinum', 'Платина', 'Platino', 'Достиг уровня 21 в Duel Pass', 'Alcanzó el nivel 21 en Duel Pass',
 '{"type": "skin", "id": "skin_platinum_rare"}',
 '{"type": "skin", "id": "skin_platinum_premium"}',
 'Платиновый водитель', 'Conductor de Platino', 21, 25),

('diamond', 'Алмаз', 'Diamante', 'Достиг уровня 26 в Duel Pass', 'Alcanzó el nivel 26 en Duel Pass',
 '{"type": "skin", "id": "skin_diamond_epic"}',
 '{"type": "skin", "id": "skin_diamond_premium", "title": "diamond_champion"}',
 'Алмазный водитель', 'Conductor de Diamante', 26, 30),

('master', 'Мастер', 'Maestro', 'Топ 100 игроков по SP в сезоне', 'Top 100 jugadores por SP en la temporada',
 '{"type": "title", "id": "title_master_season"}',
 '{"type": "skin", "id": "skin_master_legendary", "title": "title_master_champion"}',
 'Мастер сезона', 'Maestro de Temporada', 30, NULL)
ON CONFLICT (rank) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  free_reward = EXCLUDED.free_reward,
  premium_reward = EXCLUDED.premium_reward,
  title_ru = EXCLUDED.title_ru,
  title_es = EXCLUDED.title_es,
  min_level = EXCLUDED.min_level,
  max_level = EXCLUDED.max_level;

-- ============================================
-- 7. ГРАНТЫ
-- ============================================

GRANT SELECT ON public.rank_rewards TO authenticated;
GRANT SELECT ON public.rank_rewards TO anon;
GRANT SELECT ON public.user_ranks TO authenticated;
GRANT SELECT ON public.user_ranks TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_rank(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_user_rank(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_rank(UUID, INTEGER, BOOLEAN) TO anon;

COMMENT ON TABLE public.rank_rewards IS 'Награды за достижение рангов в Duel Pass';
COMMENT ON TABLE public.user_ranks IS 'Текущие ранги пользователей по сезонам';
COMMENT ON FUNCTION public.get_user_rank(UUID, INTEGER) IS 'Рассчитывает ранг пользователя на основе уровня Duel Pass';
COMMENT ON FUNCTION public.update_user_rank(UUID, INTEGER, BOOLEAN) IS 'Обновляет ранг пользователя для текущего сезона';

