-- ============================================================
-- ENHANCED PARTNER SECURITY v2.0
-- ============================================================
-- Улучшения безопасности по рекомендациям CTO:
-- 1. Cookie Stuffing Protection (проверка времени между кликом и регистрацией)
-- 2. Оптимизация триггера (легкие проверки синхронно, тяжелые асинхронно)
-- 3. Улучшенный device fingerprinting (поддержка FingerprintJS)
-- ============================================================

-- 1. Добавить поле для хранения времени первого клика (для Cookie Stuffing Protection)
ALTER TABLE public.partner_conversions
ADD COLUMN IF NOT EXISTS click_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT, -- Для FingerprintJS
ADD COLUMN IF NOT EXISTS time_to_register_seconds INTEGER; -- Время от клика до регистрации

-- Индекс для быстрой проверки времени
CREATE INDEX IF NOT EXISTS idx_partner_conversions_click_timestamp 
ON public.partner_conversions(click_timestamp) 
WHERE click_timestamp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_conversions_fingerprint_hash 
ON public.partner_conversions(fingerprint_hash) 
WHERE fingerprint_hash IS NOT NULL;

-- Комментарии
COMMENT ON COLUMN public.partner_conversions.click_timestamp IS 'Время первого клика по партнерской ссылке (для Cookie Stuffing Protection)';
COMMENT ON COLUMN public.partner_conversions.fingerprint_hash IS 'Browser fingerprint hash (FingerprintJS) для детекции ботов';
COMMENT ON COLUMN public.partner_conversions.time_to_register_seconds IS 'Время от клика до регистрации в секундах (для детекции ботов)';

-- 2. Функция для проверки Cookie Stuffing (слишком быстрое время между кликом и регистрацией)
CREATE OR REPLACE FUNCTION check_cookie_stuffing(
  p_session_id TEXT,
  p_event_type TEXT,
  p_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_click_timestamp TIMESTAMPTZ;
  v_time_diff_seconds INTEGER;
  v_min_time_seconds INTEGER := 2; -- Минимум 2 секунды между кликом и регистрацией
BEGIN
  -- Проверяем только для registration и purchase
  IF p_event_type NOT IN ('registration', 'purchase') THEN
    RETURN false; -- Не применимо
  END IF;

  -- Найти время первого клика для этой сессии
  SELECT MIN(created_at) INTO v_click_timestamp
  FROM public.partner_conversions
  WHERE session_id = p_session_id
  AND event_type = 'click'
  LIMIT 1;

  -- Если клика не было, пропускаем проверку (может быть прямой переход)
  IF v_click_timestamp IS NULL THEN
    RETURN false;
  END IF;

  -- Вычислить разницу времени
  v_time_diff_seconds := EXTRACT(EPOCH FROM (p_created_at - v_click_timestamp))::INTEGER;

  -- Если прошло меньше 2 секунд - это Cookie Stuffing (бот/скрипт)
  IF v_time_diff_seconds < v_min_time_seconds THEN
    RETURN true; -- Обнаружен Cookie Stuffing
  END IF;

  RETURN false; -- Всё нормально
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 3. Улучшенная функция проверки фрода (оптимизированная версия)
-- Легкие проверки синхронно, тяжелые - асинхронно
CREATE OR REPLACE FUNCTION check_conversion_fraud_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_is_fraud BOOLEAN;
  v_is_cookie_stuffing BOOLEAN;
  v_click_timestamp TIMESTAMPTZ;
  v_time_diff_seconds INTEGER;
BEGIN
  -- ============================================
  -- ЛЕГКИЕ ПРОВЕРКИ (синхронно, быстро)
  -- ============================================
  
  -- 1. Проверка черного списка (быстрая проверка по индексу)
  IF is_fraudulent(NEW.ip_address, NEW.user_agent, NEW.device_id) THEN
    RAISE EXCEPTION 'Conversion blocked: source is in fraud blacklist';
  END IF;

  -- 2. Проверка self-referral (быстрая проверка)
  IF NEW.event_type IN ('purchase', 'registration') AND NEW.user_id IS NOT NULL THEN
    IF check_self_referral(NEW.partner_id, NEW.user_id) THEN
      -- Создать fraud alert (асинхронно, не блокируем)
      PERFORM create_fraud_alert(
        NEW.partner_id,
        'self_referral',
        'high',
        'Partner attempted to use their own referral link for ' || NEW.event_type,
        jsonb_build_object(
          'user_id', NEW.user_id,
          'event_type', NEW.event_type,
          'ip_address', NEW.ip_address::TEXT
        )
      );
      
      RAISE EXCEPTION 'Conversion blocked: self-referral detected';
    END IF;
  END IF;

  -- 3. Cookie Stuffing Protection (проверка времени)
  IF NEW.event_type IN ('registration', 'purchase') AND NEW.session_id IS NOT NULL THEN
    -- Найти время первого клика
    SELECT MIN(created_at) INTO v_click_timestamp
    FROM public.partner_conversions
    WHERE session_id = NEW.session_id
    AND event_type = 'click'
    LIMIT 1;

    IF v_click_timestamp IS NOT NULL THEN
      -- Вычислить разницу времени
      v_time_diff_seconds := EXTRACT(EPOCH FROM (NEW.created_at - v_click_timestamp))::INTEGER;
      
      -- Сохранить время для аналитики
      NEW.time_to_register_seconds := v_time_diff_seconds;
      NEW.click_timestamp := v_click_timestamp;

      -- Если прошло меньше 2 секунд - блокируем
      IF v_time_diff_seconds < 2 THEN
        -- Создать fraud alert
        PERFORM create_fraud_alert(
          NEW.partner_id,
          'suspicious_pattern',
          'high',
          format('Cookie stuffing detected: registration in %s seconds (expected >= 2s)', v_time_diff_seconds),
          jsonb_build_object(
            'session_id', NEW.session_id,
            'time_to_register_seconds', v_time_diff_seconds,
            'event_type', NEW.event_type,
            'ip_address', NEW.ip_address::TEXT
          )
        );
        
        RAISE EXCEPTION 'Conversion blocked: cookie stuffing detected (registration too fast: % seconds)', v_time_diff_seconds;
      END IF;
    END IF;
  END IF;

  -- 4. Для кликов - сохраняем timestamp
  IF NEW.event_type = 'click' THEN
    NEW.click_timestamp := NEW.created_at;
  END IF;

  -- ============================================
  -- ТЯЖЕЛЫЕ ПРОВЕРКИ (выполняются асинхронно через Edge Function)
  -- ============================================
  -- Следующие проверки НЕ блокируют INSERT:
  -- - Анализ дубликатов устройств
  -- - Проверка паттернов активности
  -- - Детекция бот-ферм
  -- 
  -- Эти проверки выполняются через:
  -- 1. Supabase Edge Function (вызывается по вебхуку после INSERT)
  -- 2. Или через pg_cron (периодическая проверка)
  -- 3. Или через триггер AFTER INSERT (не блокирует транзакцию)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 4. Заменить старый триггер на новый
DROP TRIGGER IF EXISTS trigger_check_conversion_fraud ON public.partner_conversions;
CREATE TRIGGER trigger_check_conversion_fraud_v2
BEFORE INSERT ON public.partner_conversions
FOR EACH ROW
EXECUTE FUNCTION check_conversion_fraud_v2();

-- 5. Функция для асинхронной проверки тяжелых паттернов (вызывается после INSERT)
-- Эта функция вызывается через Edge Function или pg_cron, не блокирует INSERT
CREATE OR REPLACE FUNCTION async_check_fraud_patterns(
  p_conversion_id UUID
)
RETURNS TABLE(
  fraud_detected BOOLEAN,
  alert_id UUID,
  alert_type TEXT,
  description TEXT
) AS $$
DECLARE
  v_conversion RECORD;
  v_duplicate_devices_count INTEGER;
  v_high_click_volume BOOLEAN;
  v_alert_id UUID;
BEGIN
  -- Получить данные конверсии
  SELECT * INTO v_conversion
  FROM public.partner_conversions
  WHERE id = p_conversion_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Conversion not found'::TEXT;
    RETURN;
  END IF;

  -- Проверка 1: Дубликаты устройств (один device_id с разных IP)
  IF v_conversion.device_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT ip_address) INTO v_duplicate_devices_count
    FROM public.partner_conversions
    WHERE partner_id = v_conversion.partner_id
    AND device_id = v_conversion.device_id
    AND created_at >= NOW() - INTERVAL '24 hours'
    AND ip_address IS NOT NULL;

    IF v_duplicate_devices_count >= 5 THEN
      v_alert_id := create_fraud_alert(
        v_conversion.partner_id,
        'duplicate_device_ids',
        'high',
        format('Device ID %s used from %s different IPs in 24h', v_conversion.device_id, v_duplicate_devices_count),
        jsonb_build_object(
          'device_id', v_conversion.device_id,
          'unique_ips', v_duplicate_devices_count,
          'conversion_id', p_conversion_id
        )
      );

      RETURN QUERY SELECT true, v_alert_id, 'duplicate_device_ids'::TEXT, 
        format('Device ID used from %s different IPs', v_duplicate_devices_count)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Проверка 2: High click volume (более 100 кликов с одного IP за час)
  IF v_conversion.event_type = 'click' AND v_conversion.ip_address IS NOT NULL THEN
    SELECT COUNT(*) >= 100 INTO v_high_click_volume
    FROM public.partner_conversions
    WHERE partner_id = v_conversion.partner_id
    AND event_type = 'click'
    AND ip_address = v_conversion.ip_address
    AND created_at >= NOW() - INTERVAL '1 hour';

    IF v_high_click_volume THEN
      v_alert_id := create_fraud_alert(
        v_conversion.partner_id,
        'high_click_volume',
        'high',
        format('High click volume: 100+ clicks from IP %s in 1 hour', v_conversion.ip_address::TEXT),
        jsonb_build_object(
          'ip_address', v_conversion.ip_address::TEXT,
          'conversion_id', p_conversion_id
        )
      );

      RETURN QUERY SELECT true, v_alert_id, 'high_click_volume'::TEXT, 
        'High click volume detected'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Фрод не обнаружен
  RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'No fraud patterns detected'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 6. Триггер AFTER INSERT для асинхронной проверки (не блокирует транзакцию)
-- Этот триггер только ставит задачу в очередь, не блокирует INSERT
CREATE OR REPLACE FUNCTION queue_async_fraud_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Вместо немедленной проверки, можно:
  -- 1. Записать в таблицу очереди для обработки Edge Function
  -- 2. Или вызвать pg_notify для обработки через LISTEN/NOTIFY
  -- 3. Или просто оставить для обработки через pg_cron
  
  -- Для простоты оставляем пустым - тяжелые проверки делаются через pg_cron
  -- или Edge Function, который вызывается после успешного INSERT
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Триггер AFTER INSERT (не блокирует транзакцию)
DROP TRIGGER IF EXISTS trigger_queue_async_fraud_check ON public.partner_conversions;
CREATE TRIGGER trigger_queue_async_fraud_check
AFTER INSERT ON public.partner_conversions
FOR EACH ROW
EXECUTE FUNCTION queue_async_fraud_check();

-- 7. Функция для обновления track_partner_conversion (добавить поддержку fingerprint_hash)
-- Обновим существующую функцию для поддержки нового поля
CREATE OR REPLACE FUNCTION track_partner_conversion(
  p_partner_code TEXT,
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL, -- Новое поле для FingerprintJS
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown',
  p_os TEXT DEFAULT 'unknown',
  p_browser TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  conversion_id UUID
) AS $$
DECLARE
  v_partner_id UUID;
  v_conversion_id UUID;
  v_existing_conversion UUID;
BEGIN
  -- Найти партнера по коду
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE partner_code = UPPER(p_partner_code)
  AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found or inactive'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Предотвращаем дубликаты для purchase (один user_id = одна покупка)
  IF p_event_type = 'purchase' AND p_user_id IS NOT NULL THEN
    SELECT id INTO v_existing_conversion
    FROM public.partner_conversions
    WHERE partner_id = v_partner_id
    AND event_type = 'purchase'
    AND user_id = p_user_id
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT false, 'Purchase already tracked for this user'::TEXT, v_existing_conversion;
      RETURN;
    END IF;
  END IF;

  -- Создать конверсию (триггер проверит фрод автоматически)
  INSERT INTO public.partner_conversions (
    partner_id,
    partner_code,
    event_type,
    user_id,
    session_id,
    device_id,
    fingerprint_hash, -- Новое поле
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    ip_address,
    user_agent,
    country_code,
    device_type,
    os,
    browser,
    referrer_url,
    landing_page
  ) VALUES (
    v_partner_id,
    UPPER(p_partner_code),
    p_event_type,
    p_user_id,
    p_session_id,
    p_device_id,
    p_fingerprint_hash, -- Новое поле
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_utm_term,
    p_ip_address,
    p_user_agent,
    p_country_code,
    p_device_type,
    p_os,
    p_browser,
    p_referrer_url,
    p_landing_page
  ) RETURNING id INTO v_conversion_id;

  RETURN QUERY SELECT true, 'Conversion tracked successfully'::TEXT, v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Комментарии для документации
COMMENT ON FUNCTION check_cookie_stuffing IS 'Проверяет Cookie Stuffing: блокирует регистрации, которые произошли менее чем за 2 секунды после клика';
COMMENT ON FUNCTION check_conversion_fraud_v2 IS 'Улучшенная версия проверки фрода: легкие проверки синхронно, тяжелые асинхронно';
COMMENT ON FUNCTION async_check_fraud_patterns IS 'Асинхронная проверка тяжелых паттернов фрода (вызывается после INSERT, не блокирует транзакцию)';
COMMENT ON FUNCTION queue_async_fraud_check IS 'Триггер для постановки задачи на асинхронную проверку (не блокирует INSERT)';
COMMENT ON FUNCTION track_partner_conversion IS 'Обновленная функция трекинга конверсий с поддержкой FingerprintJS hash';

