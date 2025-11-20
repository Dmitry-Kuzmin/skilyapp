-- =====================================================
-- EXTEND FRIENDS DEFINITION: Добавление друзей через дуэли и Telegram контакты
-- =====================================================

-- Обновляем функцию get_user_leaderboard_position для поддержки новых источников друзей
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(
  p_user_id UUID,
  p_neighbors_count INTEGER DEFAULT 5,
  p_filter_type TEXT DEFAULT 'global',
  p_filter_value TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_position INTEGER;
  v_user_score INTEGER;
  v_user_xp INTEGER;
  v_user_level INTEGER;
  v_total_players INTEGER;
  v_neighbors JSONB[];
  v_neighbor_record RECORD;
  v_filtered_user_ids UUID[];
  v_country_code TEXT;
  v_neighbors_jsonb JSONB;
BEGIN
  -- Валидация типа фильтра
  IF p_filter_type NOT IN ('global', 'friends', 'country') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_filter_type',
      'message', 'Filter type must be one of: global, friends, country'
    );
  END IF;

  -- Получаем данные пользователя
  SELECT 
    duel_pass_level,
    duel_pass_xp,
    language_code
  INTO 
    v_user_level,
    v_user_xp,
    v_country_code
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_level IS NULL THEN
    v_user_level := 1;
    v_user_xp := 0;
  END IF;

  -- Определяем фильтр пользователей
  IF p_filter_type = 'friends' THEN
    -- Получаем список друзей из ВСЕХ источников:
    -- 1. Реферальная система (referrals)
    -- 2. Дуэли (duel_players)
    SELECT ARRAY_AGG(DISTINCT friend_id) INTO v_filtered_user_ids
    FROM (
      -- Друзья из реферальной системы
      SELECT referred_id AS friend_id
      FROM referrals
      WHERE referrer_id = p_user_id
      UNION
      SELECT referrer_id AS friend_id
      FROM referrals
      WHERE referred_id = p_user_id
      
      UNION
      
      -- Друзья из дуэлей (те, с кем играл)
      -- Находим всех пользователей, с которыми был в одной дуэли
      SELECT DISTINCT dp2.user_id AS friend_id
      FROM duel_players dp1
      INNER JOIN duel_players dp2 ON dp1.duel_id = dp2.duel_id
      INNER JOIN duels d ON dp1.duel_id = d.id
      WHERE dp1.user_id = p_user_id
        AND dp2.user_id != p_user_id
        AND dp2.user_id IS NOT NULL  -- Исключаем ботов
        AND dp2.is_bot = false
        AND d.status = 'finished'  -- Только завершённые дуэли
      
      UNION
      
      -- Друзья из Telegram групп/чатов
      -- Находим пользователей, которые состоят в тех же группах
      SELECT cm2.user_id AS friend_id
      FROM telegram_chat_members cm1
      INNER JOIN telegram_chat_members cm2 
        ON cm1.chat_id = cm2.chat_id
        AND cm1.user_id != cm2.user_id
      WHERE cm1.user_id = p_user_id
        AND cm1.is_active = true
        AND cm2.is_active = true
        AND cm2.user_id IS NOT NULL
    ) AS friends
    WHERE friend_id IS NOT NULL;
    
    -- Если нет друзей, возвращаем пустой результат
    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'no_friends',
        'position', NULL,
        'total_players', 0,
        'neighbors', '[]'::jsonb
      );
    END IF;
    
    -- Добавляем самого пользователя
    v_filtered_user_ids := array_append(v_filtered_user_ids, p_user_id);
    
  ELSIF p_filter_type = 'country' THEN
    -- Фильтр по стране (используем language_code как приблизительный индикатор)
    IF p_filter_value IS NULL THEN
      p_filter_value := v_country_code;
    END IF;
    
    SELECT ARRAY_AGG(id) INTO v_filtered_user_ids
    FROM profiles
    WHERE language_code = p_filter_value
      AND duel_pass_level IS NOT NULL;
    
    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'no_players_in_country',
        'position', NULL,
        'total_players', 0,
        'neighbors', '[]'::jsonb
      );
    END IF;
  ELSE
    -- Глобальный фильтр - все пользователи
    v_filtered_user_ids := NULL;
  END IF;

  -- Рассчитываем позицию пользователя
  IF v_filtered_user_ids IS NOT NULL THEN
    -- Фильтрованный рейтинг
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM profiles
    WHERE id = ANY(v_filtered_user_ids)
      AND id != p_user_id
      AND duel_pass_level IS NOT NULL
      AND (
        duel_pass_level > v_user_level
        OR (duel_pass_level = v_user_level AND duel_pass_xp > v_user_xp)
      );
    
    SELECT COUNT(*) INTO v_total_players
    FROM profiles
    WHERE id = ANY(v_filtered_user_ids)
      AND duel_pass_level IS NOT NULL;
  ELSE
    -- Глобальный рейтинг
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM profiles
    WHERE id != p_user_id
      AND duel_pass_level IS NOT NULL
      AND (
        duel_pass_level > v_user_level
        OR (duel_pass_level = v_user_level AND duel_pass_xp > v_user_xp)
      );
    
    SELECT COUNT(*) INTO v_total_players
    FROM profiles
    WHERE duel_pass_level IS NOT NULL;
  END IF;

  -- Получаем соседей (игроков выше и ниже)
  IF v_filtered_user_ids IS NOT NULL THEN
    -- Фильтрованный список соседей
    FOR v_neighbor_record IN
      WITH ranked_users AS (
        SELECT 
          id,
          first_name,
          username,
          photo_url,
          duel_pass_level,
          duel_pass_xp,
          ROW_NUMBER() OVER (
            ORDER BY duel_pass_level DESC, duel_pass_xp DESC
          ) AS position
        FROM profiles
        WHERE id = ANY(v_filtered_user_ids)
          AND duel_pass_level IS NOT NULL
      )
      SELECT *
      FROM ranked_users
      WHERE position BETWEEN GREATEST(1, v_user_position - p_neighbors_count)
                    AND LEAST(v_total_players, v_user_position + p_neighbors_count)
      ORDER BY position
    LOOP
      v_neighbors := array_append(v_neighbors, jsonb_build_object(
        'user_id', v_neighbor_record.id,
        'position', v_neighbor_record.position,
        'profile', jsonb_build_object(
          'first_name', v_neighbor_record.first_name,
          'username', v_neighbor_record.username,
          'photo_url', v_neighbor_record.photo_url
        ),
        'duel_pass_level', v_neighbor_record.duel_pass_level,
        'duel_pass_xp', v_neighbor_record.duel_pass_xp
      ));
    END LOOP;
  ELSE
    -- Глобальный список соседей
    FOR v_neighbor_record IN
      WITH ranked_users AS (
        SELECT 
          id,
          first_name,
          username,
          photo_url,
          duel_pass_level,
          duel_pass_xp,
          ROW_NUMBER() OVER (
            ORDER BY duel_pass_level DESC, duel_pass_xp DESC
          ) AS position
        FROM profiles
        WHERE duel_pass_level IS NOT NULL
      )
      SELECT *
      FROM ranked_users
      WHERE position BETWEEN GREATEST(1, v_user_position - p_neighbors_count)
                    AND LEAST(v_total_players, v_user_position + p_neighbors_count)
      ORDER BY position
    LOOP
      v_neighbors := array_append(v_neighbors, jsonb_build_object(
        'user_id', v_neighbor_record.id,
        'position', v_neighbor_record.position,
        'profile', jsonb_build_object(
          'first_name', v_neighbor_record.first_name,
          'username', v_neighbor_record.username,
          'photo_url', v_neighbor_record.photo_url
        ),
        'duel_pass_level', v_neighbor_record.duel_pass_level,
        'duel_pass_xp', v_neighbor_record.duel_pass_xp
      ));
    END LOOP;
  END IF;

  -- Преобразуем массив JSONB в JSONB массив
  v_neighbors_jsonb := '[]'::jsonb;
  
  IF array_length(v_neighbors, 1) > 0 THEN
    SELECT jsonb_agg(elem) INTO v_neighbors_jsonb
    FROM unnest(v_neighbors) AS elem;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'position', v_user_position,
    'total_players', v_total_players,
    'user_data', jsonb_build_object(
      'user_id', p_user_id,
      'duel_pass_level', v_user_level,
      'duel_pass_xp', v_user_xp
    ),
    'neighbors', COALESCE(v_neighbors_jsonb, '[]'::jsonb)
  );
END;
$$;

-- Создаём индексы для оптимизации поиска друзей из дуэлей
CREATE INDEX IF NOT EXISTS idx_duel_players_user_duel 
  ON public.duel_players(user_id, duel_id)
  WHERE user_id IS NOT NULL AND is_bot = false;

CREATE INDEX IF NOT EXISTS idx_duels_status_finished
  ON public.duels(status, finished_at)
  WHERE status = 'finished';

COMMENT ON FUNCTION get_user_leaderboard_position IS 'Получает позицию пользователя в лидерборде с соседями. Поддерживает фильтры: global, friends (из referrals + дуэлей), country';

COMMENT ON INDEX idx_duel_players_user_duel IS 'Оптимизация поиска друзей из дуэлей';
COMMENT ON INDEX idx_duels_status_finished IS 'Оптимизация фильтрации завершённых дуэлей';

