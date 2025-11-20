-- =====================================================
-- SEED DATA: Призы для первого сезона
-- =====================================================

-- Предполагаем, что сезон с id=1 существует
-- Если нет, нужно будет создать его вручную

-- ============================================
-- ТОП-3 ПРИЗЫ
-- ============================================

-- 1 МЕСТО - Чемпион
INSERT INTO public.leaderboard_season_rewards (season_id, position, reward_type, reward_data, is_exclusive, description_ru, description_es) VALUES
(1, 1, 'skin', '{"id": "skin_champion_season_1", "auto_activate": true}', true, 'Уникальный эксклюзивный скин чемпиона', 'Skin exclusivo único del campeón'),
(1, 1, 'badge', '{"id": "badge_champion_season_1", "auto_display": true}', true, 'Бейдж чемпиона сезона', 'Insignia del campeón de temporada'),
(1, 1, 'frame', '{"id": "frame_champion_gold_season_1", "auto_activate": true}', true, 'Золотая рамка чемпиона с анимацией', 'Marco dorado del campeón con animación'),
(1, 1, 'title', '{"id": "title_champion_season_1"}', true, 'Титул "Чемпион Сезона 1"', 'Título "Campeón Temporada 1"'),
(1, 1, 'aura', '{"type": "champion", "intensity": "high", "color": "#fbbf24"}', true, 'Аура "Лучезарность чемпиона"', 'Aura "Resplandor del campeón"'),
(1, 1, 'coins', '{"amount": 500}', false, '500 монет', '500 monedas')

ON CONFLICT (season_id, position, reward_type) DO UPDATE
SET 
  reward_data = EXCLUDED.reward_data,
  is_exclusive = EXCLUDED.is_exclusive,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es;

-- 2 МЕСТО - Серебряный призёр
INSERT INTO public.leaderboard_season_rewards (season_id, position, reward_type, reward_data, is_exclusive, description_ru, description_es) VALUES
(1, 2, 'skin', '{"id": "skin_silver_runner_season_1", "auto_activate": true}', true, 'Скин серебряного призёра', 'Skin del subcampeón de plata'),
(1, 2, 'badge', '{"id": "badge_silver_runner_season_1", "auto_display": true}', true, 'Бейдж серебряного призёра', 'Insignia del subcampeón de plata'),
(1, 2, 'frame', '{"id": "frame_silver_runner_season_1", "auto_activate": true}', true, 'Серебряная рамка призёра', 'Marco plateado del subcampeón'),
(1, 2, 'title', '{"id": "title_silver_runner_season_1"}', true, 'Титул "Серебряный Призёр"', 'Título "Subcampeón Plata"'),
(1, 2, 'aura', '{"type": "silver", "intensity": "medium", "color": "#c0c0c0"}', true, 'Серебряная аура', 'Aura plateada'),
(1, 2, 'coins', '{"amount": 350}', false, '350 монет', '350 monedas')

ON CONFLICT (season_id, position, reward_type) DO UPDATE
SET 
  reward_data = EXCLUDED.reward_data,
  is_exclusive = EXCLUDED.is_exclusive,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es;

-- 3 МЕСТО - Бронзовый финалист
INSERT INTO public.leaderboard_season_rewards (season_id, position, reward_type, reward_data, is_exclusive, description_ru, description_es) VALUES
(1, 3, 'skin', '{"id": "skin_bronze_finalist_season_1", "auto_activate": true}', true, 'Скин бронзового финалиста', 'Skin del finalista de bronce'),
(1, 3, 'badge', '{"id": "badge_bronze_finalist_season_1", "auto_display": true}', true, 'Бейдж бронзового финалиста', 'Insignia del finalista de bronce'),
(1, 3, 'frame', '{"id": "frame_bronze_finalist_season_1", "auto_activate": true}', true, 'Бронзовая рамка финалиста', 'Marco de bronce del finalista'),
(1, 3, 'title', '{"id": "title_bronze_finalist_season_1"}', true, 'Титул "Бронзовый Финалист"', 'Título "Finalista Bronce"'),
(1, 3, 'aura', '{"type": "bronze", "intensity": "medium", "color": "#cd7f32"}', true, 'Бронзовая аура', 'Aura de bronce'),
(1, 3, 'coins', '{"amount": 250}', false, '250 монет', '250 monedas')

ON CONFLICT (season_id, position, reward_type) DO UPDATE
SET 
  reward_data = EXCLUDED.reward_data,
  is_exclusive = EXCLUDED.is_exclusive,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es;

-- ============================================
-- ТОП-10 ПРИЗЫ (позиции 4-10)
-- ============================================

-- Для позиций 4-10 одинаковые призы
DO $$
DECLARE
  v_position INTEGER;
BEGIN
  FOR v_position IN 4..10 LOOP
    INSERT INTO public.leaderboard_season_rewards (season_id, position, reward_type, reward_data, is_exclusive, description_ru, description_es) VALUES
    (1, v_position, 'badge', '{"id": "badge_top_10_elite_season_1", "auto_display": true}', false, 'Бейдж элиты топ-10', 'Insignia de élite top 10'),
    (1, v_position, 'frame', '{"id": "frame_elite_top_10_season_1", "auto_activate": true}', false, 'Элитная рамка топ-10', 'Marco élite top 10'),
    (1, v_position, 'title', '{"id": "title_elite_top_10_season_1"}', false, 'Титул "Элита Сезона 1"', 'Título "Élite Temporada 1"'),
    (1, v_position, 'aura', '{"type": "elite", "intensity": "low", "color": "#3b82f6"}', false, 'Элитная аура', 'Aura élite'),
    (1, v_position, 'coins', '{"amount": 100}', false, '100 монет', '100 monedas')
    ON CONFLICT (season_id, position, reward_type) DO UPDATE
    SET 
      reward_data = EXCLUDED.reward_data,
      is_exclusive = EXCLUDED.is_exclusive,
      description_ru = EXCLUDED.description_ru,
      description_es = EXCLUDED.description_es;
  END LOOP;
END $$;

