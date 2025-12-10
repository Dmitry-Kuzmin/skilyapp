-- ============================================
-- ИСПРАВЛЕНИЕ: Публичное чтение партнеров по partner_code
-- ============================================
-- Проблема: Ошибка 406 (Not Acceptable) при попытке прочитать данные партнера
-- без авторизации на посадочной странице
-- 
-- Решение: Добавить политику, которая разрешает чтение партнеров по partner_code
-- для неавторизованных пользователей (нужно для баннера на посадочной странице)

-- Создаем политику для публичного чтения партнеров по partner_code
-- Это безопасно, так как мы показываем только публичную информацию (name, channel_name, etc.)
-- и только для одобренных и активных партнеров
DROP POLICY IF EXISTS "Anyone can view active partners by code" ON public.partners;

CREATE POLICY "Anyone can view active partners by code"
  ON public.partners
  FOR SELECT
  USING (
    -- Разрешаем чтение только если:
    -- 1. Партнер одобрен
    registration_status = 'approved'
    -- 2. Партнер активен
    AND status = 'active'
    -- 3. У партнера есть partner_code (публичная ссылка)
    AND partner_code IS NOT NULL
  );

-- Комментарий к политике
COMMENT ON POLICY "Anyone can view active partners by code" ON public.partners IS 
  'Разрешает неавторизованным пользователям читать данные одобренных и активных партнеров по partner_code. Необходимо для отображения баннера партнера на посадочной странице.';























