-- =====================================================
-- COSMETICS SYSTEM: Скины, Бейджи, Стикеры
-- =====================================================

-- ============================================
-- 1. ТАБЛИЦЫ ОПРЕДЕЛЕНИЙ (Definitions)
-- ============================================

-- Определения скинов
CREATE TABLE IF NOT EXISTS public.skin_definitions (
  id TEXT PRIMARY KEY, -- например: 'avatar_fire', 'avatar_ice'
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  preview_url TEXT, -- URL превью изображения
  is_premium BOOLEAN DEFAULT false,
  is_animated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb, -- дополнительные данные (цвета, эффекты)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Определения бейджей
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id TEXT PRIMARY KEY, -- например: 'winner_100', 'streak_master'
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  icon_url TEXT, -- URL иконки
  is_premium BOOLEAN DEFAULT false,
  category TEXT, -- 'achievement', 'seasonal', 'special'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Определения стикеров
CREATE TABLE IF NOT EXISTS public.sticker_definitions (
  id TEXT PRIMARY KEY, -- например: 'emoji_fire', 'reaction_wow'
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  image_url TEXT NOT NULL, -- URL изображения стикера
  is_premium BOOLEAN DEFAULT false,
  is_animated BOOLEAN DEFAULT false,
  category TEXT, -- 'emoji', 'reaction', 'celebration'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ТАБЛИЦЫ ИНВЕНТАРЯ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

-- Скины пользователя
CREATE TABLE IF NOT EXISTS public.user_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skin_id TEXT NOT NULL REFERENCES skin_definitions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  obtained_from TEXT, -- 'duel_pass', 'shop', 'event', 'daily_bonus'
  obtained_metadata JSONB DEFAULT '{}'::jsonb, -- детали получения (уровень, сезон)
  UNIQUE(user_id, skin_id)
);

-- Бейджи пользователя
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  is_displayed BOOLEAN DEFAULT false, -- показывать в профиле
  display_order INTEGER DEFAULT 0, -- порядок отображения (можно показать до 3 бейджей)
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  obtained_from TEXT,
  obtained_metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_id)
);

-- Стикеры пользователя
CREATE TABLE IF NOT EXISTS public.user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id TEXT NOT NULL REFERENCES sticker_definitions(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0), -- стикеры могут быть расходными
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  obtained_from TEXT,
  obtained_metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, sticker_id)
);

-- ============================================
-- 3. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_skins_user_id ON public.user_skins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skins_active ON public.user_skins(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_displayed ON public.user_badges(user_id, is_displayed, display_order) WHERE is_displayed = true;
CREATE INDEX IF NOT EXISTS idx_user_stickers_user_id ON public.user_stickers(user_id);

-- ============================================
-- 4. RLS ПОЛИТИКИ
-- ============================================

-- Definitions: все могут читать
ALTER TABLE public.skin_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skin definitions"
  ON public.skin_definitions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view badge definitions"
  ON public.badge_definitions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view sticker definitions"
  ON public.sticker_definitions FOR SELECT
  USING (true);

-- User inventory: пользователи могут видеть и управлять своими предметами
ALTER TABLE public.user_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

-- user_skins policies
CREATE POLICY "Users can view their own skins"
  ON public.user_skins FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can view others' active skins"
  ON public.user_skins FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can insert skins"
  ON public.user_skins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own skins"
  ON public.user_skins FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- user_badges policies
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can view others' displayed badges"
  ON public.user_badges FOR SELECT
  USING (is_displayed = true);

CREATE POLICY "Service role can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own badges"
  ON public.user_badges FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- user_stickers policies
CREATE POLICY "Users can view their own stickers"
  ON public.user_stickers FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Service role can insert stickers"
  ON public.user_stickers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own stickers"
  ON public.user_stickers FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- ============================================
-- 5. ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ КОСМЕТИКОЙ
-- ============================================

-- Функция для активации скина (только один активный скин)
CREATE OR REPLACE FUNCTION activate_skin(p_user_id UUID, p_skin_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Деактивируем все скины пользователя
  UPDATE public.user_skins
  SET is_active = false
  WHERE user_id = p_user_id;
  
  -- Активируем выбранный скин
  UPDATE public.user_skins
  SET is_active = true
  WHERE user_id = p_user_id AND skin_id = p_skin_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для управления отображением бейджей (максимум 3)
CREATE OR REPLACE FUNCTION toggle_badge_display(p_user_id UUID, p_badge_id TEXT, p_display BOOLEAN)
RETURNS JSONB AS $$
DECLARE
  v_displayed_count INTEGER;
  v_max_order INTEGER;
BEGIN
  -- Проверяем количество отображаемых бейджей
  SELECT COUNT(*) INTO v_displayed_count
  FROM public.user_badges
  WHERE user_id = p_user_id AND is_displayed = true;
  
  -- Если включаем отображение и уже есть 3 бейджа
  IF p_display = true AND v_displayed_count >= 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_badges_reached',
      'message', 'Можно отображать максимум 3 бейджа'
    );
  END IF;
  
  -- Получаем максимальный порядок
  SELECT COALESCE(MAX(display_order), 0) INTO v_max_order
  FROM public.user_badges
  WHERE user_id = p_user_id AND is_displayed = true;
  
  -- Обновляем бейдж
  UPDATE public.user_badges
  SET 
    is_displayed = p_display,
    display_order = CASE 
      WHEN p_display = true THEN v_max_order + 1
      ELSE 0
    END
  WHERE user_id = p_user_id AND badge_id = p_badge_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для использования стикера (уменьшает количество)
CREATE OR REPLACE FUNCTION use_sticker(p_user_id UUID, p_sticker_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  -- Получаем текущее количество
  SELECT quantity INTO v_quantity
  FROM public.user_stickers
  WHERE user_id = p_user_id AND sticker_id = p_sticker_id;
  
  IF v_quantity IS NULL OR v_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'sticker_not_found',
      'message', 'Стикер не найден или закончился'
    );
  END IF;
  
  -- Уменьшаем количество и обновляем время использования
  UPDATE public.user_stickers
  SET 
    quantity = quantity - 1,
    last_used_at = NOW()
  WHERE user_id = p_user_id AND sticker_id = p_sticker_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_quantity - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SEED DATA - Примеры косметики
-- ============================================

-- Скины (аватары)
INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, metadata) VALUES
('avatar_default', 'Стандартный', 'Estándar', 'Базовый аватар', 'Avatar básico', 'common', false, '{"color": "#6366f1"}'),
('avatar_fire', 'Огненный', 'Fuego', 'Пылающий аватар', 'Avatar ardiente', 'rare', false, '{"color": "#ef4444", "effect": "fire"}'),
('avatar_ice', 'Ледяной', 'Hielo', 'Морозный аватар', 'Avatar helado', 'rare', false, '{"color": "#3b82f6", "effect": "ice"}'),
('avatar_gold', 'Золотой', 'Oro', 'Роскошный золотой аватар', 'Avatar dorado lujoso', 'epic', true, '{"color": "#fbbf24", "effect": "shine"}'),
('avatar_diamond', 'Алмазный', 'Diamante', 'Легендарный алмазный аватар', 'Avatar diamante legendario', 'legendary', true, '{"color": "#a855f7", "effect": "sparkle", "animated": true}')
ON CONFLICT (id) DO NOTHING;

-- Бейджи (достижения)
INSERT INTO public.badge_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('badge_winner_10', 'Победитель x10', 'Ganador x10', 'Выиграл 10 дуэлей', 'Ganó 10 duelos', 'common', 'achievement', false, '{"icon": "trophy", "color": "#10b981"}'),
('badge_winner_50', 'Победитель x50', 'Ganador x50', 'Выиграл 50 дуэлей', 'Ganó 50 duelos', 'rare', 'achievement', false, '{"icon": "trophy", "color": "#3b82f6"}'),
('badge_winner_100', 'Победитель x100', 'Ganador x100', 'Выиграл 100 дуэлей', 'Ganó 100 duelos', 'epic', 'achievement', false, '{"icon": "trophy", "color": "#a855f7"}'),
('badge_streak_7', 'Серия 7', 'Racha 7', 'Победил 7 дней подряд', 'Ganó 7 días seguidos', 'rare', 'achievement', false, '{"icon": "flame", "color": "#f59e0b"}'),
('badge_perfect', 'Идеальный', 'Perfecto', 'Ответил на все вопросы правильно', 'Respondió todas las preguntas correctamente', 'epic', 'achievement', false, '{"icon": "star", "color": "#fbbf24"}'),
('badge_season_1', 'Сезон 1', 'Temporada 1', 'Участвовал в первом сезоне', 'Participó en la primera temporada', 'rare', 'seasonal', false, '{"icon": "calendar", "color": "#6366f1"}'),
('badge_premium', 'Premium', 'Premium', 'Владелец Premium подписки', 'Propietario de suscripción Premium', 'legendary', 'special', true, '{"icon": "crown", "color": "#fbbf24", "animated": true}')
ON CONFLICT (id) DO NOTHING;

-- Стикеры (эмоции для дуэлей)
INSERT INTO public.sticker_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('sticker_fire', '🔥 Огонь', '🔥 Fuego', 'Выражает восхищение', 'Expresa admiración', 'common', 'emoji', false, '{"emoji": "🔥"}'),
('sticker_clap', '👏 Аплодисменты', '👏 Aplausos', 'Поддержка соперника', 'Apoyo al oponente', 'common', 'reaction', false, '{"emoji": "👏"}'),
('sticker_thinking', '🤔 Думаю', '🤔 Pensando', 'Размышление', 'Reflexión', 'common', 'emoji', false, '{"emoji": "🤔"}'),
('sticker_wow', '😮 Вау', '😮 Wow', 'Удивление', 'Sorpresa', 'rare', 'reaction', false, '{"emoji": "😮"}'),
('sticker_laugh', '😂 Смех', '😂 Risa', 'Веселье', 'Diversión', 'rare', 'emoji', false, '{"emoji": "😂"}'),
('sticker_trophy', '🏆 Трофей', '🏆 Trofeo', 'Празднование победы', 'Celebración de victoria', 'epic', 'celebration', true, '{"emoji": "🏆", "effect": "bounce"}')
ON CONFLICT (id) DO NOTHING;

-- Даем всем пользователям базовый скин и несколько стикеров
-- (это можно сделать через trigger при создании профиля или вручную)

COMMENT ON TABLE public.skin_definitions IS 'Определения всех доступных скинов (аватаров) в игре';
COMMENT ON TABLE public.badge_definitions IS 'Определения всех доступных бейджей (достижений)';
COMMENT ON TABLE public.sticker_definitions IS 'Определения всех доступных стикеров (эмоций)';
COMMENT ON TABLE public.user_skins IS 'Скины, которыми владеет пользователь';
COMMENT ON TABLE public.user_badges IS 'Бейджи, которыми владеет пользователь';
COMMENT ON TABLE public.user_stickers IS 'Стикеры в инвентаре пользователя';

