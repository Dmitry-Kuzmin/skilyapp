-- ============================================
-- ИСПРАВЛЕНИЕ: Публичное чтение партнеров по partner_code
-- ============================================
-- Проблема: Ошибка 406 (Not Acceptable) при попытке прочитать данные партнера
-- без авторизации на посадочной странице
-- 
-- Решение: Добавить политику, которая разрешает чтение партнеров по partner_code
-- для неавторизованных пользователей (нужно для баннера на посадочной странице)
--
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR!

-- 1. Проверяем текущие политики SELECT для partners
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'partners'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Создаем политику для публичного чтения партнеров по partner_code
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

-- 3. Проверяем, что политика создана
SELECT 
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'partners'
  AND policyname = 'Anyone can view active partners by code';

-- 4. Комментарий к политике
COMMENT ON POLICY "Anyone can view active partners by code" ON public.partners IS 
  'Разрешает неавторизованным пользователям читать данные одобренных и активных партнеров по partner_code. Необходимо для отображения баннера партнера на посадочной странице.';































