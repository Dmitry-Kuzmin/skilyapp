-- ======================================
-- ОПТИМИЗАЦИЯ: Единый RPC для Dashboard
-- ======================================
-- Вместо 50+ запросов делаем 1 запрос
-- Возвращает ВСЕ данные для дашборда

CREATE OR REPLACE FUNCTION get_dashboard_complete(p_user_id UUID)
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
  v_result JSON;
BEGIN
  -- 1. Профиль пользователя (основные данные)
  SELECT 
    id, 
    rank, 
    xp, 
    coins, 
    boosts, 
    streak_days,
    settings
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

  -- Если нет записи о бонусах, создаем дефолтную
  IF v_daily_bonus.id IS NULL THEN
    v_daily_bonus := ROW(NULL, 0, NULL, 0, true);
  END IF;

  -- 5. Собираем результат в один JSON
  SELECT json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'rank', COALESCE(v_profile.rank, 'Ученик'),
      'xp', COALESCE(v_profile.xp, 0),
      'coins', COALESCE(v_profile.coins, 0),
      'boosts', COALESCE(v_profile.boosts, 0),
      'streak_days', COALESCE(v_profile.streak_days, 0),
      'settings', COALESCE(v_profile.settings, '{}'::jsonb)
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
    -- Дополнительные данные загружаем легковесно
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
        'unlocked_at', a.unlocked_at,
        'created_at', a.created_at
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
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION get_dashboard_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_complete(UUID) TO anon;

COMMENT ON FUNCTION get_dashboard_complete IS 
'Оптимизированная функция для загрузки всех данных дашборда одним запросом. 
Возвращает профиль, статистику, готовность, дейли бонус, задания, достижения и награды.
Заменяет 50+ отдельных запросов на 1 запрос.';

-- ======================================
-- ОПТИМИЗАЦИЯ: Batch загрузка прогресса по всем темам
-- ======================================
-- Вместо N запросов (по одному на каждую тему) делаем 1 запрос

CREATE OR REPLACE FUNCTION get_all_topics_progress(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Получаем прогресс по всем темам одним запросом
  WITH 
    all_topics AS (
      SELECT 
        t.id as topic_id,
        t.number,
        t.title_ru,
        t.title_es,
        t.order_index,
        t.unlock_condition
      FROM topics t
      ORDER BY t.order_index
    ),
    topic_subtopics AS (
      SELECT 
        st.topic_id,
        COUNT(*) as total_subtopics,
        COUNT(*) FILTER (WHERE st.is_required = true) as required_subtopics
      FROM subtopics st
      GROUP BY st.topic_id
    ),
    user_subtopic_progress AS (
      SELECT 
        utp.topic_id,
        COUNT(*) as completed_subtopics,
        COUNT(*) FILTER (WHERE s.is_required = true) as completed_required
      FROM user_topic_progress utp
      INNER JOIN subtopics s ON s.id = utp.subtopic_id
      WHERE utp.user_id = p_user_id AND utp.completed = true
      GROUP BY utp.topic_id
    ),
    topic_questions AS (
      SELECT 
        qn.topic_id,
        COUNT(DISTINCT qn.id) as total_questions,
        COUNT(DISTINCT CASE WHEN up.is_correct = true THEN qn.id END) as correct_questions,
        COUNT(DISTINCT CASE WHEN up.is_answered = true THEN qn.id END) as answered_questions
      FROM questions_new qn
      LEFT JOIN user_progress up ON up.question_id = qn.id AND up.user_id = p_user_id
      GROUP BY qn.topic_id
    )
  SELECT json_agg(json_build_object(
    'topic_id', at.topic_id,
    'number', at.number,
    'title_ru', at.title_ru,
    'title_es', at.title_es,
    'order_index', at.order_index,
    'unlock_condition', at.unlock_condition,
    'total_subtopics', COALESCE(ts.total_subtopics, 0),
    'required_subtopics', COALESCE(ts.required_subtopics, 0),
    'completed_subtopics', COALESCE(usp.completed_subtopics, 0),
    'completed_required', COALESCE(usp.completed_required, 0),
    'is_completed', COALESCE(usp.completed_required, 0) >= COALESCE(ts.required_subtopics, 1),
    'total_questions', COALESCE(tq.total_questions, 0),
    'answered_questions', COALESCE(tq.answered_questions, 0),
    'correct_questions', COALESCE(tq.correct_questions, 0),
    'accuracy', CASE 
      WHEN COALESCE(tq.answered_questions, 0) > 0 
      THEN ROUND((COALESCE(tq.correct_questions, 0)::NUMERIC / tq.answered_questions) * 100, 1)
      ELSE 0 
    END
  ) ORDER BY at.order_index)
  INTO v_result
  FROM all_topics at
  LEFT JOIN topic_subtopics ts ON ts.topic_id = at.topic_id
  LEFT JOIN user_subtopic_progress usp ON usp.topic_id = at.topic_id
  LEFT JOIN topic_questions tq ON tq.topic_id = at.topic_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION get_all_topics_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_topics_progress(UUID) TO anon;

COMMENT ON FUNCTION get_all_topics_progress IS 
'Оптимизированная функция для загрузки прогресса по всем темам одним запросом.
Возвращает полную информацию о каждой теме: подтемы, вопросы, прогресс.
Заменяет N*3 отдельных запросов на 1 запрос.';

-- ======================================
-- ИНДЕКСЫ для оптимизации
-- ======================================

-- Индекс для быстрого поиска бонусов пользователя
CREATE INDEX IF NOT EXISTS idx_user_daily_bonus_user_id 
ON user_daily_bonus(user_id);

-- Индекс для быстрого поиска прогресса пользователя
CREATE INDEX IF NOT EXISTS idx_user_progress_user_answered 
ON user_progress(user_id, is_answered) 
WHERE is_answered = true;

-- Индекс для быстрого поиска сессий тестов
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_type 
ON game_sessions(user_id, game_type, created_at DESC)
WHERE game_type IN ('test_exam', 'test_practice');

-- Индекс для быстрого поиска дейли тасков
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date 
ON daily_tasks(user_id, date);

-- Индекс для быстрого поиска достижений
CREATE INDEX IF NOT EXISTS idx_achievements_user_created 
ON achievements(user_id, created_at DESC);

-- Индекс для topic_id в questions_new для быстрых джоинов
CREATE INDEX IF NOT EXISTS idx_questions_new_topic_id 
ON questions_new(topic_id);

-- Индекс для subtopics для быстрого подсчета
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_required 
ON subtopics(topic_id, is_required);

