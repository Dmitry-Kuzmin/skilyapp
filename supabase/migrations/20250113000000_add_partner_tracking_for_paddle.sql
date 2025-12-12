-- ============================================
-- Гибридный трекинг партнеров для Paddle
-- ============================================
-- Проблема: Telegram Partner Program работает только с Telegram Stars
-- Решение: Сохраняем партнерский код из start_param в БД,
--          чтобы начислять комиссию при платежах через Paddle
-- ============================================

-- 1. Добавить поле для партнерского кода в profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS partner_ref_code TEXT;

-- 2. Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_profiles_partner_ref_code 
ON public.profiles(partner_ref_code) 
WHERE partner_ref_code IS NOT NULL;

-- 3. Комментарий
COMMENT ON COLUMN public.profiles.partner_ref_code IS 
'Партнерский код из Telegram start_param (формат: partner_XXX или просто XXX). Сохраняется при первом входе для начисления комиссии при платежах через Paddle/Stripe.';

-- ============================================
-- Функция для связки пользователя с партнером
-- ============================================
CREATE OR REPLACE FUNCTION link_user_to_partner_from_start_param(
  p_user_id UUID,
  p_start_param TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  partner_id UUID,
  partner_code TEXT,
  message TEXT
) AS $$
DECLARE
  v_partner_code TEXT;
  v_partner_id UUID;
  v_clean_code TEXT;
BEGIN
  -- Проверяем, что пользователь существует
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Проверяем, что start_param передан
  IF p_start_param IS NULL OR p_start_param = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Start param is empty'::TEXT;
    RETURN;
  END IF;

  -- Очищаем код от префикса "partner_" если есть
  v_clean_code = UPPER(TRIM(p_start_param));
  IF v_clean_code LIKE 'PARTNER_%' THEN
    v_clean_code = SUBSTRING(v_clean_code FROM 9); -- Убираем "PARTNER_"
  END IF;

  -- Ищем партнера по коду
  SELECT id, partner_code INTO v_partner_id, v_partner_code
  FROM public.partners
  WHERE UPPER(partner_code) = v_clean_code
  LIMIT 1;

  -- Если партнер не найден - это не ошибка (может быть реферальный код)
  IF v_partner_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Partner not found (may be referral code)'::TEXT;
    RETURN;
  END IF;

  -- Проверяем, не привязан ли уже пользователь к другому партнеру
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND partner_ref_code IS NOT NULL 
    AND partner_ref_code != v_clean_code
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'User already linked to another partner'::TEXT;
    RETURN;
  END IF;

  -- Сохраняем партнерский код в профиле
  UPDATE public.profiles
  SET partner_ref_code = v_clean_code
  WHERE id = p_user_id
  AND (partner_ref_code IS NULL OR partner_ref_code = v_clean_code);

  -- Записываем событие "install" в воронку конверсий (если еще не записано)
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_conversions
    WHERE partner_id = v_partner_id
    AND user_id = p_user_id
    AND event_type = 'install'
  ) THEN
    INSERT INTO public.partner_conversions (
      partner_id,
      partner_code,
      user_id,
      event_type,
      session_id
    ) VALUES (
      v_partner_id,
      v_partner_code,
      p_user_id,
      'install',
      gen_random_uuid()::TEXT
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT true, v_partner_id, v_partner_code, 'Partner linked successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_user_to_partner_from_start_param IS 
'Связывает пользователя с партнером на основе start_param из Telegram. Сохраняет код в profiles.partner_ref_code для последующего начисления комиссии при платежах через Paddle/Stripe.';

-- ============================================
-- Функция для начисления комиссии партнеру при платеже Paddle
-- ============================================
CREATE OR REPLACE FUNCTION add_partner_commission_for_paddle_payment(
  p_user_id UUID,
  p_purchase_amount DECIMAL(10,2),
  p_purchase_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  partner_id UUID,
  commission_amount DECIMAL(10,2),
  message TEXT
) AS $$
DECLARE
  v_partner_code TEXT;
  v_partner_id UUID;
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(10,2);
  v_conversion_id UUID;
BEGIN
  -- Получаем партнерский код пользователя
  SELECT partner_ref_code INTO v_partner_code
  FROM public.profiles
  WHERE id = p_user_id;

  -- Если партнерский код не найден - это не ошибка (пользователь не пришел от партнера)
  IF v_partner_code IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'User not referred by partner'::TEXT;
    RETURN;
  END IF;

  -- Ищем партнера
  SELECT id, COALESCE(commission_rate, 0.17) INTO v_partner_id, v_commission_rate
  FROM public.partners
  WHERE UPPER(partner_code) = UPPER(v_partner_code)
  AND partner_type = 'revenue_share'
  LIMIT 1;

  -- Если партнер не найден или не revenue_share - пропускаем
  IF v_partner_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Partner not found or not revenue_share type'::TEXT;
    RETURN;
  END IF;

  -- Вычисляем комиссию
  v_commission_amount := p_purchase_amount * v_commission_rate;

  -- Записываем событие "purchase" в воронку конверсий
  INSERT INTO public.partner_conversions (
    partner_id,
    partner_code,
    user_id,
    event_type,
    purchase_amount,
    commission_amount,
    commission_rate,
    purchase_id
  ) VALUES (
    v_partner_id,
    v_partner_code,
    p_user_id,
    'purchase',
    p_purchase_amount,
    v_commission_amount,
    v_commission_rate,
    p_purchase_id
  )
  RETURNING id INTO v_conversion_id;

  -- Начисляем комиссию партнеру через существующую функцию
  PERFORM add_partner_commission_to_hold(
    v_conversion_id,
    v_partner_id,
    v_commission_amount
  );

  RETURN QUERY SELECT true, v_partner_id, v_commission_amount, 'Commission added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_partner_commission_for_paddle_payment IS 
'Начисляет комиссию партнеру при успешном платеже через Paddle. Использует partner_ref_code из profiles для определения партнера.';

