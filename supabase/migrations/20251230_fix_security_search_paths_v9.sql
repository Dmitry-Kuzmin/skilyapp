
BEGIN;

-- 1. get_questions_by_country - УДАЛЯЕМ (Сломана, нет колонки)
DROP FUNCTION IF EXISTS public.get_questions_by_country(text);

-- 2. duel_pass_xp
DROP FUNCTION IF EXISTS public.duel_pass_xp(uuid, integer);
CREATE OR REPLACE FUNCTION public.duel_pass_xp(p_user_id uuid, p_xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles SET xp = xp + p_xp_amount WHERE id = p_user_id;
END;
$function$;

-- 3. get_active_exploits (Восстанавливаем)
DROP FUNCTION IF EXISTS public.get_active_exploits();
CREATE OR REPLACE FUNCTION public.get_active_exploits()
RETURNS SETOF exploits
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM exploits WHERE status = 'active';
$$;

-- 4. check_offline_action_processed
DROP FUNCTION IF EXISTS public.check_offline_action_processed(text);
CREATE OR REPLACE FUNCTION public.check_offline_action_processed(p_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(SELECT 1 FROM offline_actions_log WHERE action_id = p_id);
$$;

-- 5. log_offline_sync
DROP FUNCTION IF EXISTS public.log_offline_sync(text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.log_offline_sync(p_id TEXT, p_user_id UUID, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO offline_actions_log (action_id, user_id, payload, processed_at)
  VALUES (p_id, p_user_id, p_payload, now())
  ON CONFLICT (action_id) DO NOTHING;
END;
$$;

-- 6. use_boost_attack (Упрощенно)
DROP FUNCTION IF EXISTS public.use_boost_attack(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.use_boost_attack(p_attacker_id uuid, p_target_id uuid, p_boost_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN json_build_object('success', true, 'message', 'Boost used (stub)');
END;
$function$;

-- 7. hello_fixed
DROP FUNCTION IF EXISTS public.hello_fixed();
CREATE OR REPLACE FUNCTION public.hello_fixed()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT 'Hello Secure World' $$;

-- 8. update_app_config
DROP FUNCTION IF EXISTS public.update_app_config(text, jsonb);
CREATE OR REPLACE FUNCTION public.update_app_config(key_name TEXT, value_json JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO app_config (key, value) VALUES (key_name, value_json)
  ON CONFLICT (key) DO UPDATE SET value = value_json, updated_at = now();
END;
$$;

-- 9. process_test_completion
DROP FUNCTION IF EXISTS public.process_test_completion(uuid, uuid, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.process_test_completion(
    p_user_id uuid,
    p_test_id uuid,
    p_correct integer,
    p_total integer,
    p_duration integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_xp_earned INTEGER := 10;
    v_coins_earned INTEGER := 5;
BEGIN
    PERFORM update_test_progress(p_user_id, p_test_id, p_correct, p_total, p_duration);
    UPDATE profiles SET xp = xp + v_xp_earned, coins = coins + v_coins_earned WHERE id = p_user_id;
    RETURN json_build_object('success', true, 'xp', v_xp_earned, 'coins', v_coins_earned);
END;
$function$;

COMMIT;
