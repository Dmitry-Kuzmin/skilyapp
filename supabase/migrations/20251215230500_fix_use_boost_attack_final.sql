-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ use_boost_attack: Максимально надежный поиск игрока
-- ============================================
-- Проблема: Функция падает с ошибкой "User profile not found" в Telegram Mini App
-- Решение: Ищем игрока ВСЕМИ возможными способами, без требования наличия профиля
-- ============================================

-- КРИТИЧНО: Удаляем все существующие версии функции перед созданием новой
-- Это нужно, так как сигнатура изменилась (добавлен p_profile_id)
DROP FUNCTION IF EXISTS public.use_boost_attack(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.use_boost_attack(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.use_boost_attack(uuid, text);

-- Создаем новую версию функции с полной сигнатурой
CREATE OR REPLACE FUNCTION public.use_boost_attack(
  p_duel_id uuid,
  p_boost_type text,
  p_duel_question_id uuid DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_profile_id uuid DEFAULT NULL  -- Опциональный параметр для надежности
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_attacker_player_id uuid;
  v_target_player_id uuid;
  v_has_boost boolean;
  v_boost_effect jsonb;
  v_duration_ms integer;
  v_expires_at timestamptz;
  v_activated_at timestamptz;
  v_exploit_id uuid;
  -- Переменные для Safe Mode бустов
  v_question_data jsonb;
  v_correct_ids text[];
  v_all_options jsonb;
  v_incorrect_options text[];
  v_to_hide text[];
  v_question_snapshot jsonb;
  v_hint text;
  -- Переменная для проверки exploit
  v_verify_count integer;
  -- Временные переменные для поиска
  v_auth_uid uuid;
  v_telegram_id bigint;
BEGIN
  -- КРИТИЧНО: Логируем начало выполнения функции
  v_auth_uid := auth.uid();
  BEGIN
    v_telegram_id := (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    v_telegram_id := NULL;
  END;
  
  RAISE NOTICE '[use_boost_attack] 🚀 Function called: duel_id=%, boost_type=%, question_id=%, language=%, auth_uid=%, telegram_id=%, p_profile_id=%', 
    p_duel_id, p_boost_type, p_duel_question_id, p_language, v_auth_uid, v_telegram_id, p_profile_id;
  
  -- ============================================
  -- ШАГ 0: Если передан явный p_profile_id, используем его (самый надежный способ)
  -- ============================================
  IF p_profile_id IS NOT NULL AND v_attacker_player_id IS NULL THEN
    SELECT id INTO v_attacker_player_id
    FROM duel_players
    WHERE duel_id = p_duel_id
      AND user_id = p_profile_id
      AND is_bot = false
    LIMIT 1;
    
    IF v_attacker_player_id IS NOT NULL THEN
      v_profile_id := p_profile_id;
      RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 0 (explicit p_profile_id): player_id=%, profile_id=%', 
        v_attacker_player_id, v_profile_id;
    END IF;
  END IF;
  
  -- ============================================
  -- ШАГ 1: ПОИСК ИГРОКА-АТАКУЮЩЕГО (МАКСИМАЛЬНО НАДЕЖНО)
  -- ============================================
  
  -- СТРАТЕГИЯ 1: Ищем игрока напрямую в duel_players через profile.id
  -- (user_id в duel_players = profiles.id, а profiles.user_id = auth.uid())
  IF v_auth_uid IS NOT NULL THEN
    SELECT dp.id INTO v_attacker_player_id
    FROM duel_players dp
    INNER JOIN profiles p ON dp.user_id = p.id
    WHERE dp.duel_id = p_duel_id
      AND dp.is_bot = false
      AND p.user_id = v_auth_uid
    LIMIT 1;
    
    IF v_attacker_player_id IS NOT NULL THEN
      RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 1 (profiles.user_id = auth.uid())';
      SELECT dp.user_id INTO v_profile_id FROM duel_players dp WHERE dp.id = v_attacker_player_id;
    END IF;
  END IF;
  
  -- СТРАТЕГИЯ 2: Если не нашли, пробуем через telegram_id
  IF v_attacker_player_id IS NULL AND v_telegram_id IS NOT NULL THEN
    SELECT dp.id INTO v_attacker_player_id
    FROM duel_players dp
    INNER JOIN profiles p ON dp.user_id = p.id
    WHERE dp.duel_id = p_duel_id
      AND dp.is_bot = false
      AND p.telegram_id = v_telegram_id
    LIMIT 1;
    
    IF v_attacker_player_id IS NOT NULL THEN
      RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 2 (profiles.telegram_id)';
      SELECT dp.user_id INTO v_profile_id FROM duel_players dp WHERE dp.id = v_attacker_player_id;
    END IF;
  END IF;
  
  -- СТРАТЕГИЯ 3: Если все еще не нашли, пробуем прямой поиск профиля и затем игрока
  IF v_attacker_player_id IS NULL THEN
    -- Получаем profile_id любым способом
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE (v_auth_uid IS NOT NULL AND user_id = v_auth_uid)
       OR (v_telegram_id IS NOT NULL AND telegram_id = v_telegram_id)
    LIMIT 1;
    
    -- Если нашли профиль, ищем игрока по profile_id
    IF v_profile_id IS NOT NULL THEN
      SELECT id INTO v_attacker_player_id
      FROM duel_players
      WHERE duel_id = p_duel_id
        AND user_id = v_profile_id
        AND is_bot = false
      LIMIT 1;
      
      IF v_attacker_player_id IS NOT NULL THEN
        RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 3 (profile lookup)';
      END IF;
    END IF;
  END IF;
  
  -- СТРАТЕГИЯ 4: Последняя попытка - ищем игрока по всем профилям с таким auth.uid или telegram_id
  -- (на случай, если есть несколько профилей или что-то сломалось)
  IF v_attacker_player_id IS NULL AND v_auth_uid IS NOT NULL THEN
    SELECT dp.id INTO v_attacker_player_id
    FROM duel_players dp
    WHERE dp.duel_id = p_duel_id
      AND dp.is_bot = false
      AND EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = dp.user_id 
        AND (p.user_id = v_auth_uid OR (v_telegram_id IS NOT NULL AND p.telegram_id = v_telegram_id))
      )
    LIMIT 1;
    
    IF v_attacker_player_id IS NOT NULL THEN
      RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 4 (EXISTS subquery)';
      SELECT dp.user_id INTO v_profile_id FROM duel_players dp WHERE dp.id = v_attacker_player_id;
    END IF;
  END IF;
  
  -- СТРАТЕГИЯ 5: Отчаянная попытка - ищем ВСЕ профили пользователя и проверяем каждого
  IF v_attacker_player_id IS NULL THEN
    DECLARE
      v_temp_profile_id uuid;
      v_temp_player_id uuid;
    BEGIN
      -- Пробуем найти ВСЕ профили, которые могут принадлежать этому пользователю
      FOR v_temp_profile_id IN 
        SELECT id FROM profiles 
        WHERE (v_auth_uid IS NOT NULL AND user_id = v_auth_uid)
           OR (v_telegram_id IS NOT NULL AND telegram_id = v_telegram_id)
        ORDER BY created_at DESC
      LOOP
        -- Для каждого профиля проверяем, есть ли игрок в дуэли
        SELECT id INTO v_temp_player_id
        FROM duel_players
        WHERE duel_id = p_duel_id
          AND user_id = v_temp_profile_id
          AND is_bot = false
        LIMIT 1;
        
        IF v_temp_player_id IS NOT NULL THEN
          v_attacker_player_id := v_temp_player_id;
          v_profile_id := v_temp_profile_id;
          RAISE NOTICE '[use_boost_attack] ✅ Found player via Strategy 5 (brute force profile search): player_id=%, profile_id=%', 
            v_attacker_player_id, v_profile_id;
          EXIT; -- Выходим из цикла
        END IF;
      END LOOP;
    END;
  END IF;
  
  -- Если всё ещё не нашли игрока, возвращаем детальную ошибку
  IF v_attacker_player_id IS NULL THEN
    DECLARE
      v_diagnostic_player_id uuid;
      v_diagnostic_user_id uuid;
      v_all_players jsonb := '[]'::jsonb;
    BEGIN
      RAISE NOTICE '[use_boost_attack] ❌ Attacker not found after all 5 strategies: auth_uid=%, telegram_id=%, duel_id=%', 
        v_auth_uid, v_telegram_id, p_duel_id;
      
      -- Дополнительная диагностика: выводим всех игроков в дуэли (исправленный цикл)
      RAISE NOTICE '[use_boost_attack] 🔍 Diagnostic: All players in duel %', p_duel_id;
      FOR v_diagnostic_player_id, v_diagnostic_user_id IN 
        SELECT id, user_id FROM duel_players WHERE duel_id = p_duel_id
      LOOP
        RAISE NOTICE '[use_boost_attack]   - Player ID: %, user_id (profile.id): %', 
          v_diagnostic_player_id, v_diagnostic_user_id;
        v_all_players := v_all_players || jsonb_build_object(
          'player_id', v_diagnostic_player_id::text,
          'user_id', v_diagnostic_user_id::text
        );
      END LOOP;
      
      -- Выводим все профили, которые могут принадлежать пользователю
      DECLARE
        v_diag_profile_id uuid;
      BEGIN
        RAISE NOTICE '[use_boost_attack] 🔍 Diagnostic: Profiles for auth_uid=% or telegram_id=%', v_auth_uid, v_telegram_id;
        FOR v_diag_profile_id IN 
          SELECT id FROM profiles 
          WHERE (v_auth_uid IS NOT NULL AND user_id = v_auth_uid)
             OR (v_telegram_id IS NOT NULL AND telegram_id = v_telegram_id)
        LOOP
          RAISE NOTICE '[use_boost_attack]   - Profile ID: %', v_diag_profile_id;
        END LOOP;
      END;
    END;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Attacker not found in this duel',
      'debug_info', json_build_object(
        'auth_uid', COALESCE(v_auth_uid::text, 'null'),
        'telegram_id', COALESCE(v_telegram_id::text, 'null'),
        'duel_id', p_duel_id::text,
        'profile_found', (v_profile_id IS NOT NULL)::text,
        'strategies_tried', 5
      )
    );
  END IF;
  
  RAISE NOTICE '[use_boost_attack] ✅✅✅ Attacker player found: attacker_player_id=%, profile_id=%', 
    v_attacker_player_id, v_profile_id;
  
  -- ============================================
  -- ШАГ 2: ПРОВЕРКА И СПИСАНИЕ БУСТА
  -- ============================================
  
  -- Проверяем наличие буста в инвентаре (только если есть profile_id)
  IF v_profile_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM boost_inventory
      WHERE user_id = v_profile_id
        AND boost_type = p_boost_type
        AND quantity > 0
    ) INTO v_has_boost;
    
    IF NOT v_has_boost THEN
      RAISE NOTICE '[use_boost_attack] ❌ Boost not available: user_id=%, boost_type=%', v_profile_id, p_boost_type;
      RETURN json_build_object(
        'success', false,
        'error', 'Boost not available'
      );
    END IF;
    
    RAISE NOTICE '[use_boost_attack] ✅ Boost available, deducting...';
    
    -- Списываем буст из инвентаря
    PERFORM modify_boost_inventory(
      v_profile_id,
      p_boost_type,
      -1
    );
    
    RAISE NOTICE '[use_boost_attack] ✅ Boost deducted from inventory';
  ELSE
    -- Если профиля нет, но игрок найден - пропускаем проверку бустов (для тестов/отладки)
    RAISE NOTICE '[use_boost_attack] ⚠️ No profile found, skipping boost inventory check (test mode)';
    v_has_boost := true;
  END IF;
  
  -- ============================================
  -- ШАГ 3: ЗАПИСЬ ИСПОЛЬЗОВАНИЯ БУСТА
  -- ============================================
  
  INSERT INTO duel_boosts_used (
    duel_id,
    player_id,
    boost_type,
    duel_question_id
  ) VALUES (
    p_duel_id,
    v_attacker_player_id,
    p_boost_type,
    p_duel_question_id
  );
  
  RAISE NOTICE '[use_boost_attack] ✅ Boost usage recorded in duel_boosts_used';
  
  -- ============================================
  -- ШАГ 4: ОПРЕДЕЛЕНИЕ ЭФФЕКТА БУСТА
  -- ============================================
  
  v_activated_at := NOW();
  
  CASE p_boost_type
    -- Root Mode Exploits (создают exploit в duel_active_exploits)
    WHEN 'screen_injector' THEN
      v_duration_ms := 45000; -- 45 секунд
      v_boost_effect := jsonb_build_object(
        'success', true,
        'popup_count', 3,
        'duration_ms', v_duration_ms
      );
    WHEN 'input_lag' THEN
      v_duration_ms := 5000;
      v_boost_effect := jsonb_build_object(
        'success', true,
        'delay_ms', 1500,
        'duration_ms', v_duration_ms
      );
    WHEN 'gps_spoofing' THEN
      v_duration_ms := 10000;
      v_boost_effect := jsonb_build_object(
        'success', true,
        'shuffle_duration_ms', 1000
      );
    WHEN 'police_backdoor' THEN
      v_duration_ms := 8000;
      v_boost_effect := jsonb_build_object(
        'success', true,
        'block_duration_ms', 8000,
        'captcha_required', true
      );
    WHEN 'firewall' THEN
      v_duration_ms := 30000;
      v_boost_effect := jsonb_build_object(
        'success', true,
        'active', true,
        'duration_ms', v_duration_ms
      );
    -- Safe Mode Boosts (не создают exploit, возвращают эффект)
    WHEN 'fifty_fifty' THEN
      IF p_duel_question_id IS NOT NULL THEN
        SELECT question_snapshot, correct_option_ids INTO v_question_data, v_correct_ids
        FROM duel_questions
        WHERE id = p_duel_question_id;
        
        IF v_question_data IS NOT NULL THEN
          v_all_options := v_question_data->'answer_options';
          SELECT array_agg((opt->>'id')::text) INTO v_incorrect_options
          FROM jsonb_array_elements(v_all_options) opt
          WHERE NOT (opt->>'id' = ANY(v_correct_ids));
          
          v_to_hide := array(SELECT unnest(v_incorrect_options) LIMIT 2);
          
          v_boost_effect := jsonb_build_object(
            'success', true,
            'hidden_options', to_jsonb(v_to_hide)
          );
        ELSE
          v_boost_effect := jsonb_build_object('success', true);
        END IF;
      ELSE
        v_boost_effect := jsonb_build_object('success', true);
      END IF;
    WHEN 'time_extend' THEN
      v_boost_effect := jsonb_build_object(
        'success', true,
        'time_added_ms', 30000
      );
    WHEN 'hint' THEN
      IF p_duel_question_id IS NOT NULL THEN
        SELECT question_snapshot INTO v_question_snapshot
        FROM duel_questions
        WHERE id = p_duel_question_id;
        
        IF v_question_snapshot IS NOT NULL THEN
          v_hint := COALESCE(
            v_question_snapshot->>'explanation_ru',
            v_question_snapshot->>'explanation_es',
            v_question_snapshot->>'explanation_en',
            'Подсказка недоступна'
          );
          
          v_boost_effect := jsonb_build_object(
            'success', true,
            'hint', v_hint
          );
        ELSE
          v_boost_effect := jsonb_build_object('success', true);
        END IF;
      ELSE
        v_boost_effect := jsonb_build_object('success', true);
      END IF;
    WHEN 'skip' THEN
      v_boost_effect := jsonb_build_object(
        'success', true,
        'skip_confirmed', true
      );
    WHEN 'translate' THEN
      v_boost_effect := jsonb_build_object(
        'success', true,
        'translate_applied', true,
        'language', COALESCE(p_language, 'ru')
      );
    WHEN 'rewind' THEN
      v_boost_effect := jsonb_build_object(
        'success', true,
        'rewind_confirmed', true
      );
    ELSE
      v_boost_effect := jsonb_build_object('success', true);
  END CASE;
  
  -- ============================================
  -- ШАГ 5: СОЗДАНИЕ EXPLOIT (если Root Mode)
  -- ============================================
  
  IF v_duration_ms IS NOT NULL THEN
    -- Находим соперника (второй игрок в дуэли)
    SELECT id INTO v_target_player_id
    FROM duel_players
    WHERE duel_id = p_duel_id
      AND id != v_attacker_player_id
      AND is_bot = false
    LIMIT 1;
    
    -- Если нет человеческого соперника, ищем бота
    IF v_target_player_id IS NULL THEN
      SELECT id INTO v_target_player_id
      FROM duel_players
      WHERE duel_id = p_duel_id
        AND id != v_attacker_player_id
        AND is_bot = true
      LIMIT 1;
    END IF;
    
    IF v_target_player_id IS NULL THEN
      RAISE EXCEPTION 'Opponent not found in this duel';
    END IF;
    
    IF v_attacker_player_id = v_target_player_id THEN
      RAISE EXCEPTION 'Cannot create exploit - attacker equals target';
    END IF;
    
    RAISE NOTICE '[use_boost_attack] ✅ Target player found: target_player_id=%, attacker_player_id=%', 
      v_target_player_id, v_attacker_player_id;
    
    v_expires_at := v_activated_at + (v_duration_ms || ' milliseconds')::interval;
    
    RAISE NOTICE '[use_boost_attack] 💾 Inserting exploit: duel_id=%, exploit_type=%, attacker=%, target=%, expires_at=%', 
      p_duel_id, p_boost_type, v_attacker_player_id, v_target_player_id, v_expires_at;
    
    INSERT INTO duel_active_exploits (
      duel_id,
      exploit_type,
      attacker_player_id,
      target_player_id,
      effect_data,
      activated_at,
      expires_at,
      is_active
    ) VALUES (
      p_duel_id,
      p_boost_type,
      v_attacker_player_id,
      v_target_player_id,
      v_boost_effect,
      v_activated_at,
      v_expires_at,
      true
    )
    RETURNING id INTO v_exploit_id;
    
    RAISE NOTICE '[use_boost_attack] ✅✅✅ Exploit created successfully: exploit_id=%', v_exploit_id;
    
    -- Проверяем, что exploit можно найти через запрос (как это делает клиент)
    SELECT COUNT(*) INTO v_verify_count
    FROM duel_active_exploits
    WHERE duel_id = p_duel_id
      AND attacker_player_id != v_target_player_id
      AND is_active = true
      AND expires_at > NOW();
    
    RAISE NOTICE '[use_boost_attack] 🔍 Verification query result: found % exploits for target player (target_player_id=%)', 
      v_verify_count, v_target_player_id;
    
    RETURN json_build_object(
      'success', true,
      'boost_effect', v_boost_effect,
      'exploit_id', v_exploit_id,
      'target_player_id', v_target_player_id,
      'attacker_player_id', v_attacker_player_id,
      'expires_at', v_expires_at
    );
  ELSE
    -- Safe mode буст - возвращаем только эффект
    RETURN json_build_object(
      'success', true,
      'boost_effect', v_boost_effect
    );
  END IF;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.use_boost_attack IS
  'RPC функция для использования бустов в дуэлях. Использует 4 стратегии поиска игрока для максимальной надежности в Telegram Mini App.';

