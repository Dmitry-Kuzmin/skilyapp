-- =====================================================
-- ОБНОВЛЕНИЕ СКИНОВ: Добавляем визуальное разнообразие
-- =====================================================
-- Эта миграция обновляет существующие скины и добавляет новые
-- с уникальными характеристиками для лучшей различимости

-- Добавляем колонку category, если её нет (для категоризации скинов)
ALTER TABLE public.skin_definitions 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Обновляем существующие скины с более яркими характеристиками
UPDATE public.skin_definitions SET 
  metadata = '{
    "color": "#6366f1",
    "emoji": "👤",
    "pattern": "dots",
    "effect": "none"
  }'::jsonb
WHERE id = 'avatar_default';

UPDATE public.skin_definitions SET 
  metadata = '{
    "color": "#ef4444",
    "emoji": "🔥",
    "pattern": "flames",
    "effect": "fire",
    "animated": true
  }'::jsonb
WHERE id = 'avatar_fire';

UPDATE public.skin_definitions SET 
  metadata = '{
    "color": "#3b82f6",
    "emoji": "❄️",
    "pattern": "snowflakes",
    "effect": "ice",
    "animated": true
  }'::jsonb
WHERE id = 'avatar_ice';

UPDATE public.skin_definitions SET 
  metadata = '{
    "color": "#fbbf24",
    "emoji": "⭐",
    "pattern": "stars",
    "effect": "shine",
    "animated": true
  }'::jsonb
WHERE id = 'avatar_gold';

UPDATE public.skin_definitions SET 
  metadata = '{
    "color": "#a855f7",
    "emoji": "💎",
    "pattern": "diamonds",
    "effect": "sparkle",
    "animated": true
  }'::jsonb
WHERE id = 'avatar_diamond';

-- Добавляем новые уникальные скины с разнообразными характеристиками
INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, category, metadata) VALUES

-- COMMON SKINS (Обычные - доступные всем)
('avatar_forest', 'Лесной', 'Bosque', 'Аватар природы', 'Avatar de naturaleza', 'common', false, 'nature', '{
  "color": "#10b981",
  "emoji": "🌲",
  "pattern": "leaves",
  "effect": "none"
}'),

('avatar_ocean', 'Океанский', 'Océano', 'Глубины моря', 'Profundidades del mar', 'common', false, 'nature', '{
  "color": "#0ea5e9", 
  "emoji": "🌊",
  "pattern": "waves",
  "effect": "none"
}'),

('avatar_sunset', 'Закатный', 'Atardecer', 'Теплый закат', 'Cálida puesta de sol', 'common', false, 'nature', '{
  "color": "#f97316",
  "emoji": "🌅", 
  "pattern": "gradient",
  "effect": "none"
}'),

('avatar_night', 'Ночной', 'Nocturno', 'Таинственная ночь', 'Noche misteriosa', 'common', false, 'nature', '{
  "color": "#1e293b",
  "emoji": "🌙",
  "pattern": "stars",
  "effect": "none"
}'),

-- RARE SKINS (Редкие)
('avatar_thunder', 'Грозовой', 'Trueno', 'Сила грозы', 'Poder del trueno', 'rare', false, 'elemental', '{
  "color": "#8b5cf6",
  "emoji": "⚡",
  "pattern": "lightning",
  "effect": "sparkle",
  "animated": true
}'),

('avatar_toxic', 'Токсичный', 'Tóxico', 'Ядовитый аватар', 'Avatar venenoso', 'rare', false, 'elemental', '{
  "color": "#84cc16",
  "emoji": "☢️",
  "pattern": "bubbles",
  "effect": "pulse",
  "animated": true
}'),

('avatar_cyber', 'Киберпанк', 'Cyberpunk', 'Цифровое будущее', 'Futuro digital', 'rare', false, 'tech', '{
  "color": "#06b6d4",
  "emoji": "🤖",
  "pattern": "grid",
  "effect": "glitch",
  "animated": true
}'),

('avatar_cherry', 'Сакура', 'Sakura', 'Цветение сакуры', 'Florecimiento de cerezo', 'rare', false, 'nature', '{
  "color": "#ec4899",
  "emoji": "🌸",
  "pattern": "petals",
  "effect": "float",
  "animated": true
}'),

('avatar_vampire', 'Вампир', 'Vampiro', 'Ночной охотник', 'Cazador nocturno', 'rare', false, 'mystical', '{
  "color": "#dc2626",
  "emoji": "🧛",
  "pattern": "blood",
  "effect": "pulse"
}'),

('avatar_alien', 'Инопланетный', 'Alienígena', 'Из других миров', 'De otros mundos', 'rare', false, 'space', '{
  "color": "#22c55e",
  "emoji": "👽",
  "pattern": "cosmic",
  "effect": "glow"
}'),

-- EPIC SKINS (Эпические)
('avatar_phoenix', 'Феникс', 'Fénix', 'Восставший из пепла', 'Renacido de las cenizas', 'epic', false, 'legendary_creatures', '{
  "color": "#f59e0b",
  "emoji": "🔥",
  "pattern": "phoenix_feathers",
  "effect": "fire",
  "animated": true,
  "particles": true
}'),

('avatar_dragon', 'Дракон', 'Dragón', 'Древняя сила', 'Poder ancestral', 'epic', false, 'legendary_creatures', '{
  "color": "#dc2626",
  "emoji": "🐉",
  "pattern": "scales",
  "effect": "flame",
  "animated": true,
  "particles": true
}'),

('avatar_galaxy', 'Галактический', 'Galáctico', 'Бескрайний космос', 'Cosmos infinito', 'epic', false, 'space', '{
  "color": "#6366f1",
  "emoji": "🌌",
  "pattern": "stars_nebula",
  "effect": "sparkle",
  "animated": true,
  "particles": true
}'),

('avatar_aurora', 'Полярное сияние', 'Aurora', 'Северное чудо', 'Maravilla del norte', 'epic', false, 'nature', '{
  "color": "#14b8a6",
  "emoji": "✨",
  "pattern": "aurora_waves",
  "effect": "shine",
  "animated": true,
  "multicolor": true
}'),

('avatar_samurai', 'Самурай', 'Samurái', 'Воин чести', 'Guerrero de honor', 'epic', false, 'warrior', '{
  "color": "#7c2d12",
  "emoji": "⚔️",
  "pattern": "japanese",
  "effect": "slash",
  "animated": true
}'),

('avatar_ninja', 'Ниндзя', 'Ninja', 'Тень в ночи', 'Sombra en la noche', 'epic', false, 'warrior', '{
  "color": "#1e293b",
  "emoji": "🥷",
  "pattern": "smoke",
  "effect": "stealth",
  "animated": true
}'),

-- LEGENDARY SKINS (Легендарные - самые редкие)
('avatar_celestial', 'Небесный', 'Celestial', 'Божественная сущность', 'Entidad divina', 'legendary', true, 'divine', '{
  "color": "#fbbf24",
  "emoji": "👼",
  "pattern": "holy_light",
  "effect": "divine_glow",
  "animated": true,
  "particles": true,
  "aura": true
}'),

('avatar_demonic', 'Демонический', 'Demoníaco', 'Темная сила', 'Poder oscuro', 'legendary', true, 'divine', '{
  "color": "#991b1b",
  "emoji": "😈",
  "pattern": "dark_flames",
  "effect": "dark_aura",
  "animated": true,
  "particles": true,
  "aura": true
}'),

('avatar_time_lord', 'Повелитель Времени', 'Señor del Tiempo', 'Контроль времени', 'Control del tiempo', 'legendary', true, 'cosmic', '{
  "color": "#8b5cf6",
  "emoji": "⏰",
  "pattern": "time_spiral",
  "effect": "time_warp",
  "animated": true,
  "particles": true,
  "multicolor": true
}'),

('avatar_rainbow', 'Радужный', 'Arcoíris', 'Все цвета радуги', 'Todos los colores', 'legendary', true, 'special', '{
  "color": "#ffffff",
  "emoji": "🌈",
  "pattern": "rainbow_waves",
  "effect": "rainbow_shift",
  "animated": true,
  "multicolor": true,
  "particles": true
}'),

('avatar_quantum', 'Квантовый', 'Cuántico', 'Существование в суперпозиции', 'Existencia en superposición', 'legendary', true, 'cosmic', '{
  "color": "#06b6d4",
  "emoji": "⚛️",
  "pattern": "quantum_field",
  "effect": "phase_shift",
  "animated": true,
  "particles": true,
  "glitch": true
}'),

('avatar_infinity', 'Бесконечность', 'Infinito', 'Безграничная сила', 'Poder ilimitado', 'legendary', true, 'cosmic', '{
  "color": "#a855f7",
  "emoji": "∞",
  "pattern": "infinity_loop",
  "effect": "infinity_pulse",
  "animated": true,
  "particles": true,
  "aura": true,
  "multicolor": true
}')

ON CONFLICT (id) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  rarity = EXCLUDED.rarity,
  is_premium = EXCLUDED.is_premium,
  category = EXCLUDED.category;

-- Индекс для категорий
CREATE INDEX IF NOT EXISTS idx_skin_definitions_category ON public.skin_definitions(category);
CREATE INDEX IF NOT EXISTS idx_skin_definitions_rarity ON public.skin_definitions(rarity);
