
BEGIN;

-- 1. exec_sql (ВАЖНО: Добавляем search_path)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$;

-- 2. cleanup_expired_matchmaking
CREATE OR REPLACE FUNCTION public.cleanup_expired_matchmaking()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM matchmaking_queue
  WHERE joined_at < (now() - interval '1 hour');
END;
$function$;

-- 3. increment_ai_usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_tz TEXT;
    today_date DATE;
BEGIN
    SELECT COALESCE(timezone, 'UTC') INTO user_tz FROM profiles WHERE id = p_user_id;
    today_date := (now() AT TIME ZONE user_tz)::date;

    INSERT INTO daily_ai_usage (user_id, date, request_count, created_at, updated_at)
    VALUES (p_user_id, today_date, 1, now(), now())
    ON CONFLICT (user_id, date) DO UPDATE SET
        request_count = daily_ai_usage.request_count + 1, updated_at = now();
END;
$function$;

-- 4. get_active_exploits
CREATE OR REPLACE FUNCTION public.get_active_exploits()
RETURNS SETOF exploits
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM exploits WHERE status = 'active';
$$;

-- 5. get_feature_flag
CREATE OR REPLACE FUNCTION public.get_feature_flag(flag_key TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  flag_value JSONB;
BEGIN
  SELECT value INTO flag_value FROM app_config WHERE key = flag_key;
  IF flag_value IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(flag_value) = 'boolean' THEN RETURN flag_value::boolean; END IF;
  IF jsonb_typeof(flag_value) = 'object' THEN RETURN COALESCE((flag_value->>'enabled')::boolean, true); END IF;
  RETURN true;
END;
$$;

-- 6. update_app_config
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

-- 7. check_offline_action_processed
CREATE OR REPLACE FUNCTION public.check_offline_action_processed(p_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(SELECT 1 FROM offline_actions_log WHERE action_id = p_id);
$$;

-- 8. log_offline_sync
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

-- 9. update_user_loadouts_updated_at
CREATE OR REPLACE FUNCTION public.update_user_loadouts_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMIT;
