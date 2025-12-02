-- ============================================
-- Усиленная безопасность для daily bonus
-- Защита от timezone exploit и манипуляций
-- ============================================

-- ✅ 1. TRIGGER для валидации обновлений
CREATE OR REPLACE FUNCTION validate_daily_bonus_update()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ Проверка 1: last_claimed_date не в будущем
  IF NEW.last_claimed_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Security: last_claimed_date cannot be in future. Got: %, Server: %', 
      NEW.last_claimed_date, CURRENT_DATE;
  END IF;

  -- ✅ Проверка 2: можно обновить только один раз в день
  IF OLD.last_claimed_date IS NOT NULL AND 
     OLD.last_claimed_date = CURRENT_DATE AND 
     NEW.last_claimed_date = CURRENT_DATE AND
     NEW.last_claimed_date = OLD.last_claimed_date THEN
    -- Это не изменение даты, может быть изменение других полей (streak_freeze и т.д.)
    -- Разрешаем если streak не увеличился
    IF NEW.current_streak > OLD.current_streak THEN
      RAISE EXCEPTION 'Security: daily bonus already claimed today';
    END IF;
  END IF;

  -- ✅ Проверка 3: streak может увеличиться максимум на 1 за раз
  IF NEW.current_streak > OLD.current_streak + 1 THEN
    RAISE EXCEPTION 'Security: streak can only increase by 1 per day. Old: %, New: %',
      OLD.current_streak, NEW.current_streak;
  END IF;

  -- ✅ Проверка 4: streak может уменьшиться только до 1 (reset)
  IF NEW.current_streak < OLD.current_streak AND NEW.current_streak != 1 THEN
    RAISE EXCEPTION 'Security: streak can only decrease to 1 (reset). Old: %, New: %',
      OLD.current_streak, NEW.current_streak;
  END IF;

  -- ✅ Проверка 5: подозрительная манипуляция датой
  IF NEW.last_claimed_date != CURRENT_DATE AND 
     NEW.last_claimed_date IS NOT NULL AND
     (OLD.last_claimed_date IS NULL OR NEW.last_claimed_date > OLD.last_claimed_date) THEN
    
    -- Разрешаем только если это делает service_role или система
    IF current_setting('role', true) != 'service_role' THEN
      RAISE WARNING 'Security alert: Attempted to set non-current date. User: %, Old: %, New: %, Current: %',
        NEW.user_id, OLD.last_claimed_date, NEW.last_claimed_date, CURRENT_DATE;
      
      RAISE EXCEPTION 'Security: Cannot set last_claimed_date to non-current date';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем trigger (если не существует)
DROP TRIGGER IF EXISTS validate_daily_bonus_update_trigger ON public.user_daily_bonus;
CREATE TRIGGER validate_daily_bonus_update_trigger
  BEFORE UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  EXECUTE FUNCTION validate_daily_bonus_update();

-- ============================================
-- ✅ 2. Обновляем RLS Policy - ограничиваем UPDATE
-- ============================================

-- Удаляем старую небезопасную policy
DROP POLICY IF EXISTS "Users can update their own daily bonus" ON public.user_daily_bonus;

-- Создаем новую policy - только service_role может делать UPDATE
-- (это означает только через Edge Functions)
CREATE POLICY "Only service role can update daily bonus"
  ON public.user_daily_bonus
  FOR UPDATE
  USING (
    -- Только Edge Functions с service_role ключом могут обновлять
    current_setting('role', true) = 'service_role'
  );

-- SELECT policy остается (пользователи могут читать свой streak)
-- INSERT policy остается (для первого создания записи через can_access_daily_bonus)

-- ============================================
-- ✅ 3. Функция для проверки честного интервала
-- ============================================

CREATE OR REPLACE FUNCTION check_honest_claim_interval()
RETURNS TRIGGER AS $$
DECLARE
  v_hours_since_last NUMERIC;
BEGIN
  -- Проверяем только если изменилась last_claimed_date
  IF OLD.last_claimed_date IS NOT NULL AND 
     NEW.last_claimed_date != OLD.last_claimed_date THEN
    
    -- Вычисляем реальное время между обновлениями
    v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 3600;
    
    -- Если меньше 20 часов - подозрительно (даем запас на разные timezone)
    IF v_hours_since_last < 20 THEN
      RAISE WARNING 'Fast claim detected: user_id=%, hours_since_last=%, old_date=%, new_date=%',
        NEW.user_id, v_hours_since_last, OLD.last_claimed_date, NEW.last_claimed_date;
      
      -- Не блокируем, но логируем
      -- В будущем можно добавить таблицу security_alerts
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем trigger для мониторинга
DROP TRIGGER IF EXISTS check_honest_claim_interval_trigger ON public.user_daily_bonus;
CREATE TRIGGER check_honest_claim_interval_trigger
  BEFORE UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  WHEN (NEW.last_claimed_date IS DISTINCT FROM OLD.last_claimed_date)
  EXECUTE FUNCTION check_honest_claim_interval();

-- ============================================
-- Комментарии для документации
-- ============================================

COMMENT ON FUNCTION validate_daily_bonus_update IS 
  'Валидация обновлений user_daily_bonus для защиты от timezone exploit и других манипуляций';

COMMENT ON FUNCTION check_honest_claim_interval IS 
  'Проверка честного интервала между получениями бонусов (минимум 20 часов)';

COMMENT ON POLICY "Only service role can update daily bonus" ON public.user_daily_bonus IS 
  'Только Edge Functions могут обновлять daily bonus через claim_daily_bonus_atomic функцию';



