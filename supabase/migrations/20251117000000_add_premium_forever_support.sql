-- ============================================
-- Premium Forever Support + Duel Pass Auto-Unlock
-- ============================================

-- 1. Добавляем subscription_type для различения типов подписки
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_type TEXT 
CHECK (subscription_type IN ('monthly', 'yearly', 'lifetime'));

-- 2. Обновляем subscription_status чтобы включить 'lifetime'
-- Сначала удаляем старый constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Создаем новый constraint с lifetime
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'trial', 'pro', 'lifetime'));

-- 3. Добавляем поле для отслеживания покупки Premium Forever
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_forever_purchased_at TIMESTAMP WITH TIME ZONE;

-- 4. Функция для автоматического открытия Duel Pass для Premium Forever пользователей
CREATE OR REPLACE FUNCTION auto_unlock_duel_pass_for_premium()
RETURNS TRIGGER AS $$
DECLARE
  v_active_season_id INTEGER;
BEGIN
  -- Проверяем, является ли пользователь Premium Forever
  -- Premium Forever активен ТОЛЬКО если:
  -- 1. premium_forever_purchased_at установлен (покупка была совершена)
  -- 2. И subscription_type = 'lifetime' И subscription_status = 'pro'
  IF NEW.premium_forever_purchased_at IS NOT NULL
     AND NEW.subscription_type = 'lifetime'
     AND NEW.subscription_status = 'pro' THEN
    -- Получаем активный сезон
    SELECT id INTO v_active_season_id
    FROM public.duel_pass_seasons
    WHERE is_active = true
      AND start_date <= CURRENT_TIMESTAMP
      AND end_date >= CURRENT_TIMESTAMP
    ORDER BY season_number DESC
    LIMIT 1;
    
    -- Если есть активный сезон, открываем Duel Pass
    IF v_active_season_id IS NOT NULL THEN
      INSERT INTO public.user_season_progress (
        user_id, 
        season_id, 
        premium_pass_purchased,
        premium_pass_purchased_at
      )
      VALUES (
        NEW.id,
        v_active_season_id,
        true,
        NEW.premium_forever_purchased_at
      )
      ON CONFLICT (user_id, season_id) 
      DO UPDATE SET 
        premium_pass_purchased = true,
        premium_pass_purchased_at = COALESCE(
          user_season_progress.premium_pass_purchased_at,
          NEW.premium_forever_purchased_at
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Триггер для автоматического открытия Duel Pass при покупке Premium Forever
DROP TRIGGER IF EXISTS trigger_auto_unlock_duel_pass ON public.profiles;
CREATE TRIGGER trigger_auto_unlock_duel_pass
AFTER INSERT OR UPDATE OF subscription_type, subscription_status, premium_forever_purchased_at
ON public.profiles
FOR EACH ROW
WHEN (
  NEW.premium_forever_purchased_at IS NOT NULL
  AND NEW.subscription_type = 'lifetime'
  AND NEW.subscription_status = 'pro'
)
EXECUTE FUNCTION auto_unlock_duel_pass_for_premium();

-- 6. Функция для проверки, имеет ли пользователь Premium Forever
CREATE OR REPLACE FUNCTION has_premium_forever(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_lifetime BOOLEAN;
BEGIN
  SELECT 
    -- Premium Forever активен ТОЛЬКО если:
    -- 1. premium_forever_purchased_at установлен (покупка была совершена)
    -- 2. И subscription_type = 'lifetime' И subscription_status = 'pro'
    premium_forever_purchased_at IS NOT NULL
    AND subscription_type = 'lifetime'
    AND subscription_status = 'pro'
  INTO v_has_lifetime
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_has_lifetime, false);
END;
$$;

-- 7. Функция для проверки, нужно ли покупать Duel Pass для текущего сезона
CREATE OR REPLACE FUNCTION should_purchase_duel_pass(p_user_id UUID, p_season_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_premium_forever BOOLEAN;
  v_has_premium_pass BOOLEAN;
BEGIN
  -- Проверяем Premium Forever
  SELECT has_premium_forever(p_user_id) INTO v_has_premium_forever;
  
  IF v_has_premium_forever THEN
    RETURN false; -- Premium Forever автоматически открывает Duel Pass
  END IF;
  
  -- Проверяем, куплен ли уже Duel Pass для этого сезона
  SELECT premium_pass_purchased INTO v_has_premium_pass
  FROM public.user_season_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;
  
  RETURN NOT COALESCE(v_has_premium_pass, false);
END;
$$;

-- 8. Индекс для быстрого поиска Premium Forever пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_premium_forever 
ON public.profiles(subscription_type, subscription_status) 
WHERE subscription_type = 'lifetime' OR subscription_status = 'lifetime';

-- 9. Комментарии для документации
COMMENT ON COLUMN public.profiles.subscription_type IS 'Тип подписки: monthly, yearly, lifetime';
COMMENT ON COLUMN public.profiles.premium_forever_purchased_at IS 'Дата покупки Premium Forever подписки';
COMMENT ON FUNCTION auto_unlock_duel_pass_for_premium() IS 'Автоматически открывает Duel Pass для Premium Forever пользователей при покупке или обновлении статуса';
COMMENT ON FUNCTION has_premium_forever(UUID) IS 'Проверяет, имеет ли пользователь Premium Forever подписку';
COMMENT ON FUNCTION should_purchase_duel_pass(UUID, INTEGER) IS 'Проверяет, нужно ли пользователю покупать Duel Pass для сезона';


