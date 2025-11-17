-- ============================================
-- Fix Premium Forever Check Logic
-- Исправляет логику проверки Premium Forever
-- Premium Forever должен быть активен ТОЛЬКО если:
-- 1. premium_forever_purchased_at установлен (покупка была совершена)
-- 2. И subscription_type = 'lifetime' И subscription_status = 'pro'
-- ============================================

-- Обновляем функцию has_premium_forever
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

-- Обновляем функцию auto_unlock_duel_pass_for_premium
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

-- Обновляем триггер
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

COMMENT ON FUNCTION has_premium_forever(UUID) IS 'Проверяет, имеет ли пользователь Premium Forever подписку. Premium Forever активен ТОЛЬКО если premium_forever_purchased_at установлен И subscription_type = lifetime И subscription_status = pro';






