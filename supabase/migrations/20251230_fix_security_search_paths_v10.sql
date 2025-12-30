
BEGIN;

-- ============================================================
-- 1. УДАЛЕНИЕ СЛОМАННЫХ ФУНКЦИЙ (Очистка)
-- ============================================================

-- Нет колонки country/country_code
DROP FUNCTION IF EXISTS public.get_questions_by_country(text);

-- Нет типа/таблицы exploits
DROP FUNCTION IF EXISTS public.get_active_exploits();

-- Нет таблицы offline_actions_log (судя по предыдущим ошибкам)
DROP FUNCTION IF EXISTS public.check_offline_action_processed(text);
DROP FUNCTION IF EXISTS public.log_offline_sync(text, uuid, jsonb);

-- Тестовая функция
DROP FUNCTION IF EXISTS public.hello_fixed();


-- ============================================================
-- 2. ИСПРАВЛЕНИЕ search_path (ALTER вместо CREATE OR REPLACE)
-- ============================================================
-- Это сохранит логику функций, но добавит безопасность.
-- Если сигнатура не совпадет - команда просто упадет, но ничего не сломает.

-- Сложные функции дуэлей
ALTER FUNCTION public.handle_duel_payout_atomic(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_random_duel_questions(integer) SET search_path = 'public';
ALTER FUNCTION public.duel_pass_xp(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.use_boost_attack(uuid, uuid, text) SET search_path = 'public';

-- Конфигурация и тесты
ALTER FUNCTION public.update_app_config(text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.process_test_completion(uuid, uuid, integer, integer, integer) SET search_path = 'public';

COMMIT;
