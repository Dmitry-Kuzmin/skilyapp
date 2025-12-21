-- ======================================
-- ROCK SOLID DUEL PAYOUT & DASHBOARD
-- ======================================

-- 1. Обеспечиваем наличие колонок для триггера
ALTER TABLE public.duels 
ADD COLUMN IF NOT EXISTS is_draw BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Фикс 404 ошибки: Пересоздаем get_dashboard_super
-- Мы сохраняем расширенную версию, так как фронтенд ее ожидает
CREATE OR REPLACE FUNCTION get_dashboard_super(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_stats RECORD;
  v_readiness RECORD;
  v_daily_bonus RECORD;
  v_premium RECORD;
  v_partner RECORD;
  v_active_season RECORD;
  v_season_progress RECORD;
  v_result JSON;
BEGIN
  -- Если p_user_id не передан, используем текущего авторизованного
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Unauthenticated');
  END IF;

  -- 1. Профиль пользователя
  SELECT 
    id, rank, xp, coins, boosts, streak_days, settings,
    subscription_status, subscription_expires_at, photo_url,
    first_name, last_name, username
  INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  -- 2. Статистика
  SELECT 
    COUNT(*)::INTEGER as tests_completed,
    COALESCE(SUM(total_questions), 0)::INTEGER as total_questions,
    COALESCE(SUM(score), 0)::INTEGER as correct_answers
  INTO v_stats 
  FROM game_sessions
  WHERE user_id = v_user_id AND game_type IN ('test_exam', 'test_practice');

  -- 3. Готовность (упрощенно для производительности)
  SELECT 
    ROUND((COUNT(DISTINCT tp.topic_id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM topics), 1)) * 100, 1)::NUMERIC as topics_covered_percent,
    COUNT(DISTINCT up.question_id)::INTEGER as unique_questions_answered,
    COUNT(DISTINCT tp.topic_id)::INTEGER as topics_with_answers
  INTO v_readiness
  FROM topic_progress tp
  LEFT JOIN user_progress up ON up.user_id = v_user_id AND up.is_answered = true
  WHERE tp.user_id = v_user_id;

  -- 4. Ежедневный бонус
  SELECT 
    id, current_streak, last_claimed_date, total_claims,
    (last_claimed_date IS NULL OR last_claimed_date < CURRENT_DATE) as can_claim
  INTO v_daily_bonus
  FROM user_daily_bonus
  WHERE user_id = v_user_id;

  -- 5. Статус сезона (Активный)
  SELECT 
    id, season_number, name_ru, name_es, name_en, theme, start_date, end_date,
    GREATEST(0, EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as days_remaining
  INTO v_active_season
  FROM duel_pass_seasons
  WHERE is_active = true AND start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP
  ORDER BY season_number DESC LIMIT 1;

  -- 6. Прогресс сезона
  IF v_active_season.id IS NOT NULL THEN
    SELECT * INTO v_season_progress FROM user_season_progress 
    WHERE user_id = v_user_id AND season_id = v_active_season.id LIMIT 1;
  END IF;

  -- Формируем результат
  v_result := json_build_object(
    'profile', json_build_object(
      'id', v_profile.id, 'rank', COALESCE(v_profile.rank, 'Ученик'),
      'xp', v_profile.xp, 'coins', v_profile.coins, 'boosts', v_profile.boosts,
      'streak_days', v_profile.streak_days, 'photo_url', v_profile.photo_url,
      'first_name', v_profile.first_name, 'username', v_profile.username
    ),
    'stats', json_build_object(
      'tests_completed', COALESCE(v_stats.tests_completed, 0),
      'total_questions', COALESCE(v_stats.total_questions, 0),
      'correct_answers', COALESCE(v_stats.correct_answers, 0),
      'accuracy', CASE WHEN v_stats.total_questions > 0 THEN 
          ROUND((v_stats.correct_answers::NUMERIC / v_stats.total_questions) * 100, 1) ELSE 0 END
    ),
    'readiness', json_build_object(
      'topics_covered_percent', COALESCE(v_readiness.topics_covered_percent, 0),
      'unique_questions_answered', COALESCE(v_readiness.unique_questions_answered, 0),
      'topics_with_answers', COALESCE(v_readiness.topics_with_answers, 0)
    ),
    'daily_bonus', json_build_object(
      'id', v_daily_bonus.id, 'current_streak', COALESCE(v_daily_bonus.current_streak, 0),
      'last_claimed_date', v_daily_bonus.last_claimed_date, 'can_claim', COALESCE(v_daily_bonus.can_claim, true)
    ),
    'active_season', CASE WHEN v_active_season.id IS NOT NULL THEN row_to_json(v_active_season) ELSE NULL END,
    'season_progress', CASE WHEN v_season_progress.id IS NOT NULL THEN row_to_json(v_season_progress) ELSE NULL END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_super TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_super TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_super TO service_role;

-- 3. ТАБЛИЦА ЛОГОВ ТРАНЗАКЦИЙ (если нет)
CREATE TABLE IF NOT EXISTS public.duel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(duel_id, user_id, transaction_type)
);

-- 4. ГАРАНТИРОВАННОЕ НАЧИСЛЕНИЕ (ТРИГГЕР)
CREATE OR REPLACE FUNCTION handle_duel_payout_atomic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_reward INT;
  v_draw_reward INT := 10;
  v_win_reward INT := 20;
  v_winner_xp INT := 50;
  v_loser_id UUID;
  v_winner_xp_val INT;
  v_loser_xp_val INT;
  v_current_streak INT;
BEGIN
  -- Только когда статус меняется на 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
    
    -- А) НИЧЬЯ
    IF NEW.is_draw THEN
      -- Возвращаем ставку обоим (если есть)
      IF NEW.bet_amount > 0 THEN
        -- Пытаемся зачислить, UNIQUE constraint в duel_transactions защитит от двойного начисления
        BEGIN
          INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
          SELECT NEW.id, user_id, NEW.bet_amount, 'refund'
          FROM duel_players WHERE duel_id = NEW.id AND is_bot = false;
          
          UPDATE profiles p SET coins = p.coins + NEW.bet_amount
          FROM duel_players dp WHERE dp.duel_id = NEW.id AND dp.user_id = p.id AND dp.is_bot = false;
        EXCEPTION WHEN unique_violation THEN NULL; END;
      ELSE
        -- Даем по 10 монет за бесплатную ничью
        BEGIN
          INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
          SELECT NEW.id, dp.user_id, v_draw_reward, 'win_base'
          FROM duel_players dp WHERE dp.duel_id = NEW.id AND dp.is_bot = false;
          
          UPDATE profiles p SET coins = p.coins + v_draw_reward
          FROM duel_players dp WHERE dp.duel_id = NEW.id AND dp.user_id = p.id AND dp.is_bot = false;
        EXCEPTION WHEN unique_violation THEN NULL; END;
      END IF;
      
    -- Б) ПОБЕДА (Winner ID должен быть установлен)
    ELSIF NEW.winner_id IS NOT NULL THEN
      -- Рассчитываем основной приз
      v_winner_reward := CASE WHEN NEW.bet_amount > 0 THEN NEW.bet_amount * 2 ELSE v_win_reward END;
      
      -- 1. Основной приз + XP
      BEGIN
        INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
        VALUES (NEW.id, NEW.winner_id, v_winner_reward, 'win_base');
        
        UPDATE profiles SET coins = coins + v_winner_reward, xp = xp + v_winner_xp WHERE id = NEW.winner_id;
      EXCEPTION WHEN unique_violation THEN NULL; END;
      
      -- 2. Бонус за серию (Streak)
      SELECT current_streak INTO v_current_streak FROM duel_stats WHERE user_id = NEW.winner_id;
      IF v_current_streak >= 3 THEN
        BEGIN
          INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
          VALUES (NEW.id, NEW.winner_id, 15, 'bonus_streak');
          UPDATE profiles SET coins = coins + 15 WHERE id = NEW.winner_id;
        EXCEPTION WHEN unique_violation THEN NULL; END;
      END IF;
      
      -- 3. Бонус underdog
      SELECT user_id INTO v_loser_id FROM duel_players WHERE duel_id = NEW.id AND user_id != NEW.winner_id LIMIT 1;
      IF v_loser_id IS NOT NULL THEN
        SELECT xp INTO v_winner_xp_val FROM profiles WHERE id = NEW.winner_id;
        SELECT xp INTO v_loser_xp_val FROM profiles WHERE id = v_loser_id;
        IF v_loser_xp_val > (v_winner_xp_val + 500) THEN
          BEGIN
            INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
            VALUES (NEW.id, NEW.winner_id, 10, 'bonus_underdog');
            UPDATE profiles SET coins = coins + 10 WHERE id = NEW.winner_id;
          EXCEPTION WHEN unique_violation THEN NULL; END;
        END IF;
      END IF;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_duel_finished_payout ON duels;
CREATE TRIGGER on_duel_finished_payout
AFTER UPDATE ON duels
FOR EACH ROW
EXECUTE FUNCTION handle_duel_payout_atomic();
