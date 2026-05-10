-- =====================================================
-- Cosmetic unlock — функции прогресса и автоматической выдачи
-- =====================================================

-- Внутренний предикат: считает текущий прогресс одного правила.
-- Возвращает (current, required, satisfied).
-- ВАЖНО: SECURITY DEFINER, чтобы фронт мог вызывать без RLS-головной боли.
CREATE OR REPLACE FUNCTION public.check_unlock_rule(
  p_user_id uuid,
  p_rule_type text,
  p_rule_params jsonb
)
RETURNS TABLE (current_value integer, required_value integer, satisfied boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required integer := COALESCE((p_rule_params->>'count')::int, 1);
  v_current  integer := 0;
  v_min_duels int;
  v_max_ms int;
  v_avg numeric;
BEGIN
  IF p_rule_type = 'wins_total' THEN
    SELECT COALESCE(wins, 0) INTO v_current FROM public.duel_stats WHERE user_id = p_user_id;
    v_current := COALESCE(v_current, 0);

  ELSIF p_rule_type = 'streak_wins' THEN
    SELECT COALESCE(current_streak, 0) INTO v_current FROM public.duel_stats WHERE user_id = p_user_id;
    v_current := COALESCE(v_current, 0);

  ELSIF p_rule_type = 'first_duel_win' THEN
    SELECT CASE WHEN COALESCE(wins, 0) >= 1 THEN 1 ELSE 0 END INTO v_current
      FROM public.duel_stats WHERE user_id = p_user_id;
    v_current := COALESCE(v_current, 0);
    v_required := 1;

  ELSIF p_rule_type = 'perfect_quiz' THEN
    SELECT COUNT(*)::int INTO v_current
      FROM public.duel_players dp
      JOIN public.duels d ON d.id = dp.duel_id
     WHERE dp.user_id = p_user_id
       AND d.status = 'finished'
       AND dp.correct_count = d.num_questions
       AND dp.is_bot = false;

  ELSIF p_rule_type = 'speed_avg' THEN
    v_min_duels := COALESCE((p_rule_params->>'min_duels')::int, 5);
    v_max_ms    := COALESCE((p_rule_params->>'max_ms')::int, 3000);
    WITH recent AS (
      SELECT da.time_taken_ms
        FROM public.duel_answers da
        JOIN public.duel_players dp ON dp.id = da.player_id
        JOIN public.duels d ON d.id = da.duel_id
       WHERE dp.user_id = p_user_id
         AND d.status = 'finished'
       ORDER BY da.created_at DESC
       LIMIT v_min_duels * 10
    )
    SELECT AVG(time_taken_ms) INTO v_avg FROM recent;
    v_current  := COALESCE(v_avg, 999999)::int;
    v_required := v_max_ms;
    RETURN QUERY SELECT v_current, v_required, (v_avg IS NOT NULL AND v_avg <= v_max_ms);
    RETURN;

  ELSIF p_rule_type = 'is_premium' THEN
    SELECT CASE WHEN COALESCE(is_premium, false) OR COALESCE(premium_until, 'epoch'::timestamptz) > now() THEN 1 ELSE 0 END
      INTO v_current FROM public.profiles WHERE id = p_user_id;
    v_current := COALESCE(v_current, 0);
    v_required := 1;

  ELSIF p_rule_type = 'streak_days' THEN
    BEGIN
      EXECUTE 'SELECT COALESCE(current_streak, 0) FROM public.user_daily_bonus WHERE user_id = $1'
        INTO v_current USING p_user_id;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      v_current := 0;
    END;
    v_current := COALESCE(v_current, 0);

  ELSIF p_rule_type = 'season_rank_top' THEN
    v_current := 0;
    v_required := 1;

  ELSIF p_rule_type = 'coins_purchase' THEN
    v_current := 0;
    v_required := 1;

  ELSIF p_rule_type = 'manual' THEN
    v_current := 0;
    v_required := 0;

  ELSE
    v_current := 0;
    v_required := 1;
  END IF;

  RETURN QUERY SELECT v_current, v_required, (v_current >= v_required AND v_required > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_unlock_rule(uuid, text, jsonb) TO authenticated, anon, service_role;

-- =====================================================
-- Bulk-функция для фронта: возвращает прогресс по ВСЕМ закрытым предметам сразу.
-- Один RPC = один запрос с фронта.
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_unlock_progress(p_user_id uuid)
RETURNS TABLE (
  item_id text,
  item_type text,
  rule_type text,
  display_text_ru text,
  display_text_es text,
  current_value integer,
  required_value integer,
  satisfied boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.item_id,
    r.item_type,
    r.rule_type,
    r.display_text_ru,
    r.display_text_es,
    p.current_value,
    p.required_value,
    p.satisfied
  FROM public.cosmetic_unlock_rules r
  CROSS JOIN LATERAL public.check_unlock_rule(p_user_id, r.rule_type, r.rule_params) p
  WHERE r.is_active = true
  ORDER BY r.item_type, r.item_id, r.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_unlock_progress(uuid) TO authenticated, anon, service_role;

-- =====================================================
-- Выдача открытых предметов
-- Идемпотентно: если предмет уже в инвентаре — пропускаем.
-- Возвращает список выданных в этот вызов (для UI-анимации).
-- =====================================================
CREATE OR REPLACE FUNCTION public.grant_unlocked_cosmetics(p_user_id uuid)
RETURNS TABLE (item_id text, item_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_satisfied boolean;
BEGIN
  -- Бот = ничего не выдаём (если когда-нибудь функция вызовется с user_id бота)
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT item_id, item_type
      FROM public.cosmetic_unlock_rules
     WHERE is_active = true
       AND rule_type NOT IN ('manual', 'coins_purchase', 'season_rank_top')
  LOOP
    -- Проверяем уже выдано ли
    IF r.item_type = 'skin' THEN
      IF EXISTS (SELECT 1 FROM public.user_skins WHERE user_id = p_user_id AND skin_id = r.item_id) THEN
        CONTINUE;
      END IF;
    ELSIF r.item_type = 'badge' THEN
      IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = r.item_id) THEN
        CONTINUE;
      END IF;
    ELSIF r.item_type = 'sticker' THEN
      IF EXISTS (SELECT 1 FROM public.user_stickers WHERE user_id = p_user_id AND sticker_id = r.item_id) THEN
        CONTINUE;
      END IF;
    END IF;

    -- OR-логика: достаточно ОДНОГО выполненного правила
    SELECT bool_or(p.satisfied) INTO v_satisfied
      FROM public.cosmetic_unlock_rules cur
      CROSS JOIN LATERAL public.check_unlock_rule(p_user_id, cur.rule_type, cur.rule_params) p
     WHERE cur.item_id = r.item_id
       AND cur.item_type = r.item_type
       AND cur.is_active = true
       AND cur.rule_type NOT IN ('manual', 'coins_purchase', 'season_rank_top');

    IF COALESCE(v_satisfied, false) THEN
      IF r.item_type = 'skin' THEN
        INSERT INTO public.user_skins (user_id, skin_id, is_active, obtained_at, obtained_from)
          VALUES (p_user_id, r.item_id, false, now(), 'achievement')
          ON CONFLICT DO NOTHING;
      ELSIF r.item_type = 'badge' THEN
        INSERT INTO public.user_badges (user_id, badge_id, is_displayed, display_order, obtained_at)
          VALUES (p_user_id, r.item_id, false, 0, now())
          ON CONFLICT DO NOTHING;
      ELSIF r.item_type = 'sticker' THEN
        INSERT INTO public.user_stickers (user_id, sticker_id, quantity, obtained_at)
          VALUES (p_user_id, r.item_id, 1, now())
          ON CONFLICT DO NOTHING;
      END IF;

      RETURN QUERY SELECT r.item_id, r.item_type;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_unlocked_cosmetics(uuid) TO authenticated, anon, service_role;

-- =====================================================
-- Триггер: после завершения дуэли вызываем grant для всех живых игроков.
-- Не трогаем Edge Function duel-manager — всё происходит в БД.
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_grant_cosmetics_on_duel_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finished' AND COALESCE(OLD.status, '') <> 'finished' THEN
    PERFORM public.grant_unlocked_cosmetics(dp.user_id)
      FROM public.duel_players dp
     WHERE dp.duel_id = NEW.id
       AND dp.user_id IS NOT NULL
       AND dp.is_bot = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_cosmetics_on_duel_finish ON public.duels;
CREATE TRIGGER trg_grant_cosmetics_on_duel_finish
  AFTER UPDATE OF status ON public.duels
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_grant_cosmetics_on_duel_finish();

COMMENT ON FUNCTION public.grant_unlocked_cosmetics(uuid) IS 'Выдаёт пользователю все открытые косметики, которых у него нет. Идемпотентно. Используется триггером на завершение дуэли и может вызываться вручную из RPC.';
