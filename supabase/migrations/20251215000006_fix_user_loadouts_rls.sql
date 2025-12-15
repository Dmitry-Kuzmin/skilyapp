-- ============================================
-- Исправление RLS политики для user_loadouts
-- ============================================
-- Проблема: 401 Unauthorized при загрузке user_loadouts
-- Причина: RLS политика блокирует доступ
-- Решение: Упрощенная и более надежная политика

-- Удаляем старую политику
DROP POLICY IF EXISTS "Users can manage their own loadout" ON public.user_loadouts;

-- Создаем новую упрощенную политику SELECT
CREATE POLICY "Enable read access for user loadouts"
ON public.user_loadouts
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

-- Создаем политику INSERT
CREATE POLICY "Enable insert for user loadouts"
ON public.user_loadouts
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
CREATE POLICY "Enable update for user loadouts"
ON public.user_loadouts
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
COMMENT ON POLICY "Enable read access for user loadouts" ON public.user_loadouts IS 
  'Разрешает чтение loadout для текущего пользователя (работает для обычных и Telegram пользователей).';

