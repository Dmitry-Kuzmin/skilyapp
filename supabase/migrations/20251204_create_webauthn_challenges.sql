-- ============================================
-- Migration: WebAuthn Challenges Storage
-- ============================================
-- Создаём таблицу для хранения challenges (вместо in-memory Map)
-- Решает проблему serverless Edge Functions (разные инстансы)

-- ============================================
-- 1. Создание таблицы
-- ============================================

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session ID (возвращается клиенту)
  session_id text NOT NULL UNIQUE,
  
  -- Challenge (base64url encoded)
  challenge text NOT NULL,
  
  -- Тип challenge (регистрация или вход)
  challenge_type text NOT NULL CHECK (challenge_type IN ('register', 'login')),
  
  -- Для регистрации: связь с пользователем
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- TTL: автоматическое вычисление expires_at
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes')
);

-- ============================================
-- 2. Индексы (ТОЛЬКО необходимые)
-- ============================================

-- Быстрый поиск по session_id (при verify)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webauthn_challenge_session 
  ON public.webauthn_challenges(session_id);

-- Для автоочистки старых challenges (сортировка по expires_at)
CREATE INDEX IF NOT EXISTS idx_webauthn_challenge_expires 
  ON public.webauthn_challenges(expires_at);

-- Для поиска challenges конкретного пользователя (регистрация)
CREATE INDEX IF NOT EXISTS idx_webauthn_challenge_user 
  ON public.webauthn_challenges(user_id) 
  WHERE user_id IS NOT NULL;

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Обычные пользователи НЕ имеют доступа к challenges
-- Только Edge Functions через service_role

-- Admin может просматривать (для debugging)
DROP POLICY IF EXISTS "Admins can view challenges" ON public.webauthn_challenges;
CREATE POLICY "Admins can view challenges"
  ON public.webauthn_challenges
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. Функции для работы с challenges
-- ============================================

-- Создание challenge (для begin)
CREATE OR REPLACE FUNCTION public.create_webauthn_challenge(
  p_session_id text,
  p_challenge text,
  p_challenge_type text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами владельца (для service_role)
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
  'Создаёт новый WebAuthn challenge и возвращает его ID. Вызывается из Edge Functions.';

-- Получение и удаление challenge (для verify)
CREATE OR REPLACE FUNCTION public.consume_webauthn_challenge(
  p_session_id text
)
RETURNS TABLE (
  challenge text,
  challenge_type text,
  user_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Получаем challenge
  SELECT 
    c.challenge,
    c.challenge_type,
    c.user_id,
    c.created_at
  INTO v_record
  FROM public.webauthn_challenges c
  WHERE c.session_id = p_session_id
  AND c.expires_at > now() -- Проверяем TTL
  FOR UPDATE; -- Блокируем строку

  -- Если не найден или истёк - возвращаем NULL
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Удаляем challenge (одноразовый)
  DELETE FROM public.webauthn_challenges
  WHERE session_id = p_session_id;

  -- Возвращаем данные
  RETURN QUERY
  SELECT 
    v_record.challenge,
    v_record.challenge_type,
    v_record.user_id,
    v_record.created_at;
END;
$$;

COMMENT ON FUNCTION public.consume_webauthn_challenge IS 
  'Получает и удаляет challenge (одноразовый). Проверяет TTL. Возвращает NULL если истёк или не найден.';

-- ============================================
-- 5. Автоматическая очистка старых challenges
-- ============================================

-- Функция для очистки
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Удаляем challenges старше 5 минут (TTL = 2 минуты + запас)
  DELETE FROM public.webauthn_challenges
  WHERE expires_at < now()
  OR created_at < now() - interval '5 minutes';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Логируем для мониторинга
  RAISE NOTICE 'Cleaned up % expired WebAuthn challenges', v_deleted_count;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_webauthn_challenges IS 
  'Удаляет истёкшие challenges. Вызывается по cron или вручную.';

-- ============================================
-- 6. Автоматическая очистка через Trigger
-- ============================================

-- ВАЖНО: pg_cron может быть недоступен на некоторых планах Supabase
-- Поэтому используем trigger на INSERT для автоматической очистки
-- Trigger запускается с вероятностью 1% при каждой вставке challenge
CREATE OR REPLACE FUNCTION public.trigger_cleanup_challenges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- При каждой вставке с вероятностью ~1% запускаем очистку
  IF random() < 0.01 THEN
    PERFORM public.cleanup_expired_webauthn_challenges();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cleanup_challenges ON public.webauthn_challenges;
CREATE TRIGGER tr_cleanup_challenges
  AFTER INSERT ON public.webauthn_challenges
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_challenges();

-- ============================================
-- 7. Комментарии для документации
-- ============================================

COMMENT ON TABLE public.webauthn_challenges IS 
  'Временное хранение WebAuthn challenges для register/login. TTL: 2 минуты. Автоочистка через trigger/cron.';

COMMENT ON COLUMN public.webauthn_challenges.session_id IS 
  'Уникальный session ID, возвращается клиенту в begin. Используется для связи begin ↔ verify.';

COMMENT ON COLUMN public.webauthn_challenges.challenge IS 
  'Криптографически стойкий challenge (32 байта, base64url). Генерируется сервером.';

COMMENT ON COLUMN public.webauthn_challenges.challenge_type IS 
  'Тип операции: register (регистрация Passkey) или login (вход через Passkey).';

COMMENT ON COLUMN public.webauthn_challenges.user_id IS 
  'Для регистрации: ID пользователя, который регистрирует Passkey. Для входа: NULL.';

COMMENT ON COLUMN public.webauthn_challenges.expires_at IS 
  'Время истечения challenge (created_at + 2 минуты). Автоматически вычисляется.';

-- ============================================
-- ОПТИМИЗАЦИЯ: Статистика
-- ============================================

ANALYZE public.webauthn_challenges;

