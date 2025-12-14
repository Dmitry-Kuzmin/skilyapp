-- Скрипт для добавления буста Data Leak (screen_injector) в инвентарь для тестирования
-- Замените YOUR_USER_ID на ваш profile_id

-- Вариант 1: Добавить через функцию modify_boost_inventory
-- SELECT public.modify_boost_inventory('YOUR_USER_ID'::uuid, 'screen_injector', 5);

-- Вариант 2: Добавить напрямую в таблицу
-- INSERT INTO public.boost_inventory (user_id, boost_type, quantity)
-- VALUES ('YOUR_USER_ID'::uuid, 'screen_injector', 5)
-- ON CONFLICT (user_id, boost_type) 
-- DO UPDATE SET quantity = boost_inventory.quantity + 5;

-- Чтобы найти свой user_id, выполните:
-- SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

-- Или если используете Telegram:
-- SELECT id FROM profiles WHERE telegram_id = YOUR_TELEGRAM_ID LIMIT 1;

