-- ============================================
-- ТЕСТ: Проверка функции get_or_create_season_progress
-- ============================================
-- Выполните этот файл для проверки работы функции

-- 1. Проверить, что функция существует
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_or_create_season_progress';

-- 2. Получить ваш user_id (замените на реальный UUID из вашего профиля)
SELECT id FROM public.profiles LIMIT 1;

-- 3. Проверить активный сезон
SELECT * FROM public.get_active_season();

-- 4. Тест функции get_or_create_season_progress
-- ЗАМЕНИТЕ '00000000-0000-0000-0000-000000000000' на ваш реальный UUID из шага 2
-- ЗАМЕНИТЕ 1 на реальный season_id из шага 3
SELECT * FROM public.get_or_create_season_progress(
  '00000000-0000-0000-0000-000000000000'::UUID, 
  1
);

-- 5. Проверить созданный прогресс напрямую
SELECT * FROM public.user_season_progress 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID 
AND season_id = 1;

