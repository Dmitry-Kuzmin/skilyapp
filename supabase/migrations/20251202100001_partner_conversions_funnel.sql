-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 1: Воронка Конверсий
-- ============================================================
-- Цель: Отслеживать полный путь пользователя от клика до покупки
-- Воронка: Click → Install → Registration → Purchase
-- ============================================================

-- 1. Таблица для отслеживания воронки конверсий
CREATE TABLE IF NOT EXISTS public.partner_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL,
  
  -- Воронка: click → install → registration → purchase
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'install', 'registration', 'purchase')),
  
  -- Tracking (связываем анонимные клики с регистрацией)
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT, -- Генерируется на фронте (uuidv4), сохраняется в localStorage
  device_id TEXT, -- Для мобильных приложений (Device Fingerprint)
  
  -- UTM метки (для deep links и аналитики источников)
  utm_source TEXT, -- 'youtube', 'telegram', 'instagram'
  utm_medium TEXT, -- 'social', 'email', 'referral'
  utm_campaign TEXT, -- 'review-20dec', 'black-friday'
  utm_content TEXT, -- 'video-thumbnail', 'story-1'
  utm_term TEXT, -- Ключевые слова (для контекстной рекламы)
  
  -- География и устройство (для аналитики и антифрода)
  ip_address INET,
  user_agent TEXT,
  country_code TEXT, -- 'ES', 'RU', 'US' (определяется по IP)
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  os TEXT CHECK (os IN ('ios', 'android', 'web', 'windows', 'macos', 'linux', 'unknown')),
  browser TEXT, -- 'chrome', 'safari', 'firefox'
  
  -- Для event_type = 'purchase'
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  purchase_amount DECIMAL(10,2), -- Сумма покупки (например, €10.00)
  commission_amount DECIMAL(10,2), -- Комиссия партнера (например, €3.00 при 30%)
  commission_rate DECIMAL(5,2), -- Процент комиссии (0.30 = 30%)
  
  -- Метаданные
  referrer_url TEXT, -- Откуда пришел пользователь
  landing_page TEXT, -- На какую страницу приземлился
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрой выборки и аналитики
CREATE INDEX IF NOT EXISTS idx_partner_conversions_partner_id ON public.partner_conversions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_event_type ON public.partner_conversions(event_type);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_session_id ON public.partner_conversions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_conversions_user_id ON public.partner_conversions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_conversions_created_at ON public.partner_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_purchase_id ON public.partner_conversions(purchase_id) WHERE purchase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_conversions_utm_campaign ON public.partner_conversions(utm_campaign) WHERE utm_campaign IS NOT NULL;

-- Композитный индекс для аналитики по партнеру и дате
CREATE INDEX IF NOT EXISTS idx_partner_conversions_partner_date ON public.partner_conversions(partner_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Партнеры видят только свои конверсии
CREATE POLICY "Partners can view their conversions"
ON public.partner_conversions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_conversions.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Админы видят всё
CREATE POLICY "Admins can view all conversions"
ON public.partner_conversions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Любой может создать конверсию (для трекинга кликов от анонимов)
CREATE POLICY "Anyone can track conversions"
ON public.partner_conversions
FOR INSERT
WITH CHECK (true);

-- 2. Функция для трекинга конверсий (вызывается из фронтенда)
CREATE OR REPLACE FUNCTION track_partner_conversion(
  p_partner_code TEXT,
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
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
      -- Уже есть покупка от этого юзера через этого партнера
      RETURN QUERY SELECT false, 'Purchase already tracked for this user'::TEXT, v_existing_conversion;
      RETURN;
    END IF;
  END IF;

  -- Записать событие конверсии
  INSERT INTO public.partner_conversions (
    partner_id,
    partner_code,
    event_type,
    user_id,
    session_id,
    device_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Функция для получения агрегированной статистики воронки
CREATE OR REPLACE FUNCTION get_partner_funnel_stats(
  p_partner_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  clicks BIGINT,
  installs BIGINT,
  registrations BIGINT,
  purchases BIGINT,
  click_to_install_rate DECIMAL,
  install_to_reg_rate DECIMAL,
  reg_to_purchase_rate DECIMAL,
  overall_conversion_rate DECIMAL,
  total_revenue DECIMAL,
  total_commission DECIMAL,
  avg_commission_per_purchase DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
      COUNT(*) FILTER (WHERE event_type = 'install') as installs,
      COUNT(*) FILTER (WHERE event_type = 'registration') as registrations,
      COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
      COALESCE(SUM(purchase_amount) FILTER (WHERE event_type = 'purchase'), 0) as revenue,
      COALESCE(SUM(commission_amount) FILTER (WHERE event_type = 'purchase'), 0) as commission
    FROM public.partner_conversions
    WHERE partner_id = p_partner_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  )
  SELECT
    clicks::BIGINT,
    installs::BIGINT,
    registrations::BIGINT,
    purchases::BIGINT,
    -- Конверсия клик → установка
    CASE WHEN clicks > 0 THEN ROUND((installs::DECIMAL / clicks::DECIMAL) * 100, 2) ELSE 0 END as click_to_install_rate,
    -- Конверсия установка → регистрация
    CASE WHEN installs > 0 THEN ROUND((registrations::DECIMAL / installs::DECIMAL) * 100, 2) ELSE 0 END as install_to_reg_rate,
    -- Конверсия регистрация → покупка (САМОЕ ВАЖНОЕ!)
    CASE WHEN registrations > 0 THEN ROUND((purchases::DECIMAL / registrations::DECIMAL) * 100, 2) ELSE 0 END as reg_to_purchase_rate,
    -- Общая конверсия клик → покупка
    CASE WHEN clicks > 0 THEN ROUND((purchases::DECIMAL / clicks::DECIMAL) * 100, 2) ELSE 0 END as overall_conversion_rate,
    revenue::DECIMAL as total_revenue,
    commission::DECIMAL as total_commission,
    CASE WHEN purchases > 0 THEN ROUND(commission / purchases, 2) ELSE 0 END as avg_commission_per_purchase
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция для получения детальной статистики по дням (для графиков)
CREATE OR REPLACE FUNCTION get_partner_funnel_by_day(
  p_partner_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  clicks BIGINT,
  installs BIGINT,
  registrations BIGINT,
  purchases BIGINT,
  revenue DECIMAL,
  commission DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE event_type = 'install') as installs,
    COUNT(*) FILTER (WHERE event_type = 'registration') as registrations,
    COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
    COALESCE(SUM(purchase_amount) FILTER (WHERE event_type = 'purchase'), 0)::DECIMAL as revenue,
    COALESCE(SUM(commission_amount) FILTER (WHERE event_type = 'purchase'), 0)::DECIMAL as commission
  FROM public.partner_conversions
  WHERE partner_id = p_partner_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для получения Top UTM кампаний (ROI анализ)
CREATE OR REPLACE FUNCTION get_partner_top_campaigns(
  p_partner_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  utm_campaign TEXT,
  clicks BIGINT,
  registrations BIGINT,
  purchases BIGINT,
  revenue DECIMAL,
  commission DECIMAL,
  click_to_purchase_rate DECIMAL,
  roi DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pc.utm_campaign, 'direct') as utm_campaign,
    COUNT(*) FILTER (WHERE pc.event_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE pc.event_type = 'registration') as registrations,
    COUNT(*) FILTER (WHERE pc.event_type = 'purchase') as purchases,
    COALESCE(SUM(pc.purchase_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as revenue,
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as commission,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE pc.event_type = 'purchase')::DECIMAL / 
         COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL) * 100, 
        2
      )
      ELSE 0 
    END as click_to_purchase_rate,
    -- ROI: сколько заработано на 1 клик (для оценки эффективности кампании)
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.event_type = 'purchase'), 0) / 
        COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL,
        4
      )
      ELSE 0 
    END as roi
  FROM public.partner_conversions pc
  WHERE pc.partner_id = p_partner_id
  AND pc.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pc.utm_campaign
  ORDER BY commission DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для получения географической статистики
CREATE OR REPLACE FUNCTION get_partner_geo_stats(
  p_partner_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  country_code TEXT,
  clicks BIGINT,
  registrations BIGINT,
  purchases BIGINT,
  revenue DECIMAL,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pc.country_code, 'unknown') as country_code,
    COUNT(*) FILTER (WHERE pc.event_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE pc.event_type = 'registration') as registrations,
    COUNT(*) FILTER (WHERE pc.event_type = 'purchase') as purchases,
    COALESCE(SUM(pc.purchase_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as revenue,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE pc.event_type = 'purchase')::DECIMAL / 
         COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL) * 100, 
        2
      )
      ELSE 0 
    END as conversion_rate
  FROM public.partner_conversions pc
  WHERE pc.partner_id = p_partner_id
  AND pc.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pc.country_code
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для связывания анонимных кликов с регистрацией (по session_id)
-- Вызывается после регистрации пользователя
CREATE OR REPLACE FUNCTION link_session_to_user(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Обновить все конверсии с этим session_id, добавить user_id
  UPDATE public.partner_conversions
  SET user_id = p_user_id
  WHERE session_id = p_session_id
  AND user_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии для документации
COMMENT ON TABLE public.partner_conversions IS 'Таблица для отслеживания воронки конверсий партнерской программы (click → install → registration → purchase)';
COMMENT ON COLUMN public.partner_conversions.session_id IS 'Генерируется на фронте при первом визите, связывает анонимные клики с регистрацией';
COMMENT ON COLUMN public.partner_conversions.commission_rate IS 'Процент комиссии на момент покупки (например, 0.30 = 30%)';

COMMENT ON FUNCTION track_partner_conversion IS 'Записывает событие в воронку конверсий (вызывается из фронтенда и Edge Functions)';
COMMENT ON FUNCTION get_partner_funnel_stats IS 'Возвращает агрегированную статистику воронки для отображения в кабинете партнера';
COMMENT ON FUNCTION get_partner_funnel_by_day IS 'Возвращает статистику по дням для графиков динамики конверсий';
COMMENT ON FUNCTION get_partner_top_campaigns IS 'Возвращает топ UTM-кампаний по revenue и ROI';
COMMENT ON FUNCTION get_partner_geo_stats IS 'Возвращает статистику по странам (для анализа целевой аудитории)';
COMMENT ON FUNCTION link_session_to_user IS 'Связывает анонимные клики с зарегистрированным пользователем через session_id';

















