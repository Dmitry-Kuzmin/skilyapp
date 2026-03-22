-- ============================================
-- ADD 5 NEW WEATHER/ROAD ATTACK BOOSTS
-- ============================================
-- Новые атаки с интерактивными мини-играми для дуэлей:
-- ice_screen, sun_glare, rain_storm, bug_splat, fog_screen

-- 1. BOOST DEFINITIONS
-- ❄️ Замерзшее стекло
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium, mode, category, target_type)
VALUES ('ice_screen', 'Замерзшее стекло', 'Hielo en parabrisas', 'Покрывает экран льдом. Сопернику нужно разбить 9 кусков льда тапами', 'Cubre la pantalla de hielo. El rival debe romper 9 trozos tocando', '❄️', 35, false, 'root', 'exploit', 'opponent')
ON CONFLICT (type) DO UPDATE SET name_ru=EXCLUDED.name_ru, name_es=EXCLUDED.name_es, description_ru=EXCLUDED.description_ru, description_es=EXCLUDED.description_es, icon=EXCLUDED.icon, cost_coins=EXCLUDED.cost_coins, is_premium=EXCLUDED.is_premium, mode=EXCLUDED.mode, category=EXCLUDED.category, target_type=EXCLUDED.target_type;

-- ☀️ Ослепляющее солнце
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium, mode, category, target_type)
VALUES ('sun_glare', 'Ослепляющее солнце', 'Deslumbramiento', 'Ослепляет экран ярким светом. Сопернику нужно опустить козырёк свайпом вниз', 'Deslumbra la pantalla con luz. El rival debe bajar la visera deslizando', '☀️', 25, false, 'root', 'exploit', 'opponent')
ON CONFLICT (type) DO UPDATE SET name_ru=EXCLUDED.name_ru, name_es=EXCLUDED.name_es, description_ru=EXCLUDED.description_ru, description_es=EXCLUDED.description_es, icon=EXCLUDED.icon, cost_coins=EXCLUDED.cost_coins, is_premium=EXCLUDED.is_premium, mode=EXCLUDED.mode, category=EXCLUDED.category, target_type=EXCLUDED.target_type;

-- 🌧️ Ливень
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium, mode, category, target_type)
VALUES ('rain_storm', 'Ливень', 'Lluvia torrencial', 'Заливает экран дождём с размытием. Сопернику нужно работать дворниками — свайпы влево-вправо', 'Inunda la pantalla con lluvia. El rival debe usar los limpiaparabrisas deslizando', '🌧️', 20, false, 'root', 'exploit', 'opponent')
ON CONFLICT (type) DO UPDATE SET name_ru=EXCLUDED.name_ru, name_es=EXCLUDED.name_es, description_ru=EXCLUDED.description_ru, description_es=EXCLUDED.description_es, icon=EXCLUDED.icon, cost_coins=EXCLUDED.cost_coins, is_premium=EXCLUDED.is_premium, mode=EXCLUDED.mode, category=EXCLUDED.category, target_type=EXCLUDED.target_type;

-- 🪰 Мошкара
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium, mode, category, target_type)
VALUES ('bug_splat', 'Мошкара', 'Mosquitos', 'Залепляет экран пятнами от жуков. Сопернику нужно зажать кнопку омывателя на 2 секунды', 'Salpica la pantalla con insectos. El rival debe mantener pulsado el limpiacristales 2 segundos', '🪰', 30, false, 'root', 'exploit', 'opponent')
ON CONFLICT (type) DO UPDATE SET name_ru=EXCLUDED.name_ru, name_es=EXCLUDED.name_es, description_ru=EXCLUDED.description_ru, description_es=EXCLUDED.description_es, icon=EXCLUDED.icon, cost_coins=EXCLUDED.cost_coins, is_premium=EXCLUDED.is_premium, mode=EXCLUDED.mode, category=EXCLUDED.category, target_type=EXCLUDED.target_type;

-- 🌫️ Туман
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium, mode, category, target_type)
VALUES ('fog_screen', 'Туман', 'Niebla', 'Затуманивает экран. Сопернику нужно протирать стекло пальцем, чтобы читать вопрос', 'Empaña la pantalla. El rival debe limpiar con el dedo para leer la pregunta', '🌫️', 30, false, 'root', 'exploit', 'opponent')
ON CONFLICT (type) DO UPDATE SET name_ru=EXCLUDED.name_ru, name_es=EXCLUDED.name_es, description_ru=EXCLUDED.description_ru, description_es=EXCLUDED.description_es, icon=EXCLUDED.icon, cost_coins=EXCLUDED.cost_coins, is_premium=EXCLUDED.is_premium, mode=EXCLUDED.mode, category=EXCLUDED.category, target_type=EXCLUDED.target_type;

-- 2. UPDATE use_boost_attack RPC — add new WHEN clauses
CREATE OR REPLACE FUNCTION public.use_boost_attack(
  p_duel_id uuid,
  p_boost_type text,
  p_duel_question_id uuid DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_profile_id uuid DEFAULT NULL
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
  v_question_data jsonb;
  v_correct_ids text[];
  v_all_options jsonb;
  v_incorrect_options text[];
  v_to_hide text[];
  v_question_snapshot jsonb;
  v_hint text;
  v_verify_count integer;
  v_auth_uid uuid;
  v_telegram_id bigint;
BEGIN
  v_auth_uid := auth.uid();
  BEGIN
    v_telegram_id := (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    v_telegram_id := NULL;
  END;

  -- ШАГ 0: Если передан явный p_profile_id
  IF p_profile_id IS NOT NULL THEN
    SELECT id INTO v_attacker_player_id FROM duel_players
    WHERE duel_id = p_duel_id AND user_id = p_profile_id AND is_bot = false LIMIT 1;
    IF v_attacker_player_id IS NOT NULL THEN v_profile_id := p_profile_id; END IF;
  END IF;

  -- ШАГ 1: Fallback поиск по auth.uid
  IF v_attacker_player_id IS NULL AND v_auth_uid IS NOT NULL THEN
    SELECT dp.id INTO v_attacker_player_id FROM duel_players dp
    INNER JOIN profiles p ON dp.user_id = p.id
    WHERE dp.duel_id = p_duel_id AND dp.is_bot = false AND p.user_id = v_auth_uid LIMIT 1;
    IF v_attacker_player_id IS NOT NULL THEN
      SELECT dp.user_id INTO v_profile_id FROM duel_players dp WHERE dp.id = v_attacker_player_id;
    END IF;
  END IF;

  -- Fallback по telegram_id
  IF v_attacker_player_id IS NULL AND v_telegram_id IS NOT NULL THEN
    SELECT dp.id INTO v_attacker_player_id FROM duel_players dp
    INNER JOIN profiles p ON dp.user_id = p.id
    WHERE dp.duel_id = p_duel_id AND dp.is_bot = false AND p.telegram_id = v_telegram_id LIMIT 1;
    IF v_attacker_player_id IS NOT NULL THEN
      SELECT dp.user_id INTO v_profile_id FROM duel_players dp WHERE dp.id = v_attacker_player_id;
    END IF;
  END IF;

  IF v_attacker_player_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Attacker not found in this duel');
  END IF;

  -- ШАГ 2: Проверка и списание буста
  IF v_profile_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM boost_inventory WHERE user_id = v_profile_id AND boost_type = p_boost_type AND quantity > 0) INTO v_has_boost;
    IF NOT v_has_boost THEN
      RETURN json_build_object('success', false, 'error', 'Boost not available');
    END IF;
    PERFORM modify_boost_inventory(v_profile_id, p_boost_type, -1);
  ELSE
    v_has_boost := true;
  END IF;

  -- ШАГ 3: Запись использования
  INSERT INTO duel_boosts_used (duel_id, player_id, boost_type, duel_question_id)
  VALUES (p_duel_id, v_attacker_player_id, p_boost_type, p_duel_question_id);

  -- ШАГ 4: Эффект буста
  v_activated_at := NOW();

  CASE p_boost_type
    -- === ROOT MODE EXPLOITS ===
    WHEN 'screen_injector', 'oil_spill', 'data_leak' THEN
      v_duration_ms := 45000;
      v_boost_effect := jsonb_build_object('success', true, 'popup_count', 3, 'duration_ms', v_duration_ms);
    WHEN 'input_lag' THEN
      v_duration_ms := 5000;
      v_boost_effect := jsonb_build_object('success', true, 'delay_ms', 1500, 'duration_ms', v_duration_ms);
    WHEN 'gps_spoofing' THEN
      v_duration_ms := 10000;
      v_boost_effect := jsonb_build_object('success', true, 'shuffle_duration_ms', 1000);
    WHEN 'police_backdoor' THEN
      v_duration_ms := 8000;
      v_boost_effect := jsonb_build_object('success', true, 'block_duration_ms', 8000, 'captcha_required', true);
    WHEN 'firewall' THEN
      v_duration_ms := 30000;
      v_boost_effect := jsonb_build_object('success', true, 'active', true, 'duration_ms', v_duration_ms);
    WHEN 'cryptolocker' THEN
      v_duration_ms := 30000;
      v_boost_effect := jsonb_build_object('success', true, 'encrypted', true, 'duration_ms', v_duration_ms);

    -- === NEW WEATHER ATTACKS ===
    WHEN 'ice_screen' THEN
      v_duration_ms := 30000;
      v_boost_effect := jsonb_build_object('success', true, 'grid_cells', 9, 'duration_ms', v_duration_ms);
    WHEN 'sun_glare' THEN
      v_duration_ms := 20000;
      v_boost_effect := jsonb_build_object('success', true, 'visor_required', true, 'duration_ms', v_duration_ms);
    WHEN 'rain_storm' THEN
      v_duration_ms := 15000;
      v_boost_effect := jsonb_build_object('success', true, 'swipes_required', 8, 'duration_ms', v_duration_ms);
    WHEN 'bug_splat' THEN
      v_duration_ms := 25000;
      v_boost_effect := jsonb_build_object('success', true, 'hold_duration_ms', 2000, 'duration_ms', v_duration_ms);
    WHEN 'fog_screen' THEN
      v_duration_ms := 20000;
      v_boost_effect := jsonb_build_object('success', true, 'clear_threshold', 60, 'duration_ms', v_duration_ms);

    -- === SAFE MODE ===
    WHEN 'fifty_fifty' THEN
      IF p_duel_question_id IS NOT NULL THEN
        SELECT question_snapshot, correct_option_ids INTO v_question_data, v_correct_ids FROM duel_questions WHERE id = p_duel_question_id;
        IF v_question_data IS NOT NULL THEN
          v_all_options := v_question_data->'answer_options';
          SELECT array_agg((opt->>'id')::text) INTO v_incorrect_options FROM jsonb_array_elements(v_all_options) opt WHERE NOT (opt->>'id' = ANY(v_correct_ids));
          v_to_hide := array(SELECT unnest(v_incorrect_options) LIMIT 2);
          v_boost_effect := jsonb_build_object('success', true, 'hidden_options', to_jsonb(v_to_hide));
        ELSE v_boost_effect := jsonb_build_object('success', true);
        END IF;
      ELSE v_boost_effect := jsonb_build_object('success', true);
      END IF;
    WHEN 'time_extend' THEN
      v_boost_effect := jsonb_build_object('success', true, 'time_added_ms', 30000);
    WHEN 'hint' THEN
      IF p_duel_question_id IS NOT NULL THEN
        SELECT question_snapshot INTO v_question_snapshot FROM duel_questions WHERE id = p_duel_question_id;
        IF v_question_snapshot IS NOT NULL THEN
          v_hint := COALESCE(v_question_snapshot->>'explanation_ru', v_question_snapshot->>'explanation_es', v_question_snapshot->>'explanation_en', 'Подсказка недоступна');
          v_boost_effect := jsonb_build_object('success', true, 'hint', v_hint);
        ELSE v_boost_effect := jsonb_build_object('success', true);
        END IF;
      ELSE v_boost_effect := jsonb_build_object('success', true);
      END IF;
    WHEN 'skip' THEN
      v_boost_effect := jsonb_build_object('success', true, 'skip_confirmed', true);
    WHEN 'translate' THEN
      v_boost_effect := jsonb_build_object('success', true, 'translate_applied', true, 'language', COALESCE(p_language, 'ru'));
    WHEN 'rewind' THEN
      v_boost_effect := jsonb_build_object('success', true, 'rewind_confirmed', true);
    ELSE
      v_boost_effect := jsonb_build_object('success', true);
  END CASE;

  -- ШАГ 5: Создание exploit (Root Mode)
  IF v_duration_ms IS NOT NULL THEN
    SELECT id INTO v_target_player_id FROM duel_players
    WHERE duel_id = p_duel_id AND id != v_attacker_player_id AND is_bot = false LIMIT 1;
    IF v_target_player_id IS NULL THEN
      SELECT id INTO v_target_player_id FROM duel_players
      WHERE duel_id = p_duel_id AND id != v_attacker_player_id AND is_bot = true LIMIT 1;
    END IF;
    IF v_target_player_id IS NULL THEN RAISE EXCEPTION 'Opponent not found in this duel'; END IF;

    v_expires_at := v_activated_at + (v_duration_ms || ' milliseconds')::interval;

    INSERT INTO duel_active_exploits (duel_id, exploit_type, attacker_player_id, target_player_id, effect_data, activated_at, expires_at, is_active)
    VALUES (p_duel_id, p_boost_type, v_attacker_player_id, v_target_player_id, v_boost_effect, v_activated_at, v_expires_at, true)
    RETURNING id INTO v_exploit_id;

    RETURN json_build_object('success', true, 'boost_effect', v_boost_effect, 'exploit_id', v_exploit_id, 'target_player_id', v_target_player_id, 'attacker_player_id', v_attacker_player_id, 'expires_at', v_expires_at);
  ELSE
    RETURN json_build_object('success', true, 'boost_effect', v_boost_effect);
  END IF;
END;
$$;
