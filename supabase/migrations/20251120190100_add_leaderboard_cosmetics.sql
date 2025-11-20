-- =====================================================
-- LEADERBOARD COSMETICS: Определения косметики для призов
-- =====================================================

-- ============================================
-- 1. СКИНЫ ДЛЯ ТОП-3
-- ============================================

INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, metadata) VALUES
-- 1 место - Уникальный эксклюзивный скин
('skin_champion_season_1', 'Чемпион Сезона 1', 'Campeón Temporada 1', 'Эксклюзивный скин для чемпиона первого сезона. Больше никогда не появится!', 'Skin exclusivo para el campeón de la primera temporada. ¡Nunca más aparecerá!', 'legendary', true, '{"color": "#fbbf24", "effect": "sparkle", "animated": true, "season_exclusive": true, "season_number": 1}'),

-- 2 место - Серебряный призёр
('skin_silver_runner_season_1', 'Серебряный Призёр Сезона 1', 'Subcampeón Plata Temporada 1', 'Скин для серебряного призёра первого сезона', 'Skin para el subcampeón de plata de la primera temporada', 'epic', true, '{"color": "#c0c0c0", "effect": "shine", "animated": false, "season_exclusive": true, "season_number": 1}'),

-- 3 место - Бронзовый финалист
('skin_bronze_finalist_season_1', 'Бронзовый Финалист Сезона 1', 'Finalista Bronce Temporada 1', 'Скин для бронзового финалиста первого сезона', 'Skin para el finalista de bronce de la primera temporada', 'rare', true, '{"color": "#cd7f32", "effect": "shine", "animated": false, "season_exclusive": true, "season_number": 1}')

ON CONFLICT (id) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  is_premium = EXCLUDED.is_premium,
  metadata = EXCLUDED.metadata;

-- ============================================
-- 2. БЕЙДЖИ ДЛЯ ТОП-3 И ТОП-10
-- ============================================

INSERT INTO public.badge_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
-- 1 место
('badge_champion_season_1', '🏆 Чемпион Сезона 1', '🏆 Campeón Temporada 1', 'Награда за первое место в первом сезоне', 'Recompensa por el primer lugar en la primera temporada', 'legendary', 'seasonal', true, '{"icon": "trophy", "color": "#fbbf24", "animated": true, "season_number": 1}'),

-- 2 место
('badge_silver_runner_season_1', '🥈 Серебряный Призёр Сезона 1', '🥈 Subcampeón Plata Temporada 1', 'Награда за второе место в первом сезоне', 'Recompensa por el segundo lugar en la primera temporada', 'epic', 'seasonal', true, '{"icon": "trophy", "color": "#c0c0c0", "animated": false, "season_number": 1}'),

-- 3 место
('badge_bronze_finalist_season_1', '🥉 Бронзовый Финалист Сезона 1', '🥉 Finalista Bronce Temporada 1', 'Награда за третье место в первом сезоне', 'Recompensa por el tercer lugar en la primera temporada', 'rare', 'seasonal', true, '{"icon": "trophy", "color": "#cd7f32", "animated": false, "season_number": 1}'),

-- Топ-10
('badge_top_10_elite_season_1', '⭐ Элита Сезона 1', '⭐ Élite Temporada 1', 'Награда за попадание в топ-10 первого сезона', 'Recompensa por estar en el top 10 de la primera temporada', 'rare', 'seasonal', false, '{"icon": "star", "color": "#3b82f6", "animated": false, "season_number": 1}')

ON CONFLICT (id) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  metadata = EXCLUDED.metadata;

-- ============================================
-- 3. РАМКИ ДЛЯ ТОП-3 И ТОП-10
-- ============================================

INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, metadata) VALUES
-- 1 место - Золотая чемпионская рамка
('frame_champion_gold_season_1', 'Золотая Рамка Чемпиона', 'Marco Dorado del Campeón', 'Эксклюзивная золотая рамка для чемпиона сезона с анимацией', 'Marco dorado exclusivo para el campeón de temporada con animación', 'legendary', true, '{"color": "#fbbf24", "effect": "sparkle", "animated": true, "type": "frame", "season_number": 1}'),

-- 2 место - Серебряная рамка
('frame_silver_runner_season_1', 'Серебряная Рамка Призёра', 'Marco Plateado del Subcampeón', 'Серебряная рамка для призёра сезона', 'Marco plateado para el subcampeón de temporada', 'epic', true, '{"color": "#c0c0c0", "effect": "shine", "animated": false, "type": "frame", "season_number": 1}'),

-- 3 место - Бронзовая рамка
('frame_bronze_finalist_season_1', 'Бронзовая Рамка Финалиста', 'Marco de Bronce del Finalista', 'Бронзовая рамка для финалиста сезона', 'Marco de bronce para el finalista de temporada', 'rare', true, '{"color": "#cd7f32", "effect": "shine", "animated": false, "type": "frame", "season_number": 1}'),

-- Топ-10 - Элитная рамка
('frame_elite_top_10_season_1', 'Элитная Рамка Топ-10', 'Marco Élite Top 10', 'Рамка для элитных игроков топ-10', 'Marco para jugadores élite del top 10', 'rare', false, '{"color": "#3b82f6", "effect": "shine", "animated": false, "type": "frame", "season_number": 1}')

ON CONFLICT (id) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  is_premium = EXCLUDED.is_premium,
  metadata = EXCLUDED.metadata;

-- ============================================
-- 4. ТИТУЛЫ (храним в отдельной таблице или как badge)
-- ============================================

-- Используем badge_definitions для титулов
INSERT INTO public.badge_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('title_champion_season_1', 'Чемпион Сезона 1', 'Campeón Temporada 1', 'Титул чемпиона первого сезона', 'Título de campeón de la primera temporada', 'legendary', 'title', true, '{"icon": "crown", "color": "#fbbf24", "type": "title", "season_number": 1}'),
('title_silver_runner_season_1', 'Серебряный Призёр', 'Subcampeón Plata', 'Титул серебряного призёра', 'Título de subcampeón de plata', 'epic', 'title', true, '{"icon": "award", "color": "#c0c0c0", "type": "title", "season_number": 1}'),
('title_bronze_finalist_season_1', 'Бронзовый Финалист', 'Finalista Bronce', 'Титул бронзового финалиста', 'Título de finalista de bronce', 'rare', 'title', true, '{"icon": "award", "color": "#cd7f32", "type": "title", "season_number": 1}'),
('title_elite_top_10_season_1', 'Элита Сезона 1', 'Élite Temporada 1', 'Титул элитного игрока топ-10', 'Título de jugador élite del top 10', 'rare', 'title', false, '{"icon": "star", "color": "#3b82f6", "type": "title", "season_number": 1}')

ON CONFLICT (id) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  metadata = EXCLUDED.metadata;

-- ============================================
-- 5. АУРЫ (храним как metadata в skin_definitions)
-- ============================================

-- Ауры будут применяться как эффекты вокруг аватара
-- Используем существующую систему скинов с особыми эффектами

