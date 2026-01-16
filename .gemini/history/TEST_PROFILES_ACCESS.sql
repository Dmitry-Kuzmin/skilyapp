-- ТЕСТОВЫЙ ЗАПРОС: Проверка доступа к профилям и наличия имен
-- Выполните этот запрос в Supabase SQL Editor для диагностики

-- 1. Проверяем что политика работает - должны увидеть профили
SELECT 
  id,
  first_name,
  username,
  telegram_id,
  user_id,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 2. Проверяем профили игроков в активных дуэлях
SELECT 
  p.id as profile_id,
  p.first_name,
  p.username,
  p.telegram_id,
  dp.duel_id,
  dp.score,
  d.code as duel_code,
  d.status as duel_status
FROM public.profiles p
INNER JOIN public.duel_players dp ON dp.user_id = p.id
INNER JOIN public.duels d ON d.id = dp.duel_id
WHERE d.status IN ('waiting', 'active')
ORDER BY d.created_at DESC
LIMIT 20;

-- 3. Проверяем сколько профилей имеют пустые имена
SELECT 
  COUNT(*) as total_profiles,
  COUNT(first_name) FILTER (WHERE first_name IS NOT NULL AND first_name != '') as has_first_name,
  COUNT(username) FILTER (WHERE username IS NOT NULL AND username != '') as has_username,
  COUNT(*) FILTER (WHERE 
    (first_name IS NULL OR first_name = '') 
    AND (username IS NULL OR username = '')
  ) as profiles_without_names
FROM public.profiles;

