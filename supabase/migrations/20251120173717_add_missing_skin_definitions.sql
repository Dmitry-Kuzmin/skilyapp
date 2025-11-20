-- Добавляем недостающие определения скинов, бейджей и стикеров, которые используются в наградах
-- но отсутствуют в таблицах definitions

-- Скины
INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, metadata) VALUES
('frame_novice', 'Frame Novice', 'Frame Novato', 'Новый образ профиля', 'Nueva apariencia de perfil', 'common', false, '{"color": "#10b981", "effect": "shine"}'),
('frame_season_1_premium', 'Frame Season 1 Premium', 'Frame Temporada 1 Premium', 'Новый образ профиля', 'Nueva apariencia de perfil', 'epic', true, '{"color": "#fbbf24", "effect": "sparkle", "animated": true}'),
('avatar_basic', 'Базовый', 'Básico', 'Базовый аватар', 'Avatar básico', 'common', false, '{"color": "#6366f1"}'),
('avatar_epic', 'Эпический', 'Épico', 'Эпический аватар', 'Avatar épico', 'epic', true, '{"color": "#a855f7", "effect": "sparkle"}'),
('frame_1', 'Frame 1', 'Frame 1', 'Новый образ профиля', 'Nueva apariencia de perfil', 'common', false, '{"color": "#3b82f6"}'),
('frame_epic', 'Frame Epic', 'Frame Épico', 'Эпический образ профиля', 'Apariencia épica de perfil', 'epic', true, '{"color": "#8b5cf6", "effect": "sparkle"}'),
('skin_avatar_premium', 'Avatar Premium', 'Avatar Premium', 'Премиум аватар', 'Avatar premium', 'epic', true, '{"color": "#fbbf24", "effect": "sparkle", "animated": true}')
ON CONFLICT (id) DO UPDATE
SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  is_premium = EXCLUDED.is_premium,
  metadata = EXCLUDED.metadata;

-- Бейджи сезона
INSERT INTO public.badge_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('season_1_silver', 'Серебро Сезона 1', 'Plata Temporada 1', 'Достиг уровня 30 в Duel Pass Сезона 1', 'Alcanzó el nivel 30 en Duel Pass Temporada 1', 'rare', 'seasonal', false, '{"icon": "trophy", "color": "#94a3b8"}'),
('badge_season_1_gold', 'Золото Сезона 1', 'Oro Temporada 1', 'Достиг уровня 10 Premium в Duel Pass Сезона 1', 'Alcanzó el nivel 10 Premium en Duel Pass Temporada 1', 'epic', 'seasonal', true, '{"icon": "trophy", "color": "#fbbf24"}'),
('badge_season_1_platinum', 'Платина Сезона 1', 'Platino Temporada 1', 'Достиг уровня 30 Premium в Duel Pass Сезона 1', 'Alcanzó el nivel 30 Premium en Duel Pass Temporada 1', 'legendary', 'seasonal', true, '{"icon": "trophy", "color": "#e5e7eb", "animated": true}')
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

-- Стикеры
INSERT INTO public.sticker_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('sticker_traffic_light', '🚦 Светофор', '🚦 Semáforo', 'Стикер светофора для дуэлей', 'Pegatina de semáforo para duelos', 'common', 'emoji', false, '{"emoji": "🚦"}')
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

