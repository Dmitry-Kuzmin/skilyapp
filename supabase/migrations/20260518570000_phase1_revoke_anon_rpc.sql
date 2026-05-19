-- ============================================================
-- Phase 1 hardening: blanket REVOKE EXECUTE FROM anon на public.*
-- ============================================================
-- Supabase Performance/Security Lints выявил 407 SECURITY DEFINER функций,
-- доступных анонимным юзерам через REST API. Среди них критичные —
-- activate_premium, add_coins, apply_promo_code, buy_streak_freeze и т.д.
--
-- Подход: blanket REVOKE EXECUTE FROM anon на ВСЁ в public.
-- Authenticated роль НЕ затрагиваем — там auth.uid() обычно проверяется внутри.
--
-- Если что-то сломается у гостей (например проверка статуса премиума без auth),
-- быстрый откат через точечный GRANT (см. блок ниже как пример).

-- ── Шаг 1: blanket REVOKE для anon
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ── Шаг 2: при future-функциях по умолчанию anon тоже не получает EXECUTE
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ── Шаг 3: точечный whitelist для функций, которые ДОЛЖНЫ быть публичными
-- (только те, что вызываются с anon-токеном, не для authenticated).
-- На текущий момент не выявлено ни одной такой — все RPC вызываются
-- авторизованными пользователями. Если что-то сломается — добавить сюда:
--
-- Пример формата (закомментировано):
-- GRANT EXECUTE ON FUNCTION public.<func_name>(<arg_types>) TO anon;

-- ── Логирование операции в notice
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

  RAISE NOTICE '[phase1_revoke_anon] Total functions in public: %', v_count;
  RAISE NOTICE '[phase1_revoke_anon] anon EXECUTE на public.* отозван. Authenticated не затронут.';
END $$;
