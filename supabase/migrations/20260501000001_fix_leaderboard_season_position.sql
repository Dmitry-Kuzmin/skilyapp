-- Fix get_user_leaderboard_position: use season points (SP) as ranking metric
-- instead of duel_pass_level. Only count users who actually participated in
-- the current season (have user_season_progress entry with season_points > 0).

CREATE OR REPLACE FUNCTION get_user_leaderboard_position(
  p_user_id UUID,
  p_neighbors_count INTEGER DEFAULT 5,
  p_filter_type TEXT DEFAULT 'global',
  p_filter_value TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_position INTEGER;
  v_user_sp INTEGER;
  v_user_level INTEGER;
  v_total_players INTEGER;
  v_neighbors JSONB[];
  v_neighbor_record RECORD;
  v_filtered_user_ids UUID[];
  v_country_code TEXT;
  v_neighbors_jsonb JSONB;
  v_active_season_id INTEGER;
BEGIN
  -- Валидация типа фильтра
  IF p_filter_type NOT IN ('global', 'friends', 'country') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_filter_type',
      'message', 'Filter type must be one of: global, friends, country'
    );
  END IF;

  -- Получаем активный сезон
  SELECT id INTO v_active_season_id
  FROM duel_pass_seasons
  WHERE is_active = true
  ORDER BY season_number DESC
  LIMIT 1;

  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'no_active_season',
      'position', NULL,
      'total_players', 0,
      'neighbors', '[]'::jsonb
    );
  END IF;

  -- Получаем данные пользователя по текущему сезону
  SELECT
    COALESCE(usp.season_points, 0),
    COALESCE(usp.level, 1),
    p.language_code
  INTO
    v_user_sp,
    v_user_level,
    v_country_code
  FROM profiles p
  LEFT JOIN user_season_progress usp
    ON usp.user_id = p.id AND usp.season_id = v_active_season_id
  WHERE p.id = p_user_id;

  -- Определяем фильтр пользователей
  IF p_filter_type = 'friends' THEN
    SELECT ARRAY_AGG(DISTINCT friend_id) INTO v_filtered_user_ids
    FROM (
      SELECT referred_id AS friend_id FROM referrals WHERE referrer_id = p_user_id
      UNION
      SELECT referrer_id AS friend_id FROM referrals WHERE referred_id = p_user_id
    ) AS friends;

    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false, 'message', 'no_friends',
        'position', NULL, 'total_players', 0, 'neighbors', '[]'::jsonb
      );
    END IF;

    v_filtered_user_ids := array_append(v_filtered_user_ids, p_user_id);

  ELSIF p_filter_type = 'country' THEN
    IF p_filter_value IS NULL THEN
      p_filter_value := v_country_code;
    END IF;

    SELECT ARRAY_AGG(DISTINCT p.id) INTO v_filtered_user_ids
    FROM profiles p
    WHERE p.language_code = p_filter_value;

    IF v_filtered_user_ids IS NULL OR array_length(v_filtered_user_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false, 'message', 'no_players_in_country',
        'position', NULL, 'total_players', 0, 'neighbors', '[]'::jsonb
      );
    END IF;
  ELSE
    v_filtered_user_ids := NULL;
  END IF;

  -- Рассчитываем позицию пользователя среди участников сезона (season_points > 0)
  IF v_filtered_user_ids IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM user_season_progress usp
    WHERE usp.season_id = v_active_season_id
      AND usp.user_id = ANY(v_filtered_user_ids)
      AND usp.user_id != p_user_id
      AND usp.season_points > 0
      AND (
        usp.season_points > v_user_sp
        OR (usp.season_points = v_user_sp AND usp.level > v_user_level)
      );

    SELECT COUNT(*) INTO v_total_players
    FROM user_season_progress usp
    WHERE usp.season_id = v_active_season_id
      AND usp.user_id = ANY(v_filtered_user_ids)
      AND usp.season_points > 0;
  ELSE
    SELECT COUNT(*) + 1 INTO v_user_position
    FROM user_season_progress usp
    WHERE usp.season_id = v_active_season_id
      AND usp.user_id != p_user_id
      AND usp.season_points > 0
      AND (
        usp.season_points > v_user_sp
        OR (usp.season_points = v_user_sp AND usp.level > v_user_level)
      );

    SELECT COUNT(*) INTO v_total_players
    FROM user_season_progress usp
    WHERE usp.season_id = v_active_season_id
      AND usp.season_points > 0;
  END IF;

  -- Если у самого пользователя SP = 0 — он не участник сезона
  IF v_user_sp = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'position', NULL,
      'total_players', v_total_players,
      'message', 'not_participated',
      'user_data', jsonb_build_object(
        'user_id', p_user_id,
        'season_points', 0,
        'level', v_user_level
      ),
      'neighbors', '[]'::jsonb
    );
  END IF;

  -- Получаем соседей по рейтингу (участники с season_points > 0, сортировка по SP)
  v_neighbors := ARRAY[]::JSONB[];

  FOR v_neighbor_record IN
    WITH ranked_users AS (
      SELECT
        usp.user_id,
        p.first_name,
        p.username,
        p.photo_url,
        usp.season_points,
        usp.level,
        ROW_NUMBER() OVER (
          ORDER BY usp.season_points DESC, usp.level DESC
        ) AS position
      FROM user_season_progress usp
      JOIN profiles p ON p.id = usp.user_id
      WHERE usp.season_id = v_active_season_id
        AND usp.season_points > 0
        AND (v_filtered_user_ids IS NULL OR usp.user_id = ANY(v_filtered_user_ids))
    )
    SELECT *
    FROM ranked_users
    WHERE position BETWEEN GREATEST(1, v_user_position - p_neighbors_count)
                  AND LEAST(v_total_players, v_user_position + p_neighbors_count)
    ORDER BY position
  LOOP
    v_neighbors := array_append(v_neighbors, jsonb_build_object(
      'user_id', v_neighbor_record.user_id,
      'position', v_neighbor_record.position,
      'profile', jsonb_build_object(
        'first_name', v_neighbor_record.first_name,
        'username', v_neighbor_record.username,
        'photo_url', v_neighbor_record.photo_url
      ),
      'season_points', v_neighbor_record.season_points,
      'duel_pass_level', v_neighbor_record.level
    ));
  END LOOP;

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
      'season_points', v_user_sp,
      'level', v_user_level
    ),
    'neighbors', COALESCE(v_neighbors_jsonb, '[]'::jsonb)
  );
END;
$$;
