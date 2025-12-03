-- ======================================
-- SUPER RPC v2.0 - ПРИМЕНИТЬ В SUPABASE
-- ======================================
-- Скопируй этот файл и выполни в Supabase Dashboard
-- SQL Editor → New Query → Paste → Run

-- ======================================
-- SUPER RPC: Абсолютно ВСЁ для Dashboard в 1 запросе
-- ======================================

CREATE OR REPLACE FUNCTION get_dashboard_super(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_stats RECORD;
  v_readiness RECORD;
  v_daily_bonus RECORD;
  v_premium RECORD;
  v_partner RECORD;
  v_result JSON;
BEGIN
  -- 1. Профиль пользователя (расширенный)
  SELECT 
    id, 
    rank, 
    xp, 
    coins, 
    boosts, 
    streak_days,
    settings,
    subscription_status,
    subscription_expires_at,
    photo_url,
    first_name,
    last_name,
    username
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  -- 2. Статистика (тесты, вопросы, точность)
  WITH 
    sessions AS (
      SELECT 
        COUNT(*) as tests_count,
        COALESCE(SUM(total_questions), 0) as total_qs,
        COALESCE(SUM(score), 0) as correct_qs
      FROM game_sessions
      WHERE user_id = p_user_id
        AND game_type IN ('test_exam', 'test_practice')
    ),
    progress AS (
      SELECT 
        COUNT(*) FILTER (WHERE is_answered = true) as answered_count,
        COUNT(*) FILTER (WHERE is_answered = true AND is_correct = true) as correct_count
      FROM user_progress
      WHERE user_id = p_user_id
    ),
    recent_sessions AS (
      SELECT 
        COALESCE(AVG(CAST(score AS FLOAT) / NULLIF(total_questions, 0) * 100), 0) as recent_performance
      FROM (
        SELECT score, total_questions
        FROM game_sessions
        WHERE user_id = p_user_id
          AND game_type IN ('test_exam', 'test_practice')
        ORDER BY created_at DESC
        LIMIT 5
      ) recent
    )
  SELECT 
    s.tests_count,
    s.total_qs + COALESCE(p.answered_count, 0) as total_questions,
    s.correct_qs + COALESCE(p.correct_count, 0) as correct_answers,
    CASE 
      WHEN (s.total_qs + COALESCE(p.answered_count, 0)) > 0 
      THEN ROUND((s.correct_qs + COALESCE(p.correct_count, 0))::NUMERIC / (s.total_qs + COALESCE(p.answered_count, 0)) * 100, 1)
      ELSE 0 
    END as accuracy,
    COALESCE(rs.recent_performance, 0) as recent_performance
  INTO v_stats
  FROM sessions s
  CROSS JOIN progress p
  CROSS JOIN recent_sessions rs;

  -- 3. Готовность к экзамену
  WITH 
    topic_progress AS (
      SELECT 
        COUNT(DISTINCT t.id) as total_topics,
        COUNT(DISTINCT CASE WHEN utp.completed = true THEN t.id END) as completed_topics
      FROM topics t
      LEFT JOIN user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = p_user_id
    ),
    question_stats AS (
      SELECT 
        COUNT(DISTINCT up.question_id) as unique_questions,
        COUNT(DISTINCT qn.topic_id) as topics_with_answers
      FROM user_progress up
      INNER JOIN questions_new qn ON qn.id = up.question_id
      WHERE up.user_id = p_user_id AND up.is_answered = true
    )
  SELECT 
    CASE 
      WHEN tp.total_topics > 0 
      THEN ROUND((tp.completed_topics::NUMERIC / tp.total_topics) * 100, 1)
      ELSE 0 
    END as topics_covered_percent,
    COALESCE(qs.unique_questions, 0) as unique_questions_answered,
    COALESCE(qs.topics_with_answers, 0) as topics_with_answers
  INTO v_readiness
  FROM topic_progress tp
  CROSS JOIN question_stats qs;

  -- 4. Ежедневный бонус
  SELECT 
    udb.id,
    COALESCE(udb.current_streak, 0) as current_streak,
    udb.last_claimed_date,
    COALESCE(udb.total_claims, 0) as total_claims,
    CASE 
      WHEN udb.last_claimed_date IS NULL THEN true
      WHEN udb.last_claimed_date < CURRENT_DATE THEN true
      ELSE false
    END as can_claim
  INTO v_daily_bonus
  FROM user_daily_bonus udb
  WHERE udb.user_id = p_user_id
  LIMIT 1;

  IF v_daily_bonus.id IS NULL THEN
    v_daily_bonus := ROW(NULL, 0, NULL, 0, true);
  END IF;

  -- 5. НОВОЕ: Premium статус (убираем Edge Function)
  SELECT 
    subscription_status,
    subscription_expires_at,
    CASE 
      WHEN subscription_status = 'active' AND subscription_expires_at > NOW() THEN true
      WHEN subscription_status = 'trial' AND subscription_expires_at > NOW() THEN true
      ELSE false
    END as is_premium,
    CASE 
      WHEN subscription_status = 'trial' THEN 
        GREATEST(0, EXTRACT(DAY FROM (subscription_expires_at - NOW()))::INTEGER)
      ELSE NULL
    END as trial_days_remaining
  INTO v_premium
  FROM profiles
  WHERE id = p_user_id;

  -- 6. НОВОЕ: Partner статус
  SELECT 
    p.id,
    p.partner_code,
    p.name,
    p.status,
    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as is_partner
  INTO v_partner
  FROM partners p
  WHERE p.user_id = p_user_id
  LIMIT 1;

  -- 7. Собираем результат в один SUPER JSON
  SELECT json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'rank', COALESCE(v_profile.rank, 'Ученик'),
      'xp', COALESCE(v_profile.xp, 0),
      'coins', COALESCE(v_profile.coins, 0),
      'boosts', COALESCE(v_profile.boosts, 0),
      'streak_days', COALESCE(v_profile.streak_days, 0),
      'settings', COALESCE(v_profile.settings, '{}'::jsonb),
      'photo_url', v_profile.photo_url,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'username', v_profile.username
    ),
    'stats', json_build_object(
      'tests_completed', COALESCE(v_stats.tests_count, 0),
      'total_questions', COALESCE(v_stats.total_questions, 0),
      'correct_answers', COALESCE(v_stats.correct_answers, 0),
      'accuracy', COALESCE(v_stats.accuracy, 0),
      'recent_performance', COALESCE(v_stats.recent_performance, 0)
    ),
    'readiness', json_build_object(
      'topics_covered_percent', COALESCE(v_readiness.topics_covered_percent, 0),
      'unique_questions_answered', COALESCE(v_readiness.unique_questions_answered, 0),
      'topics_with_answers', COALESCE(v_readiness.topics_with_answers, 0)
    ),
    'daily_bonus', json_build_object(
      'id', v_daily_bonus.id,
      'current_streak', v_daily_bonus.current_streak,
      'last_claimed_date', v_daily_bonus.last_claimed_date,
      'total_claims', v_daily_bonus.total_claims,
      'can_claim', v_daily_bonus.can_claim
    ),
    'premium', json_build_object(
      'is_premium', COALESCE(v_premium.is_premium, false),
      'subscription_status', v_premium.subscription_status,
      'subscription_expires_at', v_premium.subscription_expires_at,
      'trial_days_remaining', v_premium.trial_days_remaining
    ),
    'partner', json_build_object(
      'is_partner', COALESCE(v_partner.is_partner, false),
      'partner_id', v_partner.id,
      'partner_code', v_partner.partner_code,
      'partner_name', v_partner.name,
      'partner_status', v_partner.status
    ),
    'daily_tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', dt.id,
        'task_type', dt.task_type,
        'title', dt.title,
        'progress', dt.progress,
        'max_progress', dt.max_progress,
        'reward', dt.reward,
        'completed', dt.completed,
        'date', dt.date
      )), '[]'::json)
      FROM daily_tasks dt
      WHERE dt.user_id = p_user_id AND dt.date = CURRENT_DATE
    ),
    'recent_achievements', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', a.id,
        'achievement_type', a.achievement_type,
        'title', a.title,
        'description', a.description,
        'unlocked', a.unlocked,
        'progress', a.progress,
        'max_progress', a.max_progress,
        'unlocked_at', a.unlocked_at
      ) ORDER BY a.created_at DESC), '[]'::json)
      FROM (
        SELECT * FROM achievements
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 4
      ) a
    ),
    'weekly_rewards', (
      SELECT COALESCE(json_agg(json_build_object(
        'day_number', dbd.day_number,
        'reward', dbd.reward,
        'description', dbd.description
      ) ORDER BY dbd.day_number), '[]'::json)
      FROM daily_bonus_def dbd
      WHERE dbd.day_number <= 7
    ),
    'topics', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id,
        'number', t.number,
        'title_ru', t.title_ru,
        'title_es', t.title_es,
        'order_index', t.order_index
      ) ORDER BY t.order_index), '[]'::json)
      FROM topics t
    ),
    'daily_bonus_definitions', (
      SELECT COALESCE(json_agg(json_build_object(
        'day_number', dbd.day_number,
        'reward', dbd.reward,
        'description', dbd.description
      ) ORDER BY dbd.day_number), '[]'::json)
      FROM daily_bonus_def dbd
      LIMIT 7
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO anon;

COMMENT ON FUNCTION get_dashboard_super IS 
'SUPER RPC v2.0 - Возвращает АБСОЛЮТНО ВСЁ для Dashboard в 1 запросе:
- Profile (полный с аватаром)
- Stats (тесты, точность)
- Readiness (готовность к экзамену)
- Daily Bonus (текущий стрик)
- Premium Status (без Edge Function!)
- Partner Status (без отдельного запроса!)
- Topics (список тем)
- Daily Bonus Definitions (награды по дням)
- Daily Tasks (задания на сегодня)
- Recent Achievements (последние достижения)

Заменяет 18 запросов на 1! 🚀';

-- ======================================
-- ИНДЕКСЫ для ускорения Super RPC
-- ======================================

-- Индекс для быстрого поиска партнера по user_id
CREATE INDEX IF NOT EXISTS idx_partners_user_id 
ON partners(user_id, status);

-- Индекс для быстрого поиска daily tasks
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date 
ON daily_tasks(user_id, date DESC);

-- Индекс для быстрого поиска achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_created 
ON achievements(user_id, unlocked, created_at DESC);

-- Индекс для game_sessions с фильтром по типу
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_type 
ON game_sessions(user_id, game_type, created_at DESC);

-- ======================================
-- ПРОВЕРКА РАБОТЫ
-- ======================================

-- Замени YOUR_USER_ID на свой UUID из profiles и раскомментируй:
-- SELECT get_dashboard_super('YOUR_USER_ID'::UUID);

-- Или используй свой user_id напрямую (пример):
-- SELECT get_dashboard_super('560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID);

-- Если работает, увидишь JSON со всеми данными!
-- Если ошибка - проверь, что все таблицы существуют

-- ======================================
-- ROLLBACK (если что-то пошло не так)
-- ======================================

-- DROP FUNCTION IF EXISTS get_dashboard_super(UUID);
-- DROP INDEX IF EXISTS idx_partners_user_id;
-- DROP INDEX IF EXISTS idx_daily_tasks_user_date;
-- DROP INDEX IF EXISTS idx_achievements_user_created;
-- DROP INDEX IF EXISTS idx_game_sessions_user_type;

