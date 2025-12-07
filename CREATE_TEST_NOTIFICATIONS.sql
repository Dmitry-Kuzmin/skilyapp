-- 🧪 СОЗДАНИЕ ТЕСТОВЫХ УВЕДОМЛЕНИЙ ДЛЯ ПРОВЕРКИ ВИРТУАЛИЗАЦИИ
-- 
-- ИНСТРУКЦИЯ:
-- 1. Замени '532aae3f-0282-469a-be1c-a073ef6c870b' на свой profileId
-- 2. Выполни запрос в Supabase SQL Editor
-- 3. Открой панель уведомлений - должно быть 20 элементов
-- 4. Проведи тест Performance Tab

-- Создай 20 тестовых уведомлений
INSERT INTO duel_notifications (user_id, type, title, message, icon, created_at)
SELECT 
  '532aae3f-0282-469a-be1c-a073ef6c870b'::uuid,  -- ⚠️ ЗАМЕНИ НА СВОЙ profileId!
  'finish',
  'Тестовое уведомление ' || generate_series,
  'Это тестовое уведомление для проверки виртуализации. Сообщение достаточно длинное, чтобы проверить работу компонента и отображение текста.',
  'trophy',
  NOW() - (generate_series || ' minutes')::interval
FROM generate_series(1, 20);

-- ✅ Проверь результат:
-- SELECT COUNT(*) FROM duel_notifications 
-- WHERE user_id = '532aae3f-0282-469a-be1c-a073ef6c870b'::uuid;

-- 🗑️ Если нужно удалить тестовые уведомления:
-- DELETE FROM duel_notifications 
-- WHERE user_id = '532aae3f-0282-469a-be1c-a073ef6c870b'::uuid 
--   AND title LIKE 'Тестовое уведомление%';

