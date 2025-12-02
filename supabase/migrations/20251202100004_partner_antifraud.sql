-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 4: Антифрод 2.0
-- ============================================================
-- Цель: Детектировать мошенничество (боты, накрутка, self-referral)
-- ============================================================

-- 1. Таблица черного списка (IP, User-Agent, Device ID)
CREATE TABLE IF NOT EXISTS public.fraud_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('ip', 'user_agent', 'device_id', 'email', 'pattern')),
  value TEXT NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id), -- Кто заблокировал
  blocked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Опционально: временная блокировка
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(type, value)
);

CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_type_value ON public.fraud_blacklist(type, value) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_active ON public.fraud_blacklist(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.fraud_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud blacklist"
ON public.fraud_blacklist
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. Таблица fraud alerts (подозрительная активность)
CREATE TABLE IF NOT EXISTS public.partner_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
  -- Alert info
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'high_click_volume', -- Много кликов с одного IP
    'low_conversion', -- Конверсия <0.1% (боты)
    'self_referral', -- Партнер использовал свою ссылку
    'duplicate_device_ids', -- Один device_id с разных IP
    'suspicious_pattern', -- Другие паттерны
    'multiple_accounts' -- Подозрение на несколько аккаунтов
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Details
  description TEXT NOT NULL,
  metadata JSONB, -- Дополнительные данные для анализа
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_positive', 'confirmed_fraud')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Actions taken
  action_taken TEXT, -- 'warned', 'suspended', 'banned', 'none'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_fraud_alerts_partner_id ON public.partner_fraud_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_fraud_alerts_status ON public.partner_fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_partner_fraud_alerts_severity ON public.partner_fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_partner_fraud_alerts_created_at ON public.partner_fraud_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud alerts"
ON public.partner_fraud_alerts
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. Функция для проверки, заблокирован ли элемент
CREATE OR REPLACE FUNCTION is_fraudulent(
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.fraud_blacklist
    WHERE is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      (type = 'ip' AND p_ip IS NOT NULL AND value = p_ip::TEXT)
      OR (type = 'user_agent' AND p_user_agent IS NOT NULL AND value = p_user_agent)
      OR (type = 'device_id' AND p_device_id IS NOT NULL AND value = p_device_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция для детектирования self-referral
CREATE OR REPLACE FUNCTION check_self_referral(
  p_partner_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверка: является ли user_id владельцем партнерского аккаунта
  RETURN EXISTS (
    SELECT 1 FROM public.partners
    WHERE id = p_partner_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для автоматического детектирования подозрительной активности
-- Вызывается периодически (cron) или после определенных событий
CREATE OR REPLACE FUNCTION detect_partner_fraud_patterns()
RETURNS TABLE(
  partner_id UUID,
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  metadata JSONB
) AS $$
BEGIN
  -- 1. High click volume from single IP (>100 кликов с одного IP за 1 час)
  RETURN QUERY
  WITH high_ip_clicks AS (
    SELECT 
      pc.partner_id,
      pc.ip_address,
      COUNT(*) as click_count
    FROM public.partner_conversions pc
    WHERE pc.event_type = 'click'
    AND pc.created_at >= NOW() - INTERVAL '1 hour'
    AND pc.ip_address IS NOT NULL
    GROUP BY pc.partner_id, pc.ip_address
    HAVING COUNT(*) >= 100
  )
  SELECT 
    hic.partner_id,
    'high_click_volume'::TEXT,
    'high'::TEXT,
    format('%s clicks from single IP %s in last hour', hic.click_count, hic.ip_address),
    jsonb_build_object(
      'ip_address', hic.ip_address::TEXT,
      'click_count', hic.click_count,
      'timeframe', '1 hour'
    )
  FROM high_ip_clicks hic;

  -- 2. Low conversion rate (<0.1% клик -> покупка)
  RETURN QUERY
  WITH partner_conversion_rates AS (
    SELECT 
      pc.partner_id,
      COUNT(*) FILTER (WHERE pc.event_type = 'click') as clicks,
      COUNT(*) FILTER (WHERE pc.event_type = 'purchase') as purchases
    FROM public.partner_conversions pc
    WHERE pc.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY pc.partner_id
    HAVING COUNT(*) FILTER (WHERE pc.event_type = 'click') >= 1000 -- Только если много кликов
  )
  SELECT 
    pcr.partner_id,
    'low_conversion'::TEXT,
    'critical'::TEXT,
    format('Conversion rate: %.3f%% (%s purchases / %s clicks)', 
      (pcr.purchases::DECIMAL / pcr.clicks::DECIMAL) * 100,
      pcr.purchases,
      pcr.clicks
    ),
    jsonb_build_object(
      'clicks', pcr.clicks,
      'purchases', pcr.purchases,
      'conversion_rate', (pcr.purchases::DECIMAL / pcr.clicks::DECIMAL) * 100
    )
  FROM partner_conversion_rates pcr
  WHERE (pcr.purchases::DECIMAL / pcr.clicks::DECIMAL) < 0.001; -- <0.1%

  -- 3. Duplicate device IDs from different IPs (один device_id с >5 разных IP)
  RETURN QUERY
  WITH duplicate_devices AS (
    SELECT 
      pc.partner_id,
      pc.device_id,
      COUNT(DISTINCT pc.ip_address) as unique_ips,
      COUNT(*) as total_events
    FROM public.partner_conversions pc
    WHERE pc.device_id IS NOT NULL
    AND pc.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY pc.partner_id, pc.device_id
    HAVING COUNT(DISTINCT pc.ip_address) >= 5
  )
  SELECT 
    dd.partner_id,
    'duplicate_device_ids'::TEXT,
    'high'::TEXT,
    format('Device ID %s used from %s different IPs', dd.device_id, dd.unique_ips),
    jsonb_build_object(
      'device_id', dd.device_id,
      'unique_ips', dd.unique_ips,
      'total_events', dd.total_events
    )
  FROM duplicate_devices dd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для создания fraud alert
CREATE OR REPLACE FUNCTION create_fraud_alert(
  p_partner_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_existing_alert UUID;
BEGIN
  -- Проверить, нет ли уже такого же pending alert
  SELECT id INTO v_existing_alert
  FROM public.partner_fraud_alerts
  WHERE partner_id = p_partner_id
  AND alert_type = p_alert_type
  AND status = 'pending'
  AND created_at >= NOW() - INTERVAL '24 hours'
  LIMIT 1;

  IF FOUND THEN
    -- Уже есть похожий alert, обновляем его
    UPDATE public.partner_fraud_alerts
    SET 
      description = p_description,
      metadata = p_metadata,
      updated_at = NOW()
    WHERE id = v_existing_alert;
    
    RETURN v_existing_alert;
  END IF;

  -- Создать новый alert
  INSERT INTO public.partner_fraud_alerts (
    partner_id,
    alert_type,
    severity,
    description,
    metadata,
    status
  ) VALUES (
    p_partner_id,
    p_alert_type,
    p_severity,
    p_description,
    p_metadata,
    'pending'
  ) RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для разрешения fraud alert
CREATE OR REPLACE FUNCTION resolve_fraud_alert(
  p_alert_id UUID,
  p_resolution TEXT, -- 'resolved', 'false_positive', 'confirmed_fraud'
  p_resolution_notes TEXT DEFAULT NULL,
  p_action_taken TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Проверка прав
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN QUERY SELECT false, 'Only admins can resolve fraud alerts'::TEXT;
    RETURN;
  END IF;

  -- Обновить alert
  UPDATE public.partner_fraud_alerts
  SET 
    status = p_resolution,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes,
    action_taken = p_action_taken,
    updated_at = NOW()
  WHERE id = p_alert_id
  AND status IN ('pending', 'investigating');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Alert not found or already resolved'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Alert resolved successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Функция для добавления в blacklist
CREATE OR REPLACE FUNCTION add_to_fraud_blacklist(
  p_type TEXT,
  p_value TEXT,
  p_reason TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Проверка прав
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN QUERY SELECT false, 'Only admins can add to blacklist'::TEXT;
    RETURN;
  END IF;

  -- Вычислить expires_at
  IF p_expires_days IS NOT NULL AND p_expires_days > 0 THEN
    v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
  END IF;

  -- Добавить в blacklist (или обновить если уже есть)
  INSERT INTO public.fraud_blacklist (
    type,
    value,
    reason,
    blocked_by,
    expires_at,
    is_active
  ) VALUES (
    p_type,
    p_value,
    p_reason,
    auth.uid(),
    v_expires_at,
    true
  )
  ON CONFLICT (type, value) 
  DO UPDATE SET
    is_active = true,
    reason = EXCLUDED.reason,
    blocked_by = EXCLUDED.blocked_by,
    blocked_at = NOW(),
    expires_at = EXCLUDED.expires_at;

  RETURN QUERY SELECT true, 'Added to blacklist successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Функция для получения pending fraud alerts
CREATE OR REPLACE FUNCTION get_pending_fraud_alerts(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  alert_id UUID,
  partner_id UUID,
  partner_name TEXT,
  partner_code TEXT,
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pfa.id as alert_id,
    pfa.partner_id,
    p.name as partner_name,
    p.partner_code,
    pfa.alert_type,
    pfa.severity,
    pfa.description,
    pfa.metadata,
    pfa.created_at
  FROM public.partner_fraud_alerts pfa
  JOIN public.partners p ON pfa.partner_id = p.id
  WHERE pfa.status = 'pending'
  ORDER BY 
    CASE pfa.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    pfa.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Триггер для автоматической блокировки конверсий от заблокированных источников
CREATE OR REPLACE FUNCTION check_conversion_fraud()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверка IP, User-Agent, Device ID
  IF is_fraudulent(NEW.ip_address, NEW.user_agent, NEW.device_id) THEN
    RAISE EXCEPTION 'Conversion blocked: source is in fraud blacklist';
  END IF;

  -- Проверка self-referral для покупок
  IF NEW.event_type IN ('purchase', 'registration') AND NEW.user_id IS NOT NULL THEN
    IF check_self_referral(NEW.partner_id, NEW.user_id) THEN
      -- Создать fraud alert
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_conversion_fraud ON public.partner_conversions;
CREATE TRIGGER trigger_check_conversion_fraud
BEFORE INSERT ON public.partner_conversions
FOR EACH ROW
EXECUTE FUNCTION check_conversion_fraud();

-- Комментарии для документации
COMMENT ON TABLE public.fraud_blacklist IS 'Черный список IP, User-Agent, Device ID для защиты от ботов и мошенников';
COMMENT ON TABLE public.partner_fraud_alerts IS 'Оповещения о подозрительной активности партнеров';

COMMENT ON FUNCTION is_fraudulent IS 'Проверяет, находится ли IP/UA/Device в черном списке';
COMMENT ON FUNCTION check_self_referral IS 'Проверяет, использует ли партнер свою собственную ссылку';
COMMENT ON FUNCTION detect_partner_fraud_patterns IS 'Автоматически детектирует подозрительные паттерны активности';
COMMENT ON FUNCTION create_fraud_alert IS 'Создает оповещение о fraud для рассмотрения админом';
COMMENT ON FUNCTION resolve_fraud_alert IS 'Разрешает fraud alert (админ)';
COMMENT ON FUNCTION add_to_fraud_blacklist IS 'Добавляет элемент в черный список (админ)';
COMMENT ON FUNCTION get_pending_fraud_alerts IS 'Возвращает pending fraud alerts для админ-панели';


