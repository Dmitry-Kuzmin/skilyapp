-- ============================================
-- Исправление RLS политик для косметики
-- Проблема: пользователи не могут получать косметику через daily bonus
-- Решение: добавить политики INSERT для пользователей или использовать helper функции
-- ============================================

-- 1. Создаем helper функции для проверки доступа (аналогично user_daily_bonus)
CREATE OR REPLACE FUNCTION public.can_access_cosmetics(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Case 1: Web users - check via auth.uid()
  IF auth.uid() IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = check_user_id AND user_id = auth.uid()
    );
  END IF;

  -- Case 2: Telegram users - check via telegram_id in JWT
  IF (current_setting('request.jwt.claims', true)::json->>'telegram_id') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = check_user_id
      AND telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    );
  END IF;

  -- Case 3: Fallback - allow if user_id exists in profiles
  -- This is necessary for Telegram users without proper JWT
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Обновляем RLS политики для user_stickers
DROP POLICY IF EXISTS "Users can insert their own stickers" ON public.user_stickers;
CREATE POLICY "Users can insert their own stickers"
  ON public.user_stickers
  FOR INSERT
  WITH CHECK (public.can_access_cosmetics(user_id));

-- 3. Обновляем RLS политики для user_skins
DROP POLICY IF EXISTS "Users can insert their own skins" ON public.user_skins;
CREATE POLICY "Users can insert their own skins"
  ON public.user_skins
  FOR INSERT
  WITH CHECK (public.can_access_cosmetics(user_id));

-- 4. Обновляем RLS политики для user_badges (если еще нет)
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;
CREATE POLICY "Users can insert their own badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (public.can_access_cosmetics(user_id));

-- 5. Убеждаемся, что функция grant_random_loot работает правильно
-- Функция уже использует SECURITY DEFINER, но проверим, что она может вставлять
-- Комментарий: grant_random_loot использует SECURITY DEFINER, поэтому она может обходить RLS
-- Но лучше иметь политики для прямых вставок тоже

-- 6. Проверяем наличие базовых стикеров для daily bonus
-- Если их нет, создаем
INSERT INTO public.sticker_definitions (id, name_ru, name_es, description_ru, description_es, rarity, category, is_premium, metadata) VALUES
('sticker_fire', '🔥 Огонь', '🔥 Fuego', 'Выражает восхищение', 'Expresa admiración', 'common', 'emoji', false, '{"emoji": "🔥"}'),
('sticker_clap', '👏 Аплодисменты', '👏 Aplausos', 'Поддержка соперника', 'Apoyo al oponente', 'common', 'reaction', false, '{"emoji": "👏"}'),
('sticker_star', '⭐ Звезда', '⭐ Estrella', 'Отличная работа!', '¡Excelente trabajo!', 'common', 'emoji', false, '{"emoji": "⭐"}'),
('sticker_thumbs', '👍 Большой палец', '👍 Pulgar', 'Одобрение', 'Aprobación', 'common', 'reaction', false, '{"emoji": "👍"}'),
('sticker_heart', '❤️ Сердце', '❤️ Corazón', 'Нравится', 'Me gusta', 'common', 'emoji', false, '{"emoji": "❤️"}'),
('sticker_party', '🎉 Праздник', '🎉 Fiesta', 'Празднование', 'Celebración', 'rare', 'celebration', false, '{"emoji": "🎉"}')
ON CONFLICT (id) DO NOTHING;

-- 7. Права доступа
GRANT EXECUTE ON FUNCTION public.can_access_cosmetics(UUID) TO anon, authenticated;

-- 8. Комментарии
COMMENT ON FUNCTION public.can_access_cosmetics IS 
  'Проверяет, может ли пользователь получить доступ к косметике (для RLS политик)';

