-- ============================================================
-- FIX: Ambiguous Column Names in Functions
-- ============================================================
-- Проблема: Имена колонок CTE совпадают с RETURNS TABLE
-- Решение: Использовать квалифицированные имена (stats.clicks)
-- ============================================================

-- Исправить get_partner_funnel_stats
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'click') as stat_clicks,
      COUNT(*) FILTER (WHERE event_type = 'install') as stat_installs,
      COUNT(*) FILTER (WHERE event_type = 'registration') as stat_registrations,
      COUNT(*) FILTER (WHERE event_type = 'purchase') as stat_purchases,
      COALESCE(SUM(purchase_amount) FILTER (WHERE event_type = 'purchase'), 0) as stat_revenue,
      COALESCE(SUM(commission_amount) FILTER (WHERE event_type = 'purchase'), 0) as stat_commission
    FROM public.partner_conversions
    WHERE partner_id = p_partner_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  )
  SELECT
    stat_clicks::BIGINT,
    stat_installs::BIGINT,
    stat_registrations::BIGINT,
    stat_purchases::BIGINT,
    -- Конверсия клик → установка
    CASE WHEN stat_clicks > 0 THEN ROUND((stat_installs::DECIMAL / stat_clicks::DECIMAL) * 100, 2) ELSE 0 END,
    -- Конверсия установка → регистрация
    CASE WHEN stat_installs > 0 THEN ROUND((stat_registrations::DECIMAL / stat_installs::DECIMAL) * 100, 2) ELSE 0 END,
    -- Конверсия регистрация → покупка (САМОЕ ВАЖНОЕ!)
    CASE WHEN stat_registrations > 0 THEN ROUND((stat_purchases::DECIMAL / stat_registrations::DECIMAL) * 100, 2) ELSE 0 END,
    -- Общая конверсия клик → покупка
    CASE WHEN stat_clicks > 0 THEN ROUND((stat_purchases::DECIMAL / stat_clicks::DECIMAL) * 100, 2) ELSE 0 END,
    stat_revenue::DECIMAL,
    stat_commission::DECIMAL,
    CASE WHEN stat_purchases > 0 THEN ROUND(stat_commission / stat_purchases, 2) ELSE 0 END
  FROM stats;
END;
$$;

-- Исправить get_partner_funnel_by_day (та же проблема)
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as result_date,
    COUNT(*) FILTER (WHERE event_type = 'click') as result_clicks,
    COUNT(*) FILTER (WHERE event_type = 'install') as result_installs,
    COUNT(*) FILTER (WHERE event_type = 'registration') as result_registrations,
    COUNT(*) FILTER (WHERE event_type = 'purchase') as result_purchases,
    COALESCE(SUM(purchase_amount) FILTER (WHERE event_type = 'purchase'), 0)::DECIMAL as result_revenue,
    COALESCE(SUM(commission_amount) FILTER (WHERE event_type = 'purchase'), 0)::DECIMAL as result_commission
  FROM public.partner_conversions
  WHERE partner_id = p_partner_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$;

-- Исправить get_partner_top_campaigns (та же проблема)
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pc.utm_campaign, 'direct') as result_utm_campaign,
    COUNT(*) FILTER (WHERE pc.event_type = 'click') as result_clicks,
    COUNT(*) FILTER (WHERE pc.event_type = 'registration') as result_registrations,
    COUNT(*) FILTER (WHERE pc.event_type = 'purchase') as result_purchases,
    COALESCE(SUM(pc.purchase_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as result_revenue,
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as result_commission,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE pc.event_type = 'purchase')::DECIMAL / 
         COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL) * 100, 
        2
      )
      ELSE 0 
    END as result_click_to_purchase_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.event_type = 'purchase'), 0) / 
        COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL,
        4
      )
      ELSE 0 
    END as result_roi
  FROM public.partner_conversions pc
  WHERE pc.partner_id = p_partner_id
  AND pc.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pc.utm_campaign
  ORDER BY result_revenue DESC
  LIMIT p_limit;
END;
$$;

-- Исправить get_partner_geo_stats (та же проблема)
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pc.country_code, 'unknown') as result_country_code,
    COUNT(*) FILTER (WHERE pc.event_type = 'click') as result_clicks,
    COUNT(*) FILTER (WHERE pc.event_type = 'registration') as result_registrations,
    COUNT(*) FILTER (WHERE pc.event_type = 'purchase') as result_purchases,
    COALESCE(SUM(pc.purchase_amount) FILTER (WHERE pc.event_type = 'purchase'), 0)::DECIMAL as result_revenue,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pc.event_type = 'click') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE pc.event_type = 'purchase')::DECIMAL / 
         COUNT(*) FILTER (WHERE pc.event_type = 'click')::DECIMAL) * 100, 
        2
      )
      ELSE 0 
    END as result_conversion_rate
  FROM public.partner_conversions pc
  WHERE pc.partner_id = p_partner_id
  AND pc.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pc.country_code
  ORDER BY result_revenue DESC;
END;
$$;

-- Исправить generate_partner_link
CREATE OR REPLACE FUNCTION generate_partner_link(
  p_partner_id UUID,
  p_destination TEXT,
  p_utm_campaign TEXT DEFAULT NULL,
  p_destination_params JSONB DEFAULT NULL,
  p_expires_days INTEGER DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  link_code TEXT,
  full_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_code TEXT;
  v_link_code TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Получить код партнера
  SELECT partner_code INTO v_partner_code
  FROM public.partners
  WHERE id = p_partner_id
  AND registration_status = 'approved'
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found or not approved'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Сгенерировать уникальный короткий код
  v_link_code := v_partner_code || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4));
  
  -- Проверка уникальности (используем квалифицированное имя)
  WHILE EXISTS (SELECT 1 FROM public.partner_links pl WHERE pl.link_code = v_link_code) LOOP
    v_link_code := v_partner_code || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4));
  END LOOP;

  -- Вычислить expires_at если указано
  IF p_expires_days IS NOT NULL AND p_expires_days > 0 THEN
    v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
  END IF;

  -- Вставить ссылку
  INSERT INTO public.partner_links (
    partner_id,
    link_code,
    destination,
    destination_params,
    utm_campaign,
    expires_at
  ) VALUES (
    p_partner_id,
    v_link_code,
    p_destination,
    p_destination_params,
    p_utm_campaign,
    v_expires_at
  );

  RETURN QUERY SELECT 
    true,
    'Link generated successfully'::TEXT,
    v_link_code as link_code,
    ('https://skily.app/go/' || v_link_code)::TEXT as full_url;
END;
$$;

-- Исправить apply_partner_promo_code
CREATE OR REPLACE FUNCTION apply_partner_promo_code(
  p_user_id UUID,
  p_promo_code TEXT,
  p_base_price DECIMAL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  final_price DECIMAL,
  discount_amount DECIMAL,
  discount_percent INTEGER,
  partner_id UUID,
  partner_code TEXT,
  commission_rate DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner RECORD;
  v_discount_percent INTEGER;
  v_final_price DECIMAL;
  v_discount DECIMAL;
BEGIN
  -- Найти партнера по промокоду (используем алиас p для таблицы)
  SELECT 
    p.id,
    p.partner_code,
    p.promo_code,
    p.promo_code_discount,
    p.promo_code_commission,
    p.status,
    p.registration_status
  INTO v_partner
  FROM public.partners p
  WHERE UPPER(p.promo_code) = UPPER(p_promo_code)
  AND p.promo_code IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'Promo code not found'::TEXT, 
      p_base_price::DECIMAL, 
      0::DECIMAL, 
      0::INTEGER,
      NULL::UUID, 
      NULL::TEXT,
      0::DECIMAL;
    RETURN;
  END IF;

  -- Проверить, что партнер активен и одобрен
  IF v_partner.registration_status != 'approved' OR v_partner.status != 'active' THEN
    RETURN QUERY SELECT 
      false, 
      'Promo code is not active'::TEXT, 
      p_base_price::DECIMAL, 
      0::DECIMAL, 
      0::INTEGER,
      NULL::UUID, 
      NULL::TEXT,
      0::DECIMAL;
    RETURN;
  END IF;

  -- Проверить self-referral (партнер не может использовать свой промокод)
  IF EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = v_partner.id
    AND p.user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'You cannot use your own promo code'::TEXT, 
      p_base_price::DECIMAL, 
      0::DECIMAL, 
      0::INTEGER,
      NULL::UUID, 
      NULL::TEXT,
      0::DECIMAL;
    RETURN;
  END IF;

  -- Вычислить скидку
  v_discount_percent := COALESCE(v_partner.promo_code_discount, 20);
  v_discount := p_base_price * (v_discount_percent / 100.0);
  v_final_price := p_base_price - v_discount;

  -- Убедиться, что цена не отрицательная
  IF v_final_price < 0 THEN
    v_final_price := 0;
  END IF;

  RETURN QUERY SELECT 
    true,
    'Promo code applied successfully'::TEXT,
    v_final_price,
    v_discount,
    v_discount_percent,
    v_partner.id,
    v_partner.partner_code,
    COALESCE(v_partner.promo_code_commission, 0.30);
END;
$$;

COMMENT ON FUNCTION get_partner_funnel_stats IS 'FIXED: Устранена амбивалентность имен колонок';
COMMENT ON FUNCTION get_partner_funnel_by_day IS 'FIXED: Устранена амбивалентность имен колонок';
COMMENT ON FUNCTION get_partner_top_campaigns IS 'FIXED: Устранена амбивалентность имен колонок';
COMMENT ON FUNCTION get_partner_geo_stats IS 'FIXED: Устранена амбивалентность имен колонок';
COMMENT ON FUNCTION generate_partner_link IS 'FIXED: Устранена амбивалентность переменной link_code';
COMMENT ON FUNCTION apply_partner_promo_code IS 'FIXED: Устранена амбивалентность колонок (добавлены алиасы таблиц)';

