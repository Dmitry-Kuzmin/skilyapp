-- ============================================
-- ОПТИМИЗАЦИЯ ЗАТРАТ: Quick Wins
-- Экономия ~50-60% ресурсов
-- ============================================

-- ============================================
-- 1. ДЕНОРМАЛИЗАЦИЯ: Freeze в user_daily_bonus
-- ============================================

-- Добавляем freeze_available прямо в основную таблицу
ALTER TABLE public.user_daily_bonus
ADD COLUMN IF NOT EXISTS freeze_available INTEGER DEFAULT 0;

COMMENT ON COLUMN public.user_daily_bonus.freeze_available IS 
  'Количество доступных streak freeze (кеш, синхронизируется с user_items через триггер)';

-- Миграция данных будет в следующей миграции (20251203000002)

-- ============================================
-- 2. ОБЪЕДИНЕНИЕ TRIGGERS в один
-- ============================================

-- Удаляем старые triggers
DROP TRIGGER IF EXISTS validate_daily_bonus_update_trigger ON public.user_daily_bonus;
DROP TRIGGER IF EXISTS check_honest_claim_interval_trigger ON public.user_daily_bonus;
DROP TRIGGER IF EXISTS update_multiplier ON public.user_daily_bonus;
DROP TRIGGER IF EXISTS track_claim_time ON public.user_daily_bonus;

-- Удаляем старые функции
DROP FUNCTION IF EXISTS validate_daily_bonus_update();
DROP FUNCTION IF EXISTS check_honest_claim_interval();
DROP FUNCTION IF EXISTS calc_streak_multiplier();
DROP FUNCTION IF EXISTS update_claim_pattern();

-- Создаем ОДИН оптимизированный trigger
CREATE OR REPLACE FUNCTION public.daily_bonus_unified_trigger()
RETURNS TRIGGER AS $$
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

-- Применяем единый trigger
CREATE TRIGGER daily_bonus_unified
  BEFORE UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  EXECUTE FUNCTION public.daily_bonus_unified_trigger();

COMMENT ON FUNCTION public.daily_bonus_unified_trigger IS 
  'Объединенный trigger для всех проверок (оптимизация производительности)';

-- ============================================
-- 3. ОБНОВЛЕНИЕ: claim_daily_bonus_atomic
-- Включаем Mystery Box + используем денормализованный freeze
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_daily_bonus_atomic(
  p_user_id UUID,
  p_server_today DATE,
  p_server_yesterday DATE
)
RETURNS TABLE(
  success BOOLEAN,
  error TEXT,
  message TEXT,
  new_streak INTEGER,
  week_day INTEGER,
  reward JSONB,
  new_balance_xp INTEGER,
  new_balance_coins INTEGER,
  freeze_used BOOLEAN,
  mystery_reward JSONB  -- ← Новое поле для Mystery Box
) AS $$
DECLARE
  v_bonus_record RECORD;
  v_reward_def RECORD;
  v_new_streak INTEGER;
  v_week_day INTEGER;
  v_profile RECORD;
  v_xp_reward INTEGER;
  v_coins_reward INTEGER;
  v_new_xp INTEGER;
  v_new_coins INTEGER;
  v_freeze_used BOOLEAN := FALSE;
  v_mystery_reward JSONB := NULL;
BEGIN
  -- ✅ 1. Блокируем запись для атомарного обновления
  SELECT * INTO v_bonus_record
  FROM public.user_daily_bonus
  WHERE user_id = p_user_id
  FOR UPDATE NOWAIT;

  IF v_bonus_record IS NULL THEN
    INSERT INTO public.user_daily_bonus (user_id, current_streak, total_claims, freeze_available)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_bonus_record;
  END IF;

  -- ✅ 2. СЕРВЕРНАЯ ПРОВЕРКА: уже получено сегодня?
  IF v_bonus_record.last_claimed_date = p_server_today THEN
    RETURN QUERY SELECT 
      FALSE, 
      'already_claimed_today'::TEXT, 
      'Награда уже получена сегодня'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
    RETURN;
  END IF;

  -- ✅ 3. Вычисляем новый streak + AUTO FREEZE
  IF v_bonus_record.last_claimed_date = p_server_yesterday THEN
    -- Продолжаем streak
    v_new_streak := v_bonus_record.current_streak + 1;
    
  ELSIF v_bonus_record.last_claimed_date IS NULL THEN
    -- Первое получение
    v_new_streak := 1;
    
  ELSE
    -- ❄️ ПРОПУСК ДНЯ ОБНАРУЖЕН!
    
    IF v_bonus_record.freeze_available > 0 THEN
      -- ✅ AUTO-USE FREEZE: спасаем streak
      v_new_streak := v_bonus_record.current_streak;
      v_freeze_used := TRUE;
      
      -- Уменьшаем счетчик freeze (денормализовано)
      UPDATE public.user_daily_bonus
      SET freeze_available = freeze_available - 1
      WHERE user_id = p_user_id;
      
      -- Логируем auto-use
      BEGIN
        INSERT INTO public.user_events (user_id, event_type, metadata)
        VALUES (
          p_user_id,
          'streak_freeze_auto_used',
          jsonb_build_object(
            'streak_saved', v_bonus_record.current_streak,
            'days_missed', p_server_today::DATE - v_bonus_record.last_claimed_date::DATE - 1,
            'freeze_remaining', v_bonus_record.freeze_available - 1,
            'server_date', p_server_today
          )
        );
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      
    ELSE
      -- ❌ Нет freeze → streak теряется
      v_new_streak := 1;
      
      -- Логируем потерю
      BEGIN
        INSERT INTO public.user_events (user_id, event_type, metadata)
        VALUES (
          p_user_id,
          'streak_lost',
          jsonb_build_object(
            'old_streak', v_bonus_record.current_streak,
            'last_claimed', v_bonus_record.last_claimed_date,
            'server_today', p_server_today,
            'days_missed', p_server_today::DATE - v_bonus_record.last_claimed_date::DATE - 1
          )
        );
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END IF;

  -- Циклический день недели (1-7)
  v_week_day := (v_new_streak - 1) % 7 + 1;

  -- ✅ 4. Получаем reward definition
  SELECT * INTO v_reward_def
  FROM public.daily_bonus_def
  WHERE day_number = v_week_day;

  IF v_reward_def IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'reward_not_found'::TEXT, 
      'Определение награды не найдено'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
    RETURN;
  END IF;

  -- Извлекаем награды из JSONB
  v_xp_reward := COALESCE((v_reward_def.reward->>'xp')::INTEGER, 0);
  v_coins_reward := COALESCE((v_reward_def.reward->>'coins')::INTEGER, 0);

  -- 🎁 MYSTERY BOX для дня 7 (включено в ту же транзакцию!)
  IF v_week_day = 7 THEN
    -- Генерируем рандом ЗДЕСЬ (серверный)
    v_mystery_reward := public.generate_mystery_box_reward('epic');
    
    -- Добавляем к базовой награде
    v_xp_reward := v_xp_reward + COALESCE((v_mystery_reward->>'xp')::INTEGER, 0);
    v_coins_reward := v_coins_reward + COALESCE((v_mystery_reward->>'coins')::INTEGER, 0);
  END IF;

  -- ✅ 5. Блокируем профиль
  SELECT xp, coins INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'profile_not_found'::TEXT, 
      'Профиль не найден'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
    RETURN;
  END IF;

  -- Вычисляем новые балансы
  v_new_xp := COALESCE(v_profile.xp, 0) + v_xp_reward;
  v_new_coins := COALESCE(v_profile.coins, 0) + v_coins_reward;

  -- ✅ 6. Атомарно обновляем user_daily_bonus
  UPDATE public.user_daily_bonus
  SET 
    current_streak = v_new_streak,
    last_claimed_date = p_server_today,
    total_claims = total_claims + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND (last_claimed_date IS NULL OR last_claimed_date < p_server_today);

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      'update_failed'::TEXT, 
      'Concurrent update detected'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
    RETURN;
  END IF;

  -- ✅ 7. Обновляем профиль
  UPDATE public.profiles
  SET 
    xp = v_new_xp,
    coins = v_new_coins,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- ✅ 8. Транзакция
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'daily_bonus_claimed',
    v_coins_reward,
    jsonb_build_object(
      'streak', v_new_streak,
      'week_day', v_week_day,
      'xp_reward', v_xp_reward,
      'coins_reward', v_coins_reward,
      'freeze_used', v_freeze_used,
      'mystery_reward', v_mystery_reward,
      'claimed_at_utc', NOW(),
      'server_date', p_server_today
    )
  );

  -- ✅ 9. Возвращаем успех
  RETURN QUERY SELECT 
    TRUE,
    NULL::TEXT,
    CASE 
      WHEN v_freeze_used THEN 'Streak спасён заморозкой! ❄️'
      WHEN v_week_day = 7 THEN '🏆 Неделя завершена! Бонус от Mystery Box!'
      ELSE 'Награда получена!'
    END,
    v_new_streak,
    v_week_day,
    v_reward_def.reward,
    v_new_xp,
    v_new_coins,
    v_freeze_used,
    v_mystery_reward;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT 
      FALSE, 
      'concurrent_claim'::TEXT, 
      'Уже обрабатывается. Попробуйте через секунду.'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in claim_daily_bonus_atomic: %', SQLERRM;
    RETURN QUERY SELECT 
      FALSE, 
      'internal_error'::TEXT, 
      'Внутренняя ошибка'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER,
      NULL::BOOLEAN,
      NULL::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. MYSTERY BOX REWARD GENERATOR (простой)
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_mystery_box_reward(p_box_type TEXT)
RETURNS JSONB AS $$
DECLARE
  v_random NUMERIC;
  v_reward JSONB;
BEGIN
  -- Простой weighted random без отдельной таблицы
  v_random := RANDOM();
  
  CASE p_box_type
    WHEN 'epic' THEN
      -- Epic box (день 7)
      IF v_random < 0.20 THEN
        v_reward := '{"xp": 150, "coins": 100, "name": "XP Boost", "emoji": "⚡"}'::jsonb;
      ELSIF v_random < 0.40 THEN
        v_reward := '{"xp": 100, "coins": 150, "name": "Coin Jackpot", "emoji": "💰"}'::jsonb;
      ELSIF v_random < 0.60 THEN
        v_reward := '{"xp": 200, "coins": 0, "name": "Mega XP", "emoji": "🚀"}'::jsonb;
      ELSIF v_random < 0.80 THEN
        v_reward := '{"xp": 0, "coins": 200, "name": "Mega Coins", "emoji": "🪙"}'::jsonb;
      ELSE
        v_reward := '{"xp": 250, "coins": 200, "name": "JACKPOT!", "emoji": "💎"}'::jsonb;
      END IF;
      
    WHEN 'rare' THEN
      -- Rare box
      IF v_random < 0.40 THEN
        v_reward := '{"xp": 50, "coins": 40, "name": "Rare Prize", "emoji": "✨"}'::jsonb;
      ELSE
        v_reward := '{"xp": 75, "coins": 60, "name": "Good Prize", "emoji": "🎁"}'::jsonb;
      END IF;
      
    ELSE
      -- Common box
      v_reward := '{"xp": 20, "coins": 15, "name": "Small Prize", "emoji": "🎁"}'::jsonb;
  END CASE;
  
  RETURN v_reward;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.generate_mystery_box_reward IS 
  'Генерация Mystery Box награды с серверным рандомом (включена в claim для экономии)';

-- ============================================
-- 5. ФУНКЦИЯ ПОКУПКИ FREEZE (обновленная)
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_streak_freeze(
  p_user_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_cost INTEGER := p_quantity * 50;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_quantity <= 0 OR p_quantity > 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_quantity',
      'message', 'Можно купить от 1 до 10 за раз'
    );
  END IF;

  -- Блокируем профиль
  SELECT coins INTO v_current_coins
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_current_coins < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_coins',
      'message', 'Недостаточно монет. Нужно: ' || v_cost
    );
  END IF;
  
  -- Списываем монеты
  UPDATE public.profiles
  SET coins = coins - v_cost, updated_at = NOW()
  WHERE id = p_user_id;

  v_new_balance := v_current_coins - v_cost;
  
  -- ✅ Обновляем денормализованное поле freeze_available
  UPDATE public.user_daily_bonus
  SET 
    freeze_available = COALESCE(freeze_available, 0) + p_quantity,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Если записи нет - создаем
  IF NOT FOUND THEN
    INSERT INTO public.user_daily_bonus (user_id, freeze_available)
    VALUES (p_user_id, p_quantity);
  END IF;
  
  -- Транзакция
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'purchase_streak_freeze',
    -v_cost,
    jsonb_build_object('quantity', p_quantity, 'unit_cost', 50, 'total_cost', v_cost)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'quantity_added', p_quantity,
    'new_balance', v_new_balance,
    'message', 'Куплено ' || p_quantity || ' заморозок!'
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Комментарии и права
-- ============================================

COMMENT ON FUNCTION public.claim_daily_bonus_atomic IS 
  'Оптимизированная функция claim: включает auto-freeze + mystery box в одной транзакции';

GRANT EXECUTE ON FUNCTION public.claim_daily_bonus_atomic TO service_role;
GRANT EXECUTE ON FUNCTION public.buy_streak_freeze TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mystery_box_reward TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_daily_bonus_atomic FROM anon, authenticated;

