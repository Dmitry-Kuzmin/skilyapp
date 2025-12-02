-- ============================================================
-- FIX: Исправить домен в ссылках и добавить статистику
-- ============================================================
-- Проблема 1: Домен должен быть skilyapp.com (не skily.app)
-- Проблема 2: Нужна функция для получения списка созданных ссылок
-- ============================================================

-- 1. Исправить функцию generate_partner_link (правильный домен)
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
    ('https://skilyapp.com/go/' || v_link_code)::TEXT as full_url; -- 👈 ИСПРАВЛЕН ДОМЕН!
END;
$$;

-- 2. Функция для получения списка ссылок партнера с детальной статистикой
CREATE OR REPLACE FUNCTION get_partner_links_with_stats(
  p_partner_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  link_id UUID,
  link_code TEXT,
  full_url TEXT,
  destination TEXT,
  utm_campaign TEXT,
  clicks_count INTEGER,
  registrations_count INTEGER,
  purchases_count INTEGER,
  conversion_rate DECIMAL,
  last_click_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id as link_id,
    pl.link_code,
    ('https://skilyapp.com/go/' || pl.link_code)::TEXT as full_url,
    pl.destination,
    pl.utm_campaign,
    pl.clicks_count,
    pl.registrations_count,
    pl.purchases_count,
    CASE 
      WHEN pl.clicks_count > 0 
      THEN ROUND((pl.purchases_count::DECIMAL / pl.clicks_count::DECIMAL) * 100, 2)
      ELSE 0
    END as conversion_rate,
    pl.last_click_at,
    pl.is_active,
    pl.created_at
  FROM public.partner_links pl
  WHERE pl.partner_id = p_partner_id
  ORDER BY pl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Комментарии
COMMENT ON FUNCTION generate_partner_link IS 'FIXED: Исправлен домен на skilyapp.com';
COMMENT ON FUNCTION get_partner_links_with_stats IS 'Возвращает список всех ссылок партнера с детальной статистикой';

