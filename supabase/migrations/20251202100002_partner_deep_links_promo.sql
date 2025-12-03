-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 2: Deep Links и Промокоды
-- ============================================================
-- Цель: Партнер генерирует персонализированные ссылки "в два клика"
-- + Промокоды для Revenue Share модели
-- ============================================================

-- 1. Таблица для хранения сгенерированных партнерских ссылок
CREATE TABLE IF NOT EXISTS public.partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
  -- Link info
  link_code TEXT UNIQUE NOT NULL, -- Короткий код: MIGUEL-A3F2
  destination TEXT NOT NULL, -- 'home', 'premium', 'test-essential', 'payment'
  destination_params JSONB, -- {test_id: 123, category: "esencial"}
  
  -- UTM метки (автозаполняются или кастомные)
  utm_source TEXT DEFAULT 'partner',
  utm_medium TEXT,
  utm_campaign TEXT, -- Название кампании от партнера
  utm_content TEXT,
  
  -- Статистика (обновляется триггером из partner_conversions)
  clicks_count INTEGER DEFAULT 0,
  registrations_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  last_click_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Опционально: ссылка с истекающим сроком
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_partner_links_partner_id ON public.partner_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_links_link_code ON public.partner_links(link_code);
CREATE INDEX IF NOT EXISTS idx_partner_links_active ON public.partner_links(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners can view their links"
ON public.partner_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_links.partner_id
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can create their links"
ON public.partner_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_links.partner_id
    AND partners.user_id = auth.uid()
    AND partners.registration_status = 'approved'
  )
);

CREATE POLICY "Partners can update their links"
ON public.partner_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_links.partner_id
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all links"
ON public.partner_links
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Публичный доступ для чтения (чтобы проверить валидность ссылки)
CREATE POLICY "Anyone can view active links"
ON public.partner_links
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 2. Функция для генерации партнерской ссылки
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
) AS $$
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
  
  -- Проверка уникальности
  WHILE EXISTS (SELECT 1 FROM public.partner_links WHERE link_code = v_link_code) LOOP
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Функция для получения информации о ссылке (при редиректе)
CREATE OR REPLACE FUNCTION get_partner_link_info(
  p_link_code TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  partner_code TEXT,
  destination TEXT,
  destination_params JSONB,
  utm_campaign TEXT
) AS $$
DECLARE
  v_link RECORD;
BEGIN
  -- Найти ссылку
  SELECT 
    pl.*,
    p.partner_code
  INTO v_link
  FROM public.partner_links pl
  JOIN public.partners p ON pl.partner_id = p.id
  WHERE pl.link_code = UPPER(p_link_code)
  AND pl.is_active = true
  AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Link not found or expired'::TEXT, NULL::TEXT, NULL::TEXT, NULL::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  -- Обновить счетчик кликов и время последнего клика
  UPDATE public.partner_links
  SET 
    clicks_count = clicks_count + 1,
    last_click_at = NOW(),
    updated_at = NOW()
  WHERE link_code = UPPER(p_link_code);

  RETURN QUERY SELECT 
    true,
    'Link found'::TEXT,
    v_link.partner_code,
    v_link.destination,
    v_link.destination_params,
    v_link.utm_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Расширить таблицу partners для промокодов
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS promo_code_discount INTEGER DEFAULT 20 CHECK (promo_code_discount >= 0 AND promo_code_discount <= 100),
ADD COLUMN IF NOT EXISTS promo_code_commission DECIMAL(5,2) DEFAULT 0.30 CHECK (promo_code_commission >= 0 AND promo_code_commission <= 1.00);

-- Комментарии
COMMENT ON COLUMN public.partners.promo_code IS 'Промокод партнера (например, MIGUEL20) - вводится при оплате';
COMMENT ON COLUMN public.partners.promo_code_discount IS 'Скидка для пользователя в процентах (например, 20 = 20% скидка)';
COMMENT ON COLUMN public.partners.promo_code_commission IS 'Комиссия партнера от суммы с учетом скидки (например, 0.30 = 30%)';

-- 5. Функция для применения промокода при покупке
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
) AS $$
DECLARE
  v_partner RECORD;
  v_discount_percent INTEGER;
  v_final_price DECIMAL;
  v_discount DECIMAL;
BEGIN
  -- Найти партнера по промокоду
  SELECT 
    id,
    partner_code,
    promo_code,
    promo_code_discount,
    promo_code_commission,
    status,
    registration_status
  INTO v_partner
  FROM public.partners
  WHERE UPPER(promo_code) = UPPER(p_promo_code)
  AND promo_code IS NOT NULL
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
    SELECT 1 FROM public.partners
    WHERE id = v_partner.id
    AND user_id = p_user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для получения статистики по ссылкам партнера
CREATE OR REPLACE FUNCTION get_partner_links_stats(
  p_partner_id UUID
)
RETURNS TABLE(
  link_code TEXT,
  utm_campaign TEXT,
  destination TEXT,
  clicks_count INTEGER,
  registrations_count INTEGER,
  purchases_count INTEGER,
  conversion_rate DECIMAL,
  last_click_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.link_code,
    pl.utm_campaign,
    pl.destination,
    pl.clicks_count,
    pl.registrations_count,
    pl.purchases_count,
    CASE 
      WHEN pl.clicks_count > 0 
      THEN ROUND((pl.purchases_count::DECIMAL / pl.clicks_count::DECIMAL) * 100, 2)
      ELSE 0
    END as conversion_rate,
    pl.last_click_at,
    pl.created_at
  FROM public.partner_links pl
  WHERE pl.partner_id = p_partner_id
  AND pl.is_active = true
  ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Триггер для автоматического обновления статистики ссылок из partner_conversions
-- (Обновляем registrations_count и purchases_count на основе UTM campaign)
CREATE OR REPLACE FUNCTION update_partner_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Если есть utm_campaign, обновляем статистику соответствующей ссылки
  IF NEW.utm_campaign IS NOT NULL THEN
    -- Обновляем registrations_count
    IF NEW.event_type = 'registration' THEN
      UPDATE public.partner_links
      SET 
        registrations_count = registrations_count + 1,
        updated_at = NOW()
      WHERE utm_campaign = NEW.utm_campaign
      AND partner_id = NEW.partner_id;
    END IF;

    -- Обновляем purchases_count
    IF NEW.event_type = 'purchase' THEN
      UPDATE public.partner_links
      SET 
        purchases_count = purchases_count + 1,
        updated_at = NOW()
      WHERE utm_campaign = NEW.utm_campaign
      AND partner_id = NEW.partner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_link_stats ON public.partner_conversions;
CREATE TRIGGER trigger_update_partner_link_stats
AFTER INSERT ON public.partner_conversions
FOR EACH ROW
EXECUTE FUNCTION update_partner_link_stats();

-- Комментарии для документации
COMMENT ON TABLE public.partner_links IS 'Сгенерированные партнерские ссылки с UTM-метками и статистикой';
COMMENT ON COLUMN public.partner_links.link_code IS 'Короткий уникальный код ссылки (например, MIGUEL-A3F2)';
COMMENT ON COLUMN public.partner_links.destination IS 'Куда ведет ссылка: home, premium, test-{id}, payment';

COMMENT ON FUNCTION generate_partner_link IS 'Генерирует персонализированную партнерскую ссылку';
COMMENT ON FUNCTION get_partner_link_info IS 'Получает информацию о ссылке при редиректе (и инкрементит счетчик кликов)';
COMMENT ON FUNCTION apply_partner_promo_code IS 'Применяет промокод партнера, возвращает финальную цену и комиссию';
COMMENT ON FUNCTION get_partner_links_stats IS 'Возвращает статистику по всем ссылкам партнера';





