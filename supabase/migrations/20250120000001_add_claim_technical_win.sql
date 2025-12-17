-- Добавляем поле winner_id в таблицу duels (если его еще нет)
ALTER TABLE public.duels
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- RPC функция для безопасного получения технической победы при отключении оппонента
-- Проверяет на сервере, что оппонент действительно офлайн > 50 секунд
-- КРИТИЧНО: Тот, кто остался онлайн и вызвал эту функцию, ВСЕГДА побеждает (Technical Win)
-- Отключение оппонента = автоматическое поражение, независимо от счета
CREATE OR REPLACE FUNCTION public.claim_technical_win(
  p_duel_id UUID,
  p_profile_id UUID -- ID того, кто ЗАЯВЛЯЕТ о победе (оставшийся игрок)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duel_status TEXT;
  v_my_player_id UUID;
  v_opponent_player_id UUID;
  v_opponent_last_heartbeat TIMESTAMPTZ;
  v_time_since_heartbeat INTERVAL;
  v_my_score INTEGER;
  v_opponent_score INTEGER;
  v_bet_amount INTEGER;
  v_is_opponent_connected BOOLEAN;
  -- Переменные для обработки ставок
  v_bet_row RECORD;
  v_opponent_user_id UUID;
  v_total_pot INTEGER;
  v_winner_payout INTEGER;
  v_host_user_id UUID;
  v_host_outcome TEXT;
  v_opponent_outcome TEXT;
  v_host_season_sp INTEGER;
  v_opponent_season_sp INTEGER;
  v_opponent_coverage INTEGER;
  v_host_coverage INTEGER;
BEGIN
  -- 1. Блокируем строку дуэли для избежания Race Condition
  -- Если кто-то другой уже завершает дуэль, мы подождем
  SELECT status, bet_amount
  INTO v_duel_status, v_bet_amount
  FROM public.duels
  WHERE id = p_duel_id
  FOR UPDATE; -- <--- ВАЖНО: предотвращает одновременные вызовы

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duel not found');
  END IF;

  IF v_duel_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duel is already finished');
  END IF;

  -- 2. Получаем ID игроков
  SELECT id, score INTO v_my_player_id, v_my_score
  FROM public.duel_players
  WHERE duel_id = p_duel_id AND user_id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this duel');
  END IF;

  SELECT id, last_heartbeat_at, score, is_connected
  INTO v_opponent_player_id, v_opponent_last_heartbeat, v_opponent_score, v_is_opponent_connected
  FROM public.duel_players
  WHERE duel_id = p_duel_id AND user_id != p_profile_id
  LIMIT 1; -- <--- Защита, если вдруг записей больше

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opponent not found');
  END IF;

  -- 3. Вычисляем время с последнего heartbeat
  IF v_opponent_last_heartbeat IS NULL THEN
    -- Если соперник зашел в лобби, но ни разу не пинганул - считаем что он отвалился давно
    v_time_since_heartbeat := INTERVAL '1000 seconds'; 
  ELSE
    v_time_since_heartbeat := NOW() - v_opponent_last_heartbeat;
  END IF;

  -- 4. СЕРВЕРНАЯ ПРОВЕРКА (Grace Period)
  -- 50 секунд - разумный буфер (клиент ждет 60, сервер разрешает после 50)
  IF EXTRACT(EPOCH FROM v_time_since_heartbeat) < 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Opponent is still theoretically online',
      'debug_seconds', EXTRACT(EPOCH FROM v_time_since_heartbeat)
    );
  END IF;

  -- 5. Обновляем статус оппонента (для чистоты данных)
  IF v_is_opponent_connected THEN
    UPDATE public.duel_players
    SET is_connected = false, activity_status = 'timeout'
    WHERE id = v_opponent_player_id;
  END IF;

  -- 6. ФИКСИРУЕМ ПОБЕДУ
  -- Тот, кто остался - победил. Оппонент - проиграл (дисконнект).
  -- КРИТИЧНО: Отключение = автоматическое поражение, независимо от счета
  UPDATE public.duels
  SET 
    status = 'finished', 
    finished_at = NOW(),
    winner_id = p_profile_id -- <--- Записываем победителя в саму дуэль
  WHERE id = p_duel_id;

  -- 7. Обновляем статистику (ВСЕГДА победа для заявителя, ВСЕГДА поражение для оппонента)
  PERFORM public.upsert_duel_stats(
    p_user_id := p_profile_id,
    p_is_win := true, -- ВСЕГДА ПОБЕДА
    p_is_draw := false,
    p_score := v_my_score
  );

  PERFORM public.upsert_duel_stats(
    p_user_id := (SELECT user_id FROM public.duel_players WHERE id = v_opponent_player_id),
    p_is_win := false, -- ВСЕГДА ПОРАЖЕНИЕ
    p_is_draw := false,
    p_score := v_opponent_score
  );

  -- 8. Логируем инцидент
  INSERT INTO public.duel_incidents (
    duel_id,
    player_id,
    incident_type,
    metadata
  ) VALUES (
    p_duel_id,
    v_opponent_player_id,
    'timeout',
    jsonb_build_object(
      'winner_by_claim', p_profile_id,
      'offline_seconds', EXTRACT(EPOCH FROM v_time_since_heartbeat),
      'my_score', v_my_score,
      'opponent_score', v_opponent_score
    )
  );

  -- 9. Распределяем ставки (если есть)
  -- КРИТИЧНО: Победитель получает весь банк (betAmount * 2), так как оппонент отключился
  -- Ставки уже списаны до начала матча (Hold), поэтому просто переводим победителю
  IF v_bet_amount > 0 THEN
    -- Получаем данные о ставке
    SELECT * INTO v_bet_row
    FROM public.duel_bets
    WHERE duel_id = p_duel_id
    LIMIT 1;

    -- Получаем ID оппонента
    SELECT user_id INTO v_opponent_user_id
    FROM public.duel_players
    WHERE id = v_opponent_player_id;

    -- Получаем host_user из дуэли
    SELECT host_user INTO v_host_user_id
    FROM public.duels
    WHERE id = p_duel_id;

    IF v_bet_row IS NOT NULL AND v_opponent_user_id IS NOT NULL THEN
      -- Банк полностью игрокам - комиссия убрана
      v_total_pot := v_bet_amount * 2;
      v_winner_payout := v_total_pot;

      -- Начисляем монеты победителю
      PERFORM public.increment_profile_value(
        p_profile_id := p_profile_id,
        p_column := 'coins',
        p_amount := v_winner_payout
      );

      -- Записываем транзакцию
      INSERT INTO public.duel_transactions (
        duel_id,
        user_id,
        amount,
        transaction_type
      ) VALUES (
        p_duel_id,
        p_profile_id,
        v_winner_payout,
        'win'
      );

      -- Обработка страховки (если включена)
      -- ПРИМЕЧАНИЕ: Полная логика страховки из Edge Function может быть добавлена позже
      -- Здесь базовая версия - возвращаем страховку проигравшему, если она была
      IF v_bet_row.host_user = p_profile_id AND v_bet_row.opponent_insurance_enabled THEN
        -- Победитель - хост, возвращаем страховку оппоненту
        IF v_bet_row.opponent_coverage_rate > 0 THEN
          v_opponent_coverage := CEIL(v_bet_amount * v_bet_row.opponent_coverage_rate);
          PERFORM public.increment_profile_value(
            p_profile_id := v_opponent_user_id,
            p_column := 'coins',
            p_amount := v_opponent_coverage
          );
          INSERT INTO public.duel_transactions (
            duel_id, user_id, amount, transaction_type
          ) VALUES (
            p_duel_id, v_opponent_user_id, v_opponent_coverage, 'insurance_refund'
          );
        END IF;
      ELSIF v_bet_row.opponent_user = p_profile_id AND v_bet_row.host_insurance_enabled THEN
        -- Победитель - оппонент, возвращаем страховку хосту
        IF v_bet_row.host_coverage_rate > 0 THEN
          v_host_coverage := CEIL(v_bet_amount * v_bet_row.host_coverage_rate);
          PERFORM public.increment_profile_value(
            p_profile_id := v_host_user_id,
            p_column := 'coins',
            p_amount := v_host_coverage
          );
          INSERT INTO public.duel_transactions (
            duel_id, user_id, amount, transaction_type
          ) VALUES (
            p_duel_id, v_host_user_id, v_host_coverage, 'insurance_refund'
          );
        END IF;
      END IF;

      -- Определяем исходы для расчета Season SP
      v_host_outcome := CASE 
        WHEN v_host_user_id = p_profile_id THEN 'win'
        ELSE 'lose'
      END;
      v_opponent_outcome := CASE 
        WHEN v_opponent_user_id = p_profile_id THEN 'win'
        ELSE 'lose'
      END;

      -- Расчет Season SP (упрощенная версия)
      -- ПРИМЕЧАНИЕ: Полная логика с risk multiplier может быть добавлена позже
      v_host_season_sp := CASE 
        WHEN v_host_outcome = 'win' THEN 20
        ELSE 5
      END;
      v_opponent_season_sp := CASE 
        WHEN v_opponent_outcome = 'win' THEN 20
        ELSE 5
      END;

      -- Обновляем статус ставки
      UPDATE public.duel_bets
      SET 
        status = 'settled',
        season_sp_host = v_host_season_sp,
        season_sp_opponent = v_opponent_season_sp
      WHERE duel_id = p_duel_id;

      -- Записываем в историю ставок
      INSERT INTO public.duel_bet_history (
        bet_id,
        duel_id,
        result,
        payout_host,
        payout_opponent,
        season_sp_host,
        season_sp_opponent
      ) VALUES (
        v_bet_row.id,
        p_duel_id,
        CASE WHEN v_host_user_id = p_profile_id THEN 'host_win' ELSE 'opponent_win' END,
        CASE WHEN v_host_user_id = p_profile_id THEN v_winner_payout ELSE 0 END,
        CASE WHEN v_opponent_user_id = p_profile_id THEN v_winner_payout ELSE 0 END,
        v_host_season_sp,
        v_opponent_season_sp
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'winner_id', p_profile_id,
    'reason', 'opponent_timeout',
    'my_score', v_my_score,
    'opponent_score', v_opponent_score,
    'offline_seconds', EXTRACT(EPOCH FROM v_time_since_heartbeat)
  );
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.claim_technical_win IS 'Safely claims a technical win when opponent is offline > 50 seconds. Server-side verification prevents cheating. The player who stays online ALWAYS wins, regardless of score. Disconnect = automatic forfeit.';

