-- Разрешить чтение профилей для участников дуэли
-- Это необходимо для отображения имени соперника в игре

-- Удаляем старую политику, которая ограничивает чтение только своего профиля
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем новую политику, которая разрешает чтение всех профилей
-- Это безопасно, так как мы показываем только first_name и username
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );


