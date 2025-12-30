
BEGIN;

-- 1. check_and_increment_ai_debrief_limit
DROP FUNCTION IF EXISTS public.check_and_increment_ai_debrief_limit(uuid);
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_debrief_limit(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    usage_record daily_ai_usage%ROWTYPE;
    current_limit INTEGER;
    is_premium BOOLEAN;
    user_tz TEXT;
    today_date DATE;
BEGIN
    SELECT COALESCE(p.timezone, 'UTC') INTO user_tz FROM profiles p WHERE p.id = user_uuid;
    today_date := (now() AT TIME ZONE user_tz)::date;

    SELECT (COALESCE(p.is_premium, false) OR COALESCE(p.premium_until > now(), false))
    INTO is_premium
    FROM profiles p WHERE p.id = user_uuid;

    IF is_premium THEN current_limit := 50; ELSE current_limit := 3; END IF;

    INSERT INTO daily_ai_usage (user_id, date, request_count, created_at, updated_at)
    VALUES (user_uuid, today_date, 0, now(), now())
    ON CONFLICT (user_id, date) DO NOTHING;

    SELECT * INTO usage_record FROM daily_ai_usage
    WHERE user_id = user_uuid AND date = today_date FOR UPDATE;

    IF usage_record.request_count >= current_limit THEN RETURN FALSE; END IF;

    UPDATE daily_ai_usage SET request_count = request_count + 1, updated_at = now()
    WHERE user_id = user_uuid AND date = today_date;

    RETURN TRUE;
END;
$function$;

-- 2. trigger_auth_event_handler
DROP FUNCTION IF EXISTS public.trigger_auth_event_handler();
CREATE OR REPLACE FUNCTION public.trigger_auth_event_handler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.auth_events (user_id, event_type, metadata)
  VALUES (new.id, 'user_updated', row_to_json(new));
  RETURN new;
END;
$function$;

-- 3. get_ai_debrief_limit_status
DROP FUNCTION IF EXISTS public.get_ai_debrief_limit_status(uuid);
CREATE OR REPLACE FUNCTION public.get_ai_debrief_limit_status(user_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    usage_count INTEGER;
    limit_val INTEGER;
    is_premium BOOLEAN;
    user_tz TEXT;
    today_date DATE;
BEGIN
    SELECT COALESCE(p.timezone, 'UTC') INTO user_tz FROM profiles p WHERE p.id = user_uuid;
    today_date := (now() AT TIME ZONE user_tz)::date;

    SELECT (COALESCE(p.is_premium, false) OR COALESCE(p.premium_until > now(), false))
    INTO is_premium
    FROM profiles p WHERE p.id = user_uuid;

    IF is_premium THEN limit_val := 50; ELSE limit_val := 3; END IF;

    SELECT COALESCE(request_count, 0) INTO usage_count
    FROM daily_ai_usage
    WHERE user_id = user_uuid AND date = today_date;

    RETURN json_build_object(
        'used', COALESCE(usage_count, 0),
        'limit', limit_val,
        'is_premium', is_premium
    );
END;
$function$;

-- 4. check_ai_usage_limit
DROP FUNCTION IF EXISTS public.check_ai_usage_limit(uuid);
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN true;
END;
$function$;

-- 5. get_pdd_russia_question_by_source
DROP FUNCTION IF EXISTS public.get_pdd_russia_question_by_source(text);
CREATE OR REPLACE FUNCTION public.get_pdd_russia_question_by_source(
  p_source_id TEXT
)
RETURNS TABLE (
  id UUID,
  ticket_number INTEGER,
  question_number INTEGER,
  question_text TEXT,
  image_url TEXT,
  explanation TEXT,
  topics TEXT[],
  answers JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.ticket_number,
    q.question_number,
    q.question_text,
    q.image_url,
    q.explanation,
    q.topics,
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'text', a.answer_text,
        'is_correct', a.is_correct,
        'position', a.position
      ) ORDER BY a.position
    ) as answers
  FROM public.pdd_russia_questions q
  LEFT JOIN public.pdd_russia_answers a ON a.question_id = q.id
  WHERE q.source_id = p_source_id
  GROUP BY q.id, q.ticket_number, q.question_number, q.question_text, 
           q.image_url, q.explanation, q.topics;
END;
$$;

-- 6. get_pdd_russia_ticket
DROP FUNCTION IF EXISTS public.get_pdd_russia_ticket(integer);
CREATE OR REPLACE FUNCTION public.get_pdd_russia_ticket(
  p_ticket_number INTEGER
)
RETURNS TABLE (
  id UUID,
  ticket_number INTEGER,
  question_number INTEGER,
  question_text TEXT,
  image_url TEXT,
  explanation TEXT,
  correct_answer_text TEXT,
  topics TEXT[],
  answers JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.ticket_number,
    q.question_number,
    q.question_text,
    q.image_url,
    q.explanation,
    q.correct_answer_text,
    q.topics,
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'text', a.answer_text,
        'is_correct', a.is_correct,
        'position', a.position
      ) ORDER BY a.position
    ) as answers
  FROM public.pdd_russia_questions q
  LEFT JOIN public.pdd_russia_answers a ON a.question_id = q.id
  WHERE q.ticket_number = p_ticket_number
  GROUP BY q.id, q.ticket_number, q.question_number, q.question_text, 
           q.image_url, q.explanation, q.correct_answer_text, q.topics
  ORDER BY q.question_number;
END;
$$;

COMMIT;
