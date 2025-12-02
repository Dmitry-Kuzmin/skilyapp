-- ============================================
-- ИСПРАВЛЕНИЕ: Добавляем недостающую колонку streak_multiplier
-- ============================================

-- Добавляем колонку streak_multiplier, которая была пропущена в миграции
ALTER TABLE public.user_daily_bonus
ADD COLUMN IF NOT EXISTS streak_multiplier NUMERIC DEFAULT 1.0;

COMMENT ON COLUMN public.user_daily_bonus.streak_multiplier IS 
  'Множитель стрика (1.0 + недели × 0.05), макс 1.5. Автоматически рассчитывается триггером.';

-- Пересоздаем функцию триггера с правильным search_path
CREATE OR REPLACE FUNCTION public.daily_bonus_unified_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours_since_last NUMERIC;
BEGIN
  -- ✅ Проверка 1: last_claimed_date не в будущем
  IF NEW.last_claimed_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Security: last_claimed_date cannot be in future';
  END IF;

  -- ✅ Проверка 2: streak может увеличиться максимум на 1
  IF NEW.current_streak > OLD.current_streak + 1 THEN
    RAISE EXCEPTION 'Security: streak can only increase by 1 per day';
  END IF;

  -- ✅ Проверка 3: честный интервал (только WARNING, не блокируем)
  IF OLD.last_claimed_date IS NOT NULL AND 
     NEW.last_claimed_date != OLD.last_claimed_date THEN
    
    v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 3600;
    
    IF v_hours_since_last < 20 THEN
      -- Только логируем, не блокируем
      RAISE WARNING 'Fast claim detected: user_id=%, hours=%, old_date=%, new_date=%',
        NEW.user_id, v_hours_since_last, OLD.last_claimed_date, NEW.last_claimed_date;
    END IF;
  END IF;

  -- ✅ Автоматический расчет streak_multiplier
  -- Формула: 1.0 + (недели × 5%), макс 1.5
  NEW.streak_multiplier := LEAST(
    1.0 + (FLOOR(NEW.current_streak / 7.0) * 0.05),
    1.5
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующие записи (устанавливаем начальное значение)
UPDATE public.user_daily_bonus
SET streak_multiplier = LEAST(
  1.0 + (FLOOR(current_streak / 7.0) * 0.05),
  1.5
)
WHERE streak_multiplier IS NULL OR streak_multiplier = 0;

-- Проверяем результат
SELECT 
  'user_daily_bonus' as table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_daily_bonus'
  AND column_name IN ('freeze_available', 'streak_multiplier')
ORDER BY ordinal_position;

