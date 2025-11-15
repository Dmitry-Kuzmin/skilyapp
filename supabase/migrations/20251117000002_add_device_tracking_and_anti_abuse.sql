-- ============================================
-- Device Tracking & Anti-Abuse System
-- Мягкие меры защиты от передачи аккаунтов
-- ============================================

-- 1. Таблица для отслеживания устройств пользователей
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT, -- Описание устройства (например, "iPhone 14 Pro", "Chrome on Windows")
  user_agent TEXT,
  ip_address INET,
  platform TEXT, -- 'web', 'telegram', 'ios', 'android'
  is_trusted BOOLEAN NOT NULL DEFAULT false, -- Доверенное устройство (после верификации)
  verified_at TIMESTAMPTZ, -- Когда устройство было верифицировано
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id 
ON public.user_devices(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint 
ON public.user_devices(device_fingerprint);

-- 2. Таблица активных сессий пользователей
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.user_devices(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
ON public.user_sessions(user_id, is_active, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
ON public.user_sessions(session_token) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
ON public.user_sessions(expires_at) 
WHERE is_active = true;

-- 3. Таблица истории смены паролей (для cooldown)
CREATE TABLE IF NOT EXISTS public.password_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_change_history_user 
ON public.password_change_history(user_id, changed_at DESC);

-- 4. Функция для регистрации/обновления устройства
CREATE OR REPLACE FUNCTION register_or_update_device(
  p_user_id UUID,
  p_device_fingerprint TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_platform TEXT DEFAULT 'web'
)
RETURNS TABLE (
  device_id UUID,
  is_new_device BOOLEAN,
  device_count INTEGER,
  requires_verification BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device_id UUID;
  v_is_new BOOLEAN := false;
  v_device_count INTEGER;
  v_requires_verification BOOLEAN := false;
  v_max_devices INTEGER := 2; -- Максимум 2 устройства без верификации
BEGIN
  -- Проверяем, существует ли уже это устройство
  SELECT id INTO v_device_id
  FROM user_devices
  WHERE user_id = p_user_id AND device_fingerprint = p_device_fingerprint;
  
  IF v_device_id IS NULL THEN
    -- Новое устройство
    v_is_new := true;
    
    -- Подсчитываем количество устройств пользователя
    SELECT COUNT(*) INTO v_device_count
    FROM user_devices
    WHERE user_id = p_user_id;
    
    -- Если устройств больше 2, требуется верификация
    IF v_device_count >= v_max_devices THEN
      v_requires_verification := true;
    END IF;
    
    -- Создаем новое устройство
    INSERT INTO user_devices (
      user_id,
      device_fingerprint,
      device_name,
      user_agent,
      ip_address,
      platform,
      is_trusted,
      first_seen_at,
      last_seen_at
    )
    VALUES (
      p_user_id,
      p_device_fingerprint,
      p_device_name,
      p_user_agent,
      p_ip_address,
      p_platform,
      NOT v_requires_verification, -- Автоматически доверенное, если <= 2 устройств
      NOW(),
      NOW()
    )
    RETURNING id INTO v_device_id;
    
    v_device_count := v_device_count + 1;
  ELSE
    -- Обновляем существующее устройство
    UPDATE user_devices
    SET 
      last_seen_at = NOW(),
      user_agent = COALESCE(p_user_agent, user_agent),
      ip_address = COALESCE(p_ip_address, ip_address),
      device_name = COALESCE(p_device_name, device_name)
    WHERE id = v_device_id;
    
    SELECT COUNT(*) INTO v_device_count
    FROM user_devices
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT 
    v_device_id,
    v_is_new,
    v_device_count,
    v_requires_verification,
    CASE 
      WHEN v_is_new AND v_requires_verification THEN 
        'Новое устройство требует верификации. Максимум 2 устройства без подтверждения.'
      WHEN v_is_new THEN 
        'Новое устройство зарегистрировано'
      ELSE 
        'Устройство обновлено'
    END::TEXT;
END;
$$;

-- 5. Функция для создания/обновления сессии с ограничением одновременных сессий
CREATE OR REPLACE FUNCTION create_or_update_session(
  p_user_id UUID,
  p_device_id UUID,
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_max_sessions INTEGER DEFAULT 1 -- Только 1 активная сессия
)
RETURNS TABLE (
  session_id UUID,
  previous_sessions_closed INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_closed_count INTEGER := 0;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Время истечения сессии: 30 дней
  v_expires_at := NOW() + INTERVAL '30 days';
  
  -- Закрываем все предыдущие активные сессии (только 1 активная сессия)
  UPDATE user_sessions
  SET is_active = false
  WHERE user_id = p_user_id 
    AND is_active = true
    AND session_token != p_session_token;
  
  GET DIAGNOSTICS v_closed_count = ROW_COUNT;
  
  -- Проверяем, существует ли уже сессия с таким токеном
  SELECT id INTO v_session_id
  FROM user_sessions
  WHERE session_token = p_session_token;
  
  IF v_session_id IS NULL THEN
    -- Создаем новую сессию
    INSERT INTO user_sessions (
      user_id,
      device_id,
      session_token,
      ip_address,
      user_agent,
      is_active,
      expires_at,
      last_activity_at
    )
    VALUES (
      p_user_id,
      p_device_id,
      p_session_token,
      p_ip_address,
      p_user_agent,
      true,
      v_expires_at,
      NOW()
    )
    RETURNING id INTO v_session_id;
  ELSE
    -- Обновляем существующую сессию
    UPDATE user_sessions
    SET 
      is_active = true,
      last_activity_at = NOW(),
      expires_at = v_expires_at,
      device_id = COALESCE(p_device_id, device_id),
      ip_address = COALESCE(p_ip_address, ip_address),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = v_session_id;
  END IF;
  
  RETURN QUERY SELECT 
    v_session_id,
    v_closed_count,
    CASE 
      WHEN v_closed_count > 0 THEN 
        format('Создана новая сессия. Закрыто предыдущих активных сессий: %s', v_closed_count)
      ELSE 
        'Сессия создана/обновлена'
    END::TEXT;
END;
$$;

-- 6. Функция для проверки возможности смены пароля (cooldown 7 дней)
CREATE OR REPLACE FUNCTION can_change_password(p_user_id UUID)
RETURNS TABLE (
  can_change BOOLEAN,
  last_change_date TIMESTAMPTZ,
  days_remaining INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_change TIMESTAMPTZ;
  v_cooldown_days INTEGER := 7;
  v_days_remaining INTEGER;
BEGIN
  -- Получаем дату последней смены пароля
  SELECT MAX(changed_at) INTO v_last_change
  FROM password_change_history
  WHERE user_id = p_user_id;
  
  IF v_last_change IS NULL THEN
    -- Пароль никогда не менялся
    RETURN QUERY SELECT true, NULL::TIMESTAMPTZ, 0, 'Пароль можно изменить'::TEXT;
    RETURN;
  END IF;
  
  -- Вычисляем сколько дней прошло
  v_days_remaining := v_cooldown_days - EXTRACT(EPOCH FROM (NOW() - v_last_change))::INTEGER / 86400;
  
  IF v_days_remaining <= 0 THEN
    -- Cooldown прошел
    RETURN QUERY SELECT true, v_last_change, 0, 'Пароль можно изменить'::TEXT;
  ELSE
    -- Cooldown еще активен
    RETURN QUERY SELECT 
      false, 
      v_last_change, 
      v_days_remaining, 
      format('Смена пароля доступна через %s дней', v_days_remaining)::TEXT;
  END IF;
END;
$$;

-- 7. Функция для регистрации смены пароля
CREATE OR REPLACE FUNCTION register_password_change(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_change_id UUID;
BEGIN
  INSERT INTO password_change_history (
    user_id,
    ip_address,
    device_fingerprint,
    changed_at
  )
  VALUES (
    p_user_id,
    p_ip_address,
    p_device_fingerprint,
    NOW()
  )
  RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$;

-- 8. Функция для очистки истекших сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- 9. Функция для получения активных устройств пользователя
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  device_name TEXT,
  platform TEXT,
  is_trusted BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ud.id,
    ud.device_name,
    ud.platform,
    ud.is_trusted,
    ud.last_seen_at,
    ud.first_seen_at
  FROM user_devices ud
  WHERE ud.user_id = p_user_id
  ORDER BY ud.last_seen_at DESC;
END;
$$;

-- 10. Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies для user_devices
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can manage devices"
  ON public.user_devices FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies для user_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can manage sessions"
  ON public.user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies для password_change_history
CREATE POLICY "Users can view their own password history"
  ON public.password_change_history FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can manage password history"
  ON public.password_change_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- 11. Комментарии
COMMENT ON TABLE public.user_devices IS 'Отслеживание устройств пользователей для защиты от передачи аккаунтов';
COMMENT ON TABLE public.user_sessions IS 'Активные сессии пользователей (максимум 1 одновременная сессия)';
COMMENT ON TABLE public.password_change_history IS 'История смены паролей для cooldown (7 дней)';
COMMENT ON FUNCTION register_or_update_device(UUID, TEXT, TEXT, TEXT, INET, TEXT) IS 'Регистрирует или обновляет устройство пользователя. Требует верификации при >2 устройствах';
COMMENT ON FUNCTION create_or_update_session(UUID, UUID, TEXT, INET, TEXT, INTEGER) IS 'Создает или обновляет сессию. Закрывает предыдущие активные сессии (только 1 активная)';
COMMENT ON FUNCTION can_change_password(UUID) IS 'Проверяет возможность смены пароля (cooldown 7 дней)';
COMMENT ON FUNCTION register_password_change(UUID, INET, TEXT) IS 'Регистрирует факт смены пароля для отслеживания cooldown';

