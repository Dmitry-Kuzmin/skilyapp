-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 0: Premium для Партнеров
-- ============================================================
-- Цель: Автоматически давать Premium партнерам при одобрении
-- Причина: Догфудинг - партнер должен знать продукт изнутри
-- ============================================================

-- 1. Добавить поля для отслеживания партнерского Premium статуса
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS is_partner_premium BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS partner_premium_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS partner_premium_notes TEXT;

-- 2. Добавить поле в profiles для быстрой идентификации партнеров
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS partner_premium_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instructor_mode BOOLEAN DEFAULT false;

-- Индексы для быстрого поиска партнеров
CREATE INDEX IF NOT EXISTS idx_profiles_partner_premium ON public.profiles(partner_premium_active) WHERE partner_premium_active = true;

-- 3. Функция для активации Premium партнеру
CREATE OR REPLACE FUNCTION grant_partner_premium(
  p_partner_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_partner RECORD;
BEGIN
  -- Получить данные партнера
  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT;
    RETURN;
  END IF;

  -- Проверить, что партнер одобрен
  IF v_partner.registration_status != 'approved' THEN
    RETURN QUERY SELECT false, 'Partner must be approved first'::TEXT;
    RETURN;
  END IF;

  -- Проверить, есть ли у партнера user_id
  IF v_partner.user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Partner has no user account'::TEXT;
    RETURN;
  END IF;

  -- Активировать Premium Forever для партнера
  UPDATE public.profiles
  SET 
    subscription_type = 'partner', -- Специальный тип для партнеров
    subscription_status = 'pro',
    premium_until = NULL, -- NULL = бессрочно (пока партнер активен)
    partner_premium_active = true,
    duel_pass_premium = true, -- Все функции доступны
    premium_forever_purchased_at = NOW() -- Для совместимости
  WHERE id = v_partner.user_id;

  -- Обновить статус в partners
  UPDATE public.partners
  SET 
    is_partner_premium = true,
    partner_premium_activated_at = NOW(),
    partner_premium_notes = 'Auto-granted on approval'
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Partner Premium activated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Триггер для автоматической активации Premium при одобрении партнера
CREATE OR REPLACE FUNCTION trigger_grant_partner_premium()
RETURNS TRIGGER AS $$
BEGIN
  -- Если партнер только что одобрен
  IF NEW.registration_status = 'approved' 
     AND (OLD.registration_status IS NULL OR OLD.registration_status != 'approved')
     AND NEW.user_id IS NOT NULL THEN
    
    -- Активировать Premium
    UPDATE public.profiles
    SET 
      subscription_type = 'partner',
      subscription_status = 'pro',
      premium_until = NULL,
      partner_premium_active = true,
      duel_pass_premium = true,
      premium_forever_purchased_at = NOW()
    WHERE id = NEW.user_id;

    -- Обновить статус в partners
    NEW.is_partner_premium := true;
    NEW.partner_premium_activated_at := NOW();
    NEW.partner_premium_notes := 'Auto-granted on approval via trigger';
  END IF;

  -- Если партнера отклонили или деактивировали - убираем Premium
  IF (NEW.registration_status = 'rejected' OR NEW.status = 'inactive')
     AND OLD.registration_status = 'approved'
     AND NEW.user_id IS NOT NULL THEN
    
    UPDATE public.profiles
    SET 
      subscription_type = CASE 
        WHEN premium_forever_purchased_at IS NOT NULL 
             AND premium_forever_purchased_at < NEW.partner_premium_activated_at
        THEN 'lifetime' -- Если у него был куплен Premium до партнерства
        ELSE 'free'
      END,
      subscription_status = CASE 
        WHEN premium_until > NOW() THEN 'pro'
        ELSE 'free'
      END,
      partner_premium_active = false
    WHERE id = NEW.user_id;

    -- Обновить статус в partners
    NEW.is_partner_premium := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создать триггер (удалить старый, если есть)
DROP TRIGGER IF EXISTS trigger_grant_partner_premium ON public.partners;
CREATE TRIGGER trigger_grant_partner_premium
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION trigger_grant_partner_premium();

-- 5. Функция для проверки доступа к Premium (используется в RLS и логике приложения)
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT 
    subscription_status,
    premium_until,
    partner_premium_active,
    premium_forever_purchased_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Проверка Premium доступа
  RETURN (
    -- Premium Forever
    v_profile.premium_forever_purchased_at IS NOT NULL
    OR
    -- Активный Premium подписка
    (v_profile.subscription_status = 'pro' AND v_profile.premium_until > NOW())
    OR
    -- Партнерский Premium
    v_profile.partner_premium_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для отзыва партнерского Premium (ручная, для админа)
CREATE OR REPLACE FUNCTION revoke_partner_premium(
  p_partner_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_partner RECORD;
BEGIN
  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT;
    RETURN;
  END IF;

  IF v_partner.user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Partner has no user account'::TEXT;
    RETURN;
  END IF;

  -- Убрать партнерский Premium
  UPDATE public.profiles
  SET 
    partner_premium_active = false,
    subscription_type = CASE 
      WHEN premium_forever_purchased_at IS NOT NULL THEN 'lifetime'
      WHEN premium_until > NOW() THEN subscription_type
      ELSE 'free'
    END,
    subscription_status = CASE 
      WHEN premium_forever_purchased_at IS NOT NULL THEN 'pro'
      WHEN premium_until > NOW() THEN 'pro'
      ELSE 'free'
    END
  WHERE id = v_partner.user_id;

  -- Обновить статус партнера
  UPDATE public.partners
  SET 
    is_partner_premium = false,
    partner_premium_notes = COALESCE(p_reason, 'Revoked manually by admin')
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Partner Premium revoked'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Активировать Premium для всех уже одобренных партнеров (миграция данных)
DO $$
DECLARE
  partner_record RECORD;
BEGIN
  FOR partner_record IN 
    SELECT id, user_id 
    FROM public.partners 
    WHERE registration_status = 'approved' 
    AND user_id IS NOT NULL
    AND (is_partner_premium IS NULL OR is_partner_premium = false)
  LOOP
    -- Активировать Premium для каждого партнера
    PERFORM grant_partner_premium(partner_record.id);
  END LOOP;
END $$;

-- Комментарии для документации
COMMENT ON COLUMN public.partners.is_partner_premium IS 'Флаг активности партнерского Premium доступа';
COMMENT ON COLUMN public.partners.partner_premium_activated_at IS 'Дата активации партнерского Premium';
COMMENT ON COLUMN public.profiles.partner_premium_active IS 'Флаг для быстрой проверки партнерского Premium статуса';
COMMENT ON COLUMN public.profiles.instructor_mode IS 'Режим инструктора (для автошкол) - показывает правильные ответы сразу';

COMMENT ON FUNCTION grant_partner_premium IS 'Активирует Partner Premium для партнера (вызывается при одобрении)';
COMMENT ON FUNCTION trigger_grant_partner_premium IS 'Триггер: автоматически активирует Premium при одобрении партнера';
COMMENT ON FUNCTION has_premium_access IS 'Проверяет, имеет ли пользователь Premium доступ (любого типа)';
COMMENT ON FUNCTION revoke_partner_premium IS 'Отзывает партнерский Premium (для админа)';















