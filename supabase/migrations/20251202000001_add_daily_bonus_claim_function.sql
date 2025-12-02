-- ============================================
-- Защищенная функция для получения daily bonus
-- Защита от timezone exploit и race conditions
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
  new_balance_coins INTEGER
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
BEGIN
  -- ✅ 1. Блокируем запись для атомарного обновления (защита от race condition)
  SELECT * INTO v_bonus_record
  FROM public.user_daily_bonus
  WHERE user_id = p_user_id
  FOR UPDATE NOWAIT;

  -- Если нет записи - создаем
  IF v_bonus_record IS NULL THEN
    INSERT INTO public.user_daily_bonus (user_id, current_streak, total_claims)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_bonus_record;
  END IF;

  -- ✅ 2. СЕРВЕРНАЯ ПРОВЕРКА: уже получено сегодня?
  IF v_bonus_record.last_claimed_date = p_server_today THEN
    RETURN QUERY SELECT 
      FALSE, 
      'already_claimed_today'::TEXT, 
      'Награда уже получена сегодня (server time)'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
    RETURN;
  END IF;

  -- ✅ 3. Вычисляем новый streak (на сервере!)
  IF v_bonus_record.last_claimed_date = p_server_yesterday THEN
    -- Продолжаем streak
    v_new_streak := v_bonus_record.current_streak + 1;
  ELSIF v_bonus_record.last_claimed_date IS NULL THEN
    -- Первое получение
    v_new_streak := 1;
  ELSE
    -- Streak прерван (пропущены дни)
    v_new_streak := 1;
    
    -- Логируем потерю streak (если есть таблица user_events)
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
    EXCEPTION
      WHEN undefined_table THEN
        -- Таблица user_events не существует, пропускаем логирование
        NULL;
    END;
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
      'Определение награды не найдено для дня ' || v_week_day::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Извлекаем награды из JSONB
  v_xp_reward := COALESCE((v_reward_def.reward->>'xp')::INTEGER, 0);
  v_coins_reward := COALESCE((v_reward_def.reward->>'coins')::INTEGER, 0);

  -- ✅ 5. Блокируем профиль и получаем текущий баланс
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
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Вычисляем новые балансы
  v_new_xp := COALESCE(v_profile.xp, 0) + v_xp_reward;
  v_new_coins := COALESCE(v_profile.coins, 0) + v_coins_reward;

  -- ✅ 6. Атомарно обновляем user_daily_bonus
  UPDATE public.user_daily_bonus
  SET 
    current_streak = v_new_streak,
    last_claimed_date = p_server_today,  -- ✅ СЕРВЕРНАЯ ДАТА (UTC)
    total_claims = total_claims + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND (last_claimed_date IS NULL OR last_claimed_date < p_server_today);

  -- Проверяем, что обновление прошло
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      'update_failed'::TEXT, 
      'Не удалось обновить (concurrent update detected)'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
    RETURN;
  END IF;

  -- ✅ 7. Обновляем профиль (XP и coins)
  UPDATE public.profiles
  SET 
    xp = v_new_xp,
    coins = v_new_coins,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- ✅ 8. Записываем транзакцию
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
      'reward_data', v_reward_def.reward,
      'claimed_at_utc', NOW(),
      'server_date', p_server_today
    )
  );

  -- ✅ 9. Возвращаем успех
  RETURN QUERY SELECT 
    TRUE,
    NULL::TEXT,
    'Награда получена успешно!'::TEXT,
    v_new_streak,
    v_week_day,
    v_reward_def.reward,
    v_new_xp,
    v_new_coins;

EXCEPTION
  WHEN lock_not_available THEN
    -- Кто-то уже обрабатывает бонус для этого пользователя
    RETURN QUERY SELECT 
      FALSE, 
      'concurrent_claim'::TEXT, 
      'Уже обрабатывается другой запрос. Попробуйте через секунду.'::TEXT,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
  WHEN OTHERS THEN
    -- Любая другая ошибка
    RAISE WARNING 'Error in claim_daily_bonus_atomic: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN QUERY SELECT 
      FALSE, 
      'internal_error'::TEXT, 
      'Внутренняя ошибка: ' || SQLERRM,
      NULL::INTEGER, 
      NULL::INTEGER, 
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий для документации
COMMENT ON FUNCTION public.claim_daily_bonus_atomic IS 
  'Атомарная функция для получения ежедневного бонуса с защитой от timezone exploit и race conditions. Использует серверное UTC время.';

-- Права доступа: только service_role (Edge Functions)
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus_atomic TO service_role;
REVOKE EXECUTE ON FUNCTION public.claim_daily_bonus_atomic FROM anon, authenticated;


