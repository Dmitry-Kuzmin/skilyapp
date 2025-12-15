-- ============================================
-- Исправление RLS политики для boost_inventory
-- ============================================
-- Проблема: Бусты покупаются успешно, но не отображаются в дуэли
-- Причина: RLS политика блокирует чтение boost_inventory
-- Решение: Упрощенная и более надежная политика для чтения

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.boost_inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.boost_inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.boost_inventory;

-- Создаем новую упрощенную политику SELECT
-- Разрешаем чтение бустов, если user_id соответствует текущему пользователю
CREATE POLICY "Enable read access for boost inventory"
ON public.boost_inventory
FOR SELECT
TO authenticated
USING (
  -- Для обычных пользователей: проверяем через profiles.user_id = auth.uid()
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Для Telegram пользователей: проверяем через telegram_id из JWT
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- Создаем политику INSERT (для прямых запросов, хотя обычно используется RPC)
CREATE POLICY "Enable insert for boost inventory"
ON public.boost_inventory
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- Создаем политику UPDATE
CREATE POLICY "Enable update for boost inventory"
ON public.boost_inventory
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- Комментарий для документации
COMMENT ON POLICY "Enable read access for boost inventory" ON public.boost_inventory IS 
  'Разрешает чтение бустов из инвентаря для текущего пользователя (работает для обычных и Telegram пользователей).';

