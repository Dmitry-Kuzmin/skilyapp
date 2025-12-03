-- ============================================
-- Migration: Passkey Credentials (WebAuthn)
-- ============================================
-- Создаём минималистичную таблицу для хранения Passkey credentials
-- Оптимизировано для минимальной нагрузки на Supabase

-- ============================================
-- 1. Создание таблицы
-- ============================================

CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- WebAuthn данные
  credential_id text NOT NULL UNIQUE, -- Base64URL encoded credential ID
  public_key bytea NOT NULL, -- Публичный ключ (COSE format)
  counter bigint NOT NULL DEFAULT 0, -- Signature counter для защиты от replay attacks
  
  -- Metadata
  device_name text, -- Опциональное название устройства (MacBook Pro, iPhone)
  transports text[], -- ['usb', 'nfc', 'ble', 'internal'] - для UX подсказок
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- ============================================
-- 2. Foreign Key (если ещё не создан)
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passkey_credentials_user_id_fkey'
  ) THEN
    ALTER TABLE public.passkey_credentials
    ADD CONSTRAINT passkey_credentials_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 3. Индексы (ТОЛЬКО необходимые)
-- ============================================

-- Поиск по user_id (при входе и в Settings)
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id 
  ON public.passkey_credentials(user_id);

-- Уникальный поиск по credential_id (при верификации)
CREATE UNIQUE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id 
  ON public.passkey_credentials(credential_id);

-- Для сортировки в UI (последние использованные сверху)
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_last_used 
  ON public.passkey_credentials(user_id, last_used_at DESC NULLS LAST);

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои passkeys
DROP POLICY IF EXISTS "Users can view own passkeys" ON public.passkey_credentials;
CREATE POLICY "Users can view own passkeys"
  ON public.passkey_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Пользователь может удалить только свои passkeys
DROP POLICY IF EXISTS "Users can delete own passkeys" ON public.passkey_credentials;
CREATE POLICY "Users can delete own passkeys"
  ON public.passkey_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT и UPDATE только через Edge Functions (service_role)
-- Не создаём политики для INSERT/UPDATE - это будет делать только backend

-- ============================================
-- 5. Комментарии для документации
-- ============================================

COMMENT ON TABLE public.passkey_credentials IS 
  'Хранит WebAuthn credentials (Passkeys) для passwordless аутентификации. Только для WEB-версии приложения.';

COMMENT ON COLUMN public.passkey_credentials.credential_id IS 
  'Уникальный идентификатор credential (Base64URL). Генерируется браузером при регистрации.';

COMMENT ON COLUMN public.passkey_credentials.public_key IS 
  'Публичный ключ в формате COSE для верификации подписей.';

COMMENT ON COLUMN public.passkey_credentials.counter IS 
  'Signature counter для защиты от replay attacks. Инкрементируется при каждом использовании.';

COMMENT ON COLUMN public.passkey_credentials.transports IS 
  'Массив методов транспорта: usb, nfc, ble, internal. Используется для UX подсказок.';

-- ============================================
-- 6. Функция для обновления last_used_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_passkey_last_used(
  p_credential_id text,
  p_new_counter bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами владельца (для service_role)
SET search_path = public
AS $$
BEGIN
  -- Обновляем last_used_at и counter за один запрос
  UPDATE public.passkey_credentials
  SET 
    last_used_at = now(),
    counter = p_new_counter
  WHERE credential_id = p_credential_id;
END;
$$;

COMMENT ON FUNCTION public.update_passkey_last_used IS 
  'Обновляет last_used_at и counter при успешном входе через Passkey. Вызывается из Edge Function.';

-- ============================================
-- 7. Функция для получения passkey по credential_id
-- ============================================

CREATE OR REPLACE FUNCTION public.get_passkey_for_verification(
  p_credential_id text
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  public_key bytea,
  counter bigint,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.user_id,
    pc.public_key,
    pc.counter,
    u.email
  FROM public.passkey_credentials pc
  JOIN auth.users u ON u.id = pc.user_id
  WHERE pc.credential_id = p_credential_id;
END;
$$;

COMMENT ON FUNCTION public.get_passkey_for_verification IS 
  'Получает данные passkey для верификации. Вызывается из Edge Function при входе.';

-- ============================================
-- ОПТИМИЗАЦИЯ: Статистика
-- ============================================

-- Обновляем статистику для оптимизатора запросов
ANALYZE public.passkey_credentials;

