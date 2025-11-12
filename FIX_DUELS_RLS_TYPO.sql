-- ИСПРАВЛЕНИЕ: Исправление опечатки в RLS политике duels
-- Проблема: В политике используется "nost_user" вместо "host_user"
-- Решение: Пересоздать политику с правильным именем колонки

-- 1. Удаляем политику с опечаткой
DROP POLICY IF EXISTS "Players can view their duels" ON duels;

-- 2. Создаем политику заново с правильным именем колонки
CREATE POLICY "Players can view their duels"
ON duels
FOR SELECT
USING (
  -- Host can view (ИСПРАВЛЕНО: host_user вместо nost_user)
  host_user = get_current_profile_id()
  OR
  -- Player can view if they participate
  EXISTS (
    SELECT 1 FROM duel_players
    WHERE duel_players.duel_id = duels.id
    AND duel_players.user_id = get_current_profile_id()
  )
  OR
  -- Anyone can view waiting duels (for joining)
  status = 'waiting'
);

-- 3. Проверка: показываем текущие политики
SELECT 
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'duels'
  AND cmd = 'SELECT'
ORDER BY policyname;

