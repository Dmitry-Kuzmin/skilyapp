
BEGIN;

-- 1. CLEANUP GHOST FUNCTIONS
DROP FUNCTION IF EXISTS public.get_questions_by_country(text);
DROP FUNCTION IF EXISTS public.get_active_exploits();
DROP FUNCTION IF EXISTS public.check_offline_action_processed(text);
DROP FUNCTION IF EXISTS public.log_offline_sync(text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.hello_fixed();

-- 2. ALTER EXISTING FUNCTIONS (Adding search_path safely)

-- Duel helpers (если они есть)
ALTER FUNCTION public.get_random_duel_questions(integer) SET search_path = 'public';
ALTER FUNCTION public.duel_pass_xp(uuid, integer) SET search_path = 'public';

-- Core logic
ALTER FUNCTION public.update_app_config(text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.process_test_completion(uuid, uuid, integer, integer, integer) SET search_path = 'public';

COMMIT;
