-- ============================================
-- Migration: Add Rate Limiting to create_webauthn_challenge
-- ============================================
-- Защита от DoS атак: лимит 10 попыток за минуту

CREATE OR REPLACE FUNCTION public.create_webauthn_challenge(
  p_session_id text,
  p_challenge text,
  p_challenge_type text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id uuid;
  v_recent_attempts integer;
BEGIN
  -- ============================================
  -- RATE LIMITING: Защита от DoS атак
  -- ============================================
  -- Проверяем количество попыток за последнюю минуту
  -- Лимит: 10 попыток на пользователя или глобально
  SELECT count(*) INTO v_recent_attempts
  FROM public.webauthn_challenges
  WHERE created_at > now() - interval '1 minute'
    AND (
      -- Если user_id известен - проверяем по нему
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      -- Иначе - глобальный лимит для анонимных (login)
      OR (p_user_id IS NULL AND challenge_type = p_challenge_type)
    );

  -- Если превышен лимит - отклоняем запрос
  IF v_recent_attempts > 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many authentication attempts. Please wait a minute.'
      USING ERRCODE = 'P0001'; -- custom error code
  END IF;

  -- Удаляем старые challenges этого пользователя (если есть)
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.webauthn_challenges
    WHERE user_id = p_user_id
    AND challenge_type = p_challenge_type
    AND created_at < now() - interval '1 minute'; -- Оставляем свежие
  END IF;

  -- Создаём новый challenge
  INSERT INTO public.webauthn_challenges (
    session_id,
    challenge,
    challenge_type,
    user_id
  ) VALUES (
    p_session_id,
    p_challenge,
    p_challenge_type,
    p_user_id
  )
  RETURNING id INTO v_challenge_id;

  RETURN v_challenge_id;
END;
$$;

COMMENT ON FUNCTION public.create_webauthn_challenge IS 
  'Создаёт новый WebAuthn challenge с Rate Limiting защитой (10 попыток/минуту). Вызывается из Edge Functions.';

