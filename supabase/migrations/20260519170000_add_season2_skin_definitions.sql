-- Add Season 2 skin definitions that were missing from skin_definitions table.
-- Their absence caused duel-pass-claim to return 500 (FK violation on user_skins insert).
INSERT INTO skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, is_animated, category, metadata) VALUES
(
  'frame_storm',
  'Frame Storm', 'Frame Storm',
  'Рамка сезона 2 — буря скорости',
  'Marco de temporada 2 — tormenta de velocidad',
  'rare', false, false, 'special',
  '{"color": "#3b82f6", "effect": "shine"}'
),
(
  'frame_season_2_premium',
  'Frame Season 2 Premium', 'Frame Season 2 Premium',
  'Эксклюзивная рамка для владельцев Premium Skily Pass',
  'Marco exclusivo para poseedores del Skily Pass Premium',
  'epic', true, true, 'special',
  '{"color": "#f59e0b", "animated": true, "effect": "sparkle"}'
),
(
  'skin_avatar_storm_gold',
  'Storm Gold', 'Storm Gold',
  'Золотая аватарка бури',
  'Avatar dorado de tormenta',
  'epic', false, false, 'elemental',
  '{"color": "#f59e0b"}'
)
ON CONFLICT (id) DO NOTHING;
