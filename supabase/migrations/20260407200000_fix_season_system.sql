-- ============================================================
-- FIX SEASON SYSTEM
-- 1. Snapshot Season 1 final stats
-- 2. Archive Season 1 to user_season_history
-- 3. Create duel_pass_season_rewards for Season 2 (id=4)
-- 4. Create leaderboard_season_rewards for Season 2 (id=4)
-- 5. Fix auto_transition_season to handle reward distribution
-- 6. Add pg_cron for automated season-end reward distribution
-- ============================================================

-- ============================================================
-- STEP 1: Snapshot final_level and final_sp for Season 1 users
-- ============================================================
UPDATE user_season_progress
SET
  final_level = level,
  final_sp    = season_points,
  updated_at  = NOW()
WHERE season_id = 1
  AND final_level IS NULL;


-- ============================================================
-- STEP 2: Archive Season 1 participants to user_season_history
-- ============================================================
INSERT INTO user_season_history (
  user_id,
  season_id,
  final_level,
  final_sp,
  premium_pass_purchased,
  total_rewards_claimed,
  created_at
)
SELECT
  usp.user_id,
  usp.season_id,
  COALESCE(usp.level, 1),
  COALESCE(usp.season_points, 0),
  COALESCE(usp.premium_pass_purchased, false),
  (
    SELECT COUNT(*)
    FROM user_claimed_rewards ucr
    WHERE ucr.user_id = usp.user_id
      AND ucr.season  = 1
  )::int,
  NOW()
FROM user_season_progress usp
WHERE usp.season_id = 1
ON CONFLICT (user_id, season_id) DO NOTHING;


-- ============================================================
-- STEP 3: Create duel_pass_season_rewards for Season 2 (id=4)
-- Theme: "Операция Буря" (storm/lightning)
-- ============================================================
INSERT INTO duel_pass_season_rewards (season_id, level, sp_required, free_reward, premium_reward)
VALUES
  (4, 1,  100,  '{"type":"coins","amount":20}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 2,  200,  null,                                    '{"type":"coins","amount":60,"id":"sticker_lightning"}'),
  (4, 3,  300,  '{"type":"coins","amount":25}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 4,  400,  null,                                    '{"type":"coins","amount":66,"id":"boost_double_coins"}'),
  (4, 5,  500,  '{"type":"skin","id":"frame_storm"}',   '{"type":"skin","id":"frame_season_2_premium","amount":null}'),
  (4, 6,  600,  '{"type":"coins","amount":30}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 7,  700,  null,                                    '{"type":"coins","amount":74,"id":"boost_mega_test"}'),
  (4, 8,  800,  '{"type":"coins","amount":34}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 9,  900,  null,                                    '{"type":"coins","amount":80,"id":"skin_avatar_storm"}'),
  (4, 10, 1000, '{"type":"coins","amount":38}',         '{"type":"badge","id":"badge_season_2_gold","amount":null}'),
  (4, 11, 1100, null,                                    '{"type":"coins","amount":86,"id":null}'),
  (4, 12, 1200, '{"type":"coins","amount":42}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 13, 1300, null,                                    '{"type":"coins","amount":92,"id":null}'),
  (4, 14, 1400, '{"type":"coins","amount":46}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 15, 1500, null,                                    '{"type":"coins","amount":98,"id":null}'),
  (4, 16, 1600, '{"type":"coins","amount":50}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 17, 1700, null,                                    '{"type":"coins","amount":104,"id":null}'),
  (4, 18, 1800, '{"type":"coins","amount":54}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 19, 1900, null,                                    '{"type":"coins","amount":110,"id":null}'),
  (4, 20, 2000, '{"type":"coins","amount":58}',         '{"type":"skin","id":"skin_avatar_storm_gold","amount":null}'),
  (4, 21, 2100, null,                                    '{"type":"coins","amount":116,"id":null}'),
  (4, 22, 2200, '{"type":"coins","amount":62}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 23, 2300, null,                                    '{"type":"coins","amount":122,"id":null}'),
  (4, 24, 2400, '{"type":"coins","amount":66}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 25, 2500, null,                                    '{"type":"coins","amount":128,"id":null}'),
  (4, 26, 2600, '{"type":"coins","amount":70}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 27, 2700, null,                                    '{"type":"coins","amount":134,"id":null}'),
  (4, 28, 2800, '{"type":"coins","amount":74}',         '{"type":"coins","amount":null,"id":null}'),
  (4, 29, 2900, null,                                    '{"type":"coins","amount":140,"id":null}'),
  (4, 30, 3000, '{"type":"badge","id":"season_2_silver"}', '{"type":"badge","id":"badge_season_2_platinum","amount":null}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- STEP 4: Create leaderboard_season_rewards for Season 2 (id=4)
-- ============================================================
INSERT INTO leaderboard_season_rewards (season_id, position, reward_type, reward_data, description_ru, description_es, is_exclusive)
VALUES
  -- Position 1 (Champion)
  (4, 1, 'skin',  '{"id":"skin_champion_season_2","auto_activate":true}',          'Уникальный эксклюзивный скин чемпиона сезона 2',      'Skin exclusivo único del campeón temporada 2',      true),
  (4, 1, 'badge', '{"id":"badge_champion_season_2","auto_display":true}',           'Бейдж чемпиона сезона 2',                             'Insignia del campeón de temporada 2',               true),
  (4, 1, 'frame', '{"id":"frame_champion_gold_season_2","auto_activate":true}',     'Золотая рамка чемпиона с анимацией',                   'Marco dorado del campeón con animación',            true),
  (4, 1, 'title', '{"id":"title_champion_season_2"}',                               'Титул "Чемпион Сезона 2"',                             'Título "Campeón Temporada 2"',                      true),
  (4, 1, 'aura',  '{"type":"champion","color":"#fbbf24","intensity":"high"}',       'Аура "Лучезарность чемпиона"',                         'Aura "Resplandor del campeón"',                     true),
  (4, 1, 'coins', '{"amount":500}',                                                  '500 монет',                                            '500 monedas',                                       false),
  -- Position 2 (Silver)
  (4, 2, 'skin',  '{"id":"skin_silver_runner_season_2","auto_activate":true}',      'Скин серебряного призёра',                             'Skin del subcampeón de plata',                      true),
  (4, 2, 'badge', '{"id":"badge_silver_runner_season_2","auto_display":true}',      'Бейдж серебряного призёра',                            'Insignia del subcampeón de plata',                  true),
  (4, 2, 'frame', '{"id":"frame_silver_runner_season_2","auto_activate":true}',     'Серебряная рамка призёра',                             'Marco plateado del subcampeón',                     true),
  (4, 2, 'title', '{"id":"title_silver_runner_season_2"}',                          'Титул "Серебряный Призёр"',                            'Título "Subcampeón Plata"',                         true),
  (4, 2, 'coins', '{"amount":300}',                                                  '300 монет',                                            '300 monedas',                                       false),
  -- Position 3 (Bronze)
  (4, 3, 'skin',  '{"id":"skin_bronze_runner_season_2","auto_activate":true}',      'Скин бронзового призёра',                              'Skin del tercer puesto',                            true),
  (4, 3, 'badge', '{"id":"badge_bronze_runner_season_2","auto_display":true}',      'Бейдж бронзового призёра',                             'Insignia del tercer puesto',                        true),
  (4, 3, 'frame', '{"id":"frame_bronze_runner_season_2","auto_activate":true}',     'Бронзовая рамка призёра',                              'Marco de bronce del tercer puesto',                 true),
  (4, 3, 'title', '{"id":"title_bronze_runner_season_2"}',                          'Титул "Бронзовый Призёр"',                             'Título "Tercer Puesto Bronce"',                     true),
  (4, 3, 'coins', '{"amount":200}',                                                  '200 монет',                                            '200 monedas',                                       false),
  -- Positions 4-10 (Top-10)
  (4, 4,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 4,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 5,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 5,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 6,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 6,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 7,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 7,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 8,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 8,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 9,  'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 9,  'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false),
  (4, 10, 'badge', '{"id":"badge_top10_season_2","auto_display":true}',             'Бейдж топ-10 сезона 2',                                'Insignia top 10 temporada 2',                       false),
  (4, 10, 'coins', '{"amount":150}',                                                 '150 монет',                                            '150 monedas',                                       false)
ON CONFLICT DO NOTHING;


-- ============================================================
-- STEP 5: Fix auto_transition_season to set final_level/final_sp
-- and archive season participants before deactivating.
-- This replaces the existing function with an improved version.
-- ============================================================
DROP FUNCTION IF EXISTS auto_transition_season();
CREATE OR REPLACE FUNCTION auto_transition_season()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ended_seasons     text   := '';
  v_activated_seasons text   := '';
  v_season            RECORD;
BEGIN
  -- 1. Snapshot + archive participants of seasons that just ended
  FOR v_season IN
    SELECT id
    FROM duel_pass_seasons
    WHERE is_active = true
      AND end_date  < NOW()
  LOOP
    -- Snapshot final stats
    UPDATE user_season_progress
    SET final_level = level,
        final_sp    = season_points,
        updated_at  = NOW()
    WHERE season_id  = v_season.id
      AND final_level IS NULL;

    -- Archive to history
    INSERT INTO user_season_history (
      user_id, season_id, final_level, final_sp,
      premium_pass_purchased, total_rewards_claimed, created_at
    )
    SELECT
      usp.user_id,
      usp.season_id,
      COALESCE(usp.level, 1),
      COALESCE(usp.season_points, 0),
      COALESCE(usp.premium_pass_purchased, false),
      (SELECT COUNT(*) FROM user_claimed_rewards ucr
       WHERE ucr.user_id = usp.user_id AND ucr.season = usp.season_id)::int,
      NOW()
    FROM user_season_progress usp
    WHERE usp.season_id = v_season.id
    ON CONFLICT (user_id, season_id) DO NOTHING;

    -- Deactivate the season
    UPDATE duel_pass_seasons
    SET is_active = false
    WHERE id = v_season.id;

    v_ended_seasons := array_append(v_ended_seasons, v_season.id);
  END LOOP;

  -- 2. Activate the next scheduled season
  FOR v_season IN
    SELECT id
    FROM duel_pass_seasons
    WHERE is_active   = false
      AND start_date <= NOW()
      AND end_date    > NOW()
    ORDER BY start_date
    LIMIT 1
  LOOP
    UPDATE duel_pass_seasons
    SET is_active = true
    WHERE id = v_season.id;

    v_activated_seasons := array_append(v_activated_seasons, v_season.id);
  END LOOP;

  RETURN jsonb_build_object(
    'ended_seasons',     v_ended_seasons,
    'activated_seasons', v_activated_seasons,
    'run_at',            NOW()
  );
END;
$$;


-- ============================================================
-- STEP 6: Manually distribute Season 1 leaderboard rewards
-- (top players by season_points, then duel_pass_level)
-- ============================================================
DO $$
DECLARE
  v_player   RECORD;
  v_reward   RECORD;
  v_position int := 0;
  v_result   jsonb;
  v_amount   int;
BEGIN
  -- Only run if season 1 rewards haven't been distributed yet
  IF (SELECT COUNT(*) FROM user_leaderboard_rewards WHERE season_id = 1) > 0 THEN
    RAISE NOTICE 'Season 1 rewards already distributed, skipping';
    RETURN;
  END IF;

  FOR v_player IN
    SELECT
      p.id              AS user_id,
      p.duel_pass_level,
      p.duel_pass_xp,
      COALESCE(usp.season_points, 0) AS season_points
    FROM profiles p
    LEFT JOIN user_season_progress usp
           ON usp.user_id = p.id AND usp.season_id = 1
    WHERE COALESCE(usp.season_points, 0) > 0
       OR p.duel_pass_level > 1
    ORDER BY COALESCE(usp.season_points, 0) DESC,
             p.duel_pass_level DESC,
             p.duel_pass_xp DESC
    LIMIT 10
  LOOP
    v_position := v_position + 1;

    -- claim_leaderboard_rewards upserts into user_leaderboard_rewards
    SELECT claim_leaderboard_rewards(
      v_player.user_id::uuid,
      1,
      v_position
    ) INTO v_result;

    -- Award coins directly in profiles
    FOR v_reward IN
      SELECT reward_data
      FROM leaderboard_season_rewards
      WHERE season_id   = 1
        AND position    = v_position
        AND reward_type = 'coins'
    LOOP
      v_amount := (v_reward.reward_data->>'amount')::int;
      IF v_amount IS NOT NULL AND v_amount > 0 THEN
        UPDATE profiles
        SET coins = COALESCE(coins, 0) + v_amount
        WHERE id = v_player.user_id;

        INSERT INTO transactions (user_id, transaction_type, amount, metadata)
        VALUES (
          v_player.user_id,
          'coins_earned_leaderboard',
          v_amount,
          jsonb_build_object('season_id', 1, 'position', v_position)
        );
      END IF;
    END LOOP;

    -- Create notification
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_player.user_id,
      'leaderboard_reward',
      CASE WHEN v_position <= 3
        THEN '🏆 Поздравляем! Вы заняли ' || v_position || ' место!'
        ELSE '⭐ Поздравляем! Вы вошли в топ-10!'
      END,
      CASE WHEN v_position <= 3
        THEN 'Вы получили эксклюзивные призы за ' || v_position || ' место в сезоне Операция Асфальт!'
        ELSE 'Вы получили призы за попадание в топ-10 сезона Операция Асфальт!'
      END,
      jsonb_build_object('season_id', 1, 'position', v_position)
    );

  END LOOP;

  RAISE NOTICE 'Season 1 rewards distributed for % players', v_position;
END;
$$;
