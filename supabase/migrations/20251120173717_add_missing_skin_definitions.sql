-- Добавляем недостающие определения скинов, которые используются в наградах
-- но отсутствуют в таблице skin_definitions

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

