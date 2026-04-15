-- ============================================================
-- FIX LEADERBOARD: sort by season_points (current season SP)
-- instead of eternal duel_pass_level / duel_pass_xp
-- ============================================================

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
  v_season_id       INTEGER;
  v_user_sp         INTEGER;
  v_user_level      INTEGER;      -- season level
  v_user_xp         INTEGER;      -- eternal XP (kept for compatibility)
  v_user_level_etc  INTEGER;      -- eternal level (kept for compatibility)
  v_country_code    TEXT;
  v_user_position   INTEGER;
  v_total_players   INTEGER;
  v_neighbors       JSONB[];
  v_neighbor_record RECORD;
  v_filtered_user_ids UUID[];
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

  -- Получаем ID активного сезона
  SELECT id INTO v_season_id
  FROM duel_pass_seasons
  WHERE is_active = true
  ORDER BY season_number DESC
  LIMIT 1;

  -- Получаем данные пользователя: SP текущего сезона + вечные поля
  SELECT
    COALESCE(usp.season_points, 0),
    COALESCE(usp.level, 0),
    COALESCE(p.duel_pass_xp, 0),
    COALESCE(p.duel_pass_level, 1),
    p.language_code
  INTO
    v_user_sp,
    v_user_level,
    v_user_xp,
    v_user_level_etc,
    v_country_code
  FROM profiles p
  LEFT JOIN user_season_progress usp
    ON usp.user_id = p.id AND usp.season_id = v_season_id
  WHERE p.id = p_user_id;

  IF v_user_sp IS NULL THEN
    v_user_sp    := 0;
    v_user_level := 0;
  END IF;

  -- ── Фильтрация пользователей ─────────────────────────────────────────────
  IF p_filter_type = 'friends' THEN
    SELECT ARRAY_AGG(DISTINCT friend_id) INTO v_filtered_user_ids
    FROM (
      -- Реферальная система
      SELECT referred_id AS friend_id
      FROM referrals WHERE referrer_id = p_user_id
      UNION
      SELECT referrer_id AS friend_id
      FROM referrals WHERE referred_id = p_user_id
      UNION
      -- Завершённые дуэли
      SELECT DISTINCT dp2.user_id AS friend_id
      FROM duel_players dp1
      INNER JOIN duel_players dp2 ON dp1.duel_id = dp2.duel_id
      INNER JOIN duels d ON dp1.duel_id = d.id
      WHERE dp1.user_id = p_user_id
        AND dp2.user_id != p_user_id
        AND dp2.user_id IS NOT NULL
        AND dp2.is_bot = false
        AND d.status = 'finished'
      UNION
      -- Telegram чаты
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

    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'no_friends',
        'position', NULL,
        'total_players', 0,
        'neighbors', '[]'::jsonb
      );
    END IF;

    v_filtered_user_ids := array_append(v_filtered_user_ids, p_user_id);

  ELSIF p_filter_type = 'country' THEN
    IF p_filter_value IS NULL THEN
      p_filter_value := v_country_code;
    END IF;

    SELECT ARRAY_AGG(id) INTO v_filtered_user_ids
    FROM profiles
    WHERE language_code = p_filter_value;

    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'no_players_in_country',
        'position', NULL,
        'total_players', 0,
        'neighbors', '[]'::jsonb
      );
    END IF;
  END IF;

  -- ── Позиция пользователя по season_points ───────────────────────────────
  -- Позиция = количество игроков с БОЛЬШИМ SP + 1
  -- Считаем только тех, у кого season_points > 0 (реальные участники)
  IF v_filtered_user_ids IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM user_season_progress usp
    WHERE usp.season_id = v_season_id
      AND usp.user_id   = ANY(v_filtered_user_ids)
      AND usp.user_id  != p_user_id
      AND usp.season_points > v_user_sp;

    SELECT COUNT(*) INTO v_total_players
    FROM user_season_progress usp
    WHERE usp.season_id   = v_season_id
      AND usp.user_id     = ANY(v_filtered_user_ids)
      AND usp.season_points > 0;
  ELSE
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM user_season_progress usp
    WHERE usp.season_id  = v_season_id
      AND usp.user_id   != p_user_id
      AND usp.season_points > v_user_sp;

    SELECT COUNT(*) INTO v_total_players
    FROM user_season_progress usp
    WHERE usp.season_id    = v_season_id
      AND usp.season_points > 0;
  END IF;

  -- Если у пользователя нет SP, его позиция = total_players + 1
  IF v_user_sp = 0 THEN
    v_user_position := v_total_players + 1;
  END IF;

  -- ── Соседи (игроки рядом в рейтинге) ────────────────────────────────────
  IF v_filtered_user_ids IS NOT NULL THEN
    FOR v_neighbor_record IN
      WITH ranked AS (
        SELECT
          usp.user_id,
          usp.season_points,
          usp.level AS season_level,
          p.first_name,
          p.username,
          p.photo_url,
          p.duel_pass_level,
          p.duel_pass_xp,
          ROW_NUMBER() OVER (ORDER BY usp.season_points DESC, usp.level DESC) AS position
        FROM user_season_progress usp
        INNER JOIN profiles p ON p.id = usp.user_id
        WHERE usp.season_id    = v_season_id
          AND usp.user_id      = ANY(v_filtered_user_ids)
          AND usp.season_points > 0
      )
      SELECT *
      FROM ranked
      WHERE position BETWEEN GREATEST(1, v_user_position - p_neighbors_count)
                    AND     LEAST(v_total_players, v_user_position + p_neighbors_count)
      ORDER BY position
    LOOP
      v_neighbors := array_append(v_neighbors, jsonb_build_object(
        'user_id',          v_neighbor_record.user_id,
        'position',         v_neighbor_record.position,
        'season_points',    v_neighbor_record.season_points,
        'duel_pass_level',  v_neighbor_record.season_level,
        'duel_pass_xp',     v_neighbor_record.duel_pass_xp,
        'profile', jsonb_build_object(
          'first_name', v_neighbor_record.first_name,
          'username',   v_neighbor_record.username,
          'photo_url',  v_neighbor_record.photo_url
        )
      ));
    END LOOP;
  ELSE
    FOR v_neighbor_record IN
      WITH ranked AS (
        SELECT
          usp.user_id,
          usp.season_points,
          usp.level AS season_level,
          p.first_name,
          p.username,
          p.photo_url,
          p.duel_pass_level,
          p.duel_pass_xp,
          ROW_NUMBER() OVER (ORDER BY usp.season_points DESC, usp.level DESC) AS position
        FROM user_season_progress usp
        INNER JOIN profiles p ON p.id = usp.user_id
        WHERE usp.season_id    = v_season_id
          AND usp.season_points > 0
      )
      SELECT *
      FROM ranked
      WHERE position BETWEEN GREATEST(1, v_user_position - p_neighbors_count)
                    AND     LEAST(v_total_players, v_user_position + p_neighbors_count)
      ORDER BY position
    LOOP
      v_neighbors := array_append(v_neighbors, jsonb_build_object(
        'user_id',          v_neighbor_record.user_id,
        'position',         v_neighbor_record.position,
        'season_points',    v_neighbor_record.season_points,
        'duel_pass_level',  v_neighbor_record.season_level,
        'duel_pass_xp',     v_neighbor_record.duel_pass_xp,
        'profile', jsonb_build_object(
          'first_name', v_neighbor_record.first_name,
          'username',   v_neighbor_record.username,
          'photo_url',  v_neighbor_record.photo_url
        )
      ));
    END LOOP;
  END IF;

  v_neighbors_jsonb := '[]'::jsonb;
  IF array_length(v_neighbors, 1) > 0 THEN
    SELECT jsonb_agg(elem) INTO v_neighbors_jsonb
    FROM unnest(v_neighbors) AS elem;
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'position',      v_user_position,
    'total_players', v_total_players,
    'user_data', jsonb_build_object(
      'user_id',         p_user_id,
      'season_points',   v_user_sp,
      'duel_pass_level', v_user_level,
      'duel_pass_xp',    v_user_xp
    ),
    'neighbors', COALESCE(v_neighbors_jsonb, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_leaderboard_position(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_leaderboard_position(UUID, INTEGER, TEXT, TEXT) TO anon;

COMMENT ON FUNCTION get_user_leaderboard_position IS
  'Позиция пользователя в лидерборде текущего сезона, сортировка по season_points из user_season_progress';
