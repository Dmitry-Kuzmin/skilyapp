-- ============================================
-- ИСПРАВЛЕНИЕ: Возвращаем user_items + кеш
-- Гибрид для расширяемости + производительности
-- ============================================

-- ============================================
-- 1. Восстанавливаем user_items (источник истины)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,  -- 'streak_freeze', 'boost_ticket', 'mystery_box', etc
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type)
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_items_user_type 
  ON public.user_items(user_id, item_type);

CREATE INDEX IF NOT EXISTS idx_user_items_type 
  ON public.user_items(item_type) 
  WHERE quantity > 0;

-- ============================================
-- 2. user_daily_bonus.freeze_available = КЕШ
-- (уже есть из предыдущей миграции)
-- ============================================

COMMENT ON COLUMN public.user_daily_bonus.freeze_available IS 
  'КЕШ количества freeze из user_items (обновляется триггером для производительности)';

-- ============================================
-- 3. Миграция существующих данных
-- ============================================

-- Если были данные в freeze_available, переносим в user_items
INSERT INTO public.user_items (user_id, item_type, quantity)
SELECT 
  user_id, 
  'streak_freeze', 
  freeze_available
FROM public.user_daily_bonus
WHERE freeze_available > 0
ON CONFLICT (user_id, item_type) 
DO UPDATE SET 
  quantity = EXCLUDED.quantity,
  updated_at = NOW();

-- ============================================
-- 4. Триггер синхронизации КЕШа
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_item_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- При изменении streak_freeze - обновляем кеш
  IF NEW.item_type = 'streak_freeze' THEN
    -- Обновляем или создаем запись в user_daily_bonus
    INSERT INTO public.user_daily_bonus (user_id, freeze_available, current_streak, total_claims)
    VALUES (NEW.user_id, NEW.quantity, 0, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      freeze_available = NEW.quantity,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для INSERT/UPDATE в user_items
CREATE TRIGGER sync_freeze_cache_on_change
  AFTER INSERT OR UPDATE ON public.user_items
  FOR EACH ROW
  WHEN (NEW.item_type = 'streak_freeze')
  EXECUTE FUNCTION public.sync_item_cache();

-- Триггер для DELETE (уменьшаем кеш)
CREATE OR REPLACE FUNCTION public.sync_item_cache_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.item_type = 'streak_freeze' THEN
    UPDATE public.user_daily_bonus
    SET 
      freeze_available = 0,
      updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_freeze_cache_on_delete
  AFTER DELETE ON public.user_items
  FOR EACH ROW
  WHEN (OLD.item_type = 'streak_freeze')
  EXECUTE FUNCTION public.sync_item_cache_on_delete();

-- ============================================
-- 5. RLS для user_items
-- ============================================

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
  ON public.user_items FOR SELECT
  USING (public.can_access_daily_bonus(user_id));

CREATE POLICY "Users can insert their own items"
  ON public.user_items FOR INSERT
  WITH CHECK (public.can_access_daily_bonus(user_id));

-- UPDATE/DELETE только через функции (service_role)
CREATE POLICY "System can update items"
  ON public.user_items FOR UPDATE
  USING (current_setting('role', true) = 'service_role');

CREATE POLICY "System can delete items"
  ON public.user_items FOR DELETE
  USING (current_setting('role', true) = 'service_role');

-- ============================================
-- 6. Обновляем buy_streak_freeze
-- Теперь пишем в user_items, кеш обновится автоматически
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
  
  -- ✅ Обновляем user_items (источник истины)
  -- Кеш обновится автоматически через триггер
  INSERT INTO public.user_items (user_id, item_type, quantity)
  VALUES (p_user_id, 'streak_freeze', p_quantity)
  ON CONFLICT (user_id, item_type)
  DO UPDATE SET 
    quantity = user_items.quantity + p_quantity,
    updated_at = NOW();
  
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
-- 7. Обновляем claim_daily_bonus_atomic
-- Читаем из кеша, обновляем user_items
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
  mystery_reward JSONB
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
  -- ✅ 1. Блокируем запись
  SELECT * INTO v_bonus_record
  FROM public.user_daily_bonus
  WHERE user_id = p_user_id
  FOR UPDATE NOWAIT;

  IF v_bonus_record IS NULL THEN
    INSERT INTO public.user_daily_bonus (user_id, current_streak, total_claims, freeze_available)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_bonus_record;
  END IF;

  -- ✅ 2. Проверка: уже получено сегодня?
  IF v_bonus_record.last_claimed_date = p_server_today THEN
    RETURN QUERY SELECT 
      FALSE, 
      'already_claimed_today'::TEXT, 
      'Награда уже получена сегодня'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  -- ✅ 3. Вычисляем новый streak + AUTO FREEZE
  IF v_bonus_record.last_claimed_date = p_server_yesterday THEN
    v_new_streak := v_bonus_record.current_streak + 1;
    
  ELSIF v_bonus_record.last_claimed_date IS NULL THEN
    v_new_streak := 1;
    
  ELSE
    -- ❄️ ПРОПУСК ДНЯ ОБНАРУЖЕН!
    
    -- Читаем из КЕША (быстро)
    IF v_bonus_record.freeze_available > 0 THEN
      -- ✅ AUTO-USE FREEZE
      v_new_streak := v_bonus_record.current_streak;
      v_freeze_used := TRUE;
      
      -- Обновляем источник истины (user_items)
      -- Кеш обновится автоматически через триггер
      UPDATE public.user_items
      SET 
        quantity = quantity - 1,
        updated_at = NOW()
      WHERE user_id = p_user_id 
        AND item_type = 'streak_freeze'
        AND quantity > 0;
      
      -- Логируем
      BEGIN
        INSERT INTO public.user_events (user_id, event_type, metadata)
        VALUES (
          p_user_id,
          'streak_freeze_auto_used',
          jsonb_build_object(
            'streak_saved', v_bonus_record.current_streak,
            'days_missed', p_server_today::DATE - v_bonus_record.last_claimed_date::DATE - 1,
            'server_date', p_server_today
          )
        );
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      
    ELSE
      -- ❌ Нет freeze → streak теряется
      v_new_streak := 1;
      
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

  v_week_day := (v_new_streak - 1) % 7 + 1;

  -- ✅ 4. Получаем reward
  SELECT * INTO v_reward_def
  FROM public.daily_bonus_def
  WHERE day_number = v_week_day;

  IF v_reward_def IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 'reward_not_found'::TEXT, 'Определение награды не найдено'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  v_xp_reward := COALESCE((v_reward_def.reward->>'xp')::INTEGER, 0);
  v_coins_reward := COALESCE((v_reward_def.reward->>'coins')::INTEGER, 0);

  -- 🎁 Mystery Box для дня 7
  IF v_week_day = 7 THEN
    v_mystery_reward := public.generate_mystery_box_reward('epic');
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
      FALSE, 'profile_not_found'::TEXT, 'Профиль не найден'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  v_new_xp := COALESCE(v_profile.xp, 0) + v_xp_reward;
  v_new_coins := COALESCE(v_profile.coins, 0) + v_coins_reward;

  -- ✅ 6. Обновляем user_daily_bonus
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
      FALSE, 'update_failed'::TEXT, 'Concurrent update detected'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  -- ✅ 7. Обновляем профиль
  UPDATE public.profiles
  SET xp = v_new_xp, coins = v_new_coins, updated_at = NOW()
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
    TRUE, NULL::TEXT,
    CASE 
      WHEN v_freeze_used THEN 'Streak спасён заморозкой! ❄️'
      WHEN v_week_day = 7 THEN '🏆 Неделя завершена! Бонус от Mystery Box!'
      ELSE 'Награда получена!'
    END,
    v_new_streak, v_week_day, v_reward_def.reward,
    v_new_xp, v_new_coins, v_freeze_used, v_mystery_reward;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT 
      FALSE, 'concurrent_claim'::TEXT, 'Уже обрабатывается. Попробуйте через секунду.'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in claim_daily_bonus_atomic: %', SQLERRM;
    RETURN QUERY SELECT 
      FALSE, 'internal_error'::TEXT, 'Внутренняя ошибка'::TEXT,
      NULL::INTEGER, NULL::INTEGER, NULL::JSONB, 
      NULL::INTEGER, NULL::INTEGER, NULL::BOOLEAN, NULL::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Комментарии
-- ============================================

COMMENT ON TABLE public.user_items IS 
  'Инвентарь пользователя - источник истины для всех предметов (freeze, tickets, mystery boxes, etc)';

COMMENT ON FUNCTION public.sync_item_cache IS 
  'Синхронизация кеша freeze_available при изменении user_items';

COMMENT ON FUNCTION public.claim_daily_bonus_atomic IS 
  'Оптимизированная функция claim: читает из кеша, обновляет источник истины (user_items)';

-- ============================================
-- Права доступа
-- ============================================

GRANT SELECT ON public.user_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_streak_freeze TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus_atomic TO service_role;



