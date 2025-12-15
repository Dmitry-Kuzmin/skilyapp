-- ============================================
-- ПРОВЕРКА RLS И СОЗДАНИЕ RPC ФУНКЦИИ ДЛЯ БУСТОВ
-- ============================================
-- Эта миграция:
-- 1. Проверяет, что RLS политика для duel_active_exploits правильная
-- 2. Создает RPC функцию для использования бустов (замена Edge Function)
-- ============================================

-- 1. ПРОВЕРКА И СОЗДАНИЕ RLS ПОЛИТИКИ
-- Удаляем старую политику если существует (для пересоздания с правильными параметрами)
DROP POLICY IF EXISTS "Allow read active exploits for everyone" ON public.duel_active_exploits;

-- Создаем политику с USING (true) - разрешает чтение всех exploits всем авторизованным пользователям
CREATE POLICY "Allow read active exploits for everyone"
ON public.duel_active_exploits
FOR SELECT
TO authenticated
USING (true);

-- Комментарий для документации
COMMENT ON POLICY "Allow read active exploits for everyone" ON public.duel_active_exploits IS 
  'Политика для чтения exploits в дуэлях. Разрешает чтение всех exploits всем авторизованным пользователям для обеспечения работы Realtime и polling.';

-- 2. СОЗДАНИЕ RPC ФУНКЦИИ ДЛЯ ИСПОЛЬЗОВАНИЯ БУСТОВ
-- Эта функция заменяет Edge Function для надежности в Telegram Mini Apps
CREATE OR REPLACE FUNCTION public.use_boost_attack(
  p_duel_id uuid,
  p_boost_type text,
  p_duel_question_id uuid DEFAULT NULL,
  p_language text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Запускаем от имени админа для обхода RLS при вставке
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
BEGIN
  -- 1. Получаем profile_id текущего пользователя
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
     OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- 2. Получаем ID игрока-атакующего
  SELECT id INTO v_attacker_player_id
  FROM duel_players
  WHERE duel_id = p_duel_id
    AND user_id = v_profile_id
    AND is_bot = false
  LIMIT 1;
  
  IF v_attacker_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found in this duel';
  END IF;
  
  -- 3. Проверяем наличие буста в инвентаре
  SELECT EXISTS (
    SELECT 1 FROM user_boost_inventory
    WHERE user_id = v_profile_id
      AND boost_type = p_boost_type
      AND quantity > 0
  ) INTO v_has_boost;
  
  IF NOT v_has_boost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Boost not available'
    );
  END IF;
  
  -- 4. Списываем буст из инвентаря
  PERFORM modify_boost_inventory(
    v_profile_id,
    p_boost_type,
    -1
  );
  
  -- 5. Записываем использование буста
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
  
  -- 6. Определяем эффект буста и длительность
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
      -- Получаем вопрос для определения неправильных вариантов
      IF p_duel_question_id IS NOT NULL THEN
        SELECT question_snapshot, correct_option_ids INTO v_question_data, v_correct_ids
        FROM duel_questions
        WHERE id = p_duel_question_id;
        
        IF v_question_data IS NOT NULL THEN
          v_all_options := v_question_data->'answer_options';
          -- Находим неправильные варианты
          SELECT array_agg((opt->>'id')::text) INTO v_incorrect_options
          FROM jsonb_array_elements(v_all_options) opt
          WHERE NOT (opt->>'id' = ANY(v_correct_ids));
          
          -- Скрываем 2 неправильных варианта (или все, если меньше 2)
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
      -- Получаем подсказку из вопроса
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
      -- Неизвестный тип буста
      v_boost_effect := jsonb_build_object('success', true);
  END CASE;
  
  -- 7. Если это exploit (Root Mode), создаем запись в duel_active_exploits
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
    
    -- Проверяем, что attacker != target
    IF v_attacker_player_id = v_target_player_id THEN
      RAISE EXCEPTION 'Cannot create exploit - attacker equals target';
    END IF;
    
    v_expires_at := v_activated_at + (v_duration_ms || ' milliseconds')::interval;
    
    -- Вставляем exploit
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
    
    -- Возвращаем успешный результат с информацией об exploit
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
  'RPC функция для использования бустов в дуэлях. Заменяет Edge Function для надежности в Telegram Mini Apps. Создает exploits в duel_active_exploits для Root Mode бустов.';

