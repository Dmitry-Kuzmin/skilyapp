-- ========================================
-- Migration: Optimize topic progress loading
-- ========================================
-- Создаем функцию для быстрого расчета прогресса всех тем пользователя
-- Это заменяет множественные запросы на один оптимизированный запрос

CREATE OR REPLACE FUNCTION public.get_user_topics_progress_batch(
  p_user_id UUID,
  p_topic_ids UUID[]
)
RETURNS TABLE (
  topic_id UUID,
  completed BOOLEAN,
  progress_percent NUMERIC,
  completed_subtopic_count INTEGER,
  total_subtopic_count INTEGER,
  is_unlocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH topic_subtopics AS (
    -- Получаем все подтемы для указанных тем
    SELECT 
      t.id AS topic_id,
      COUNT(s.id) AS total_subtopic_count,
      ARRAY_AGG(s.id) FILTER (WHERE s.id IS NOT NULL) AS subtopic_ids
    FROM public.topics t
    LEFT JOIN public.subtopics s ON s.topic_id = t.id
    WHERE t.id = ANY(p_topic_ids)
    GROUP BY t.id
  ),
  user_progress AS (
    -- Получаем прогресс пользователя по подтемам
    SELECT 
      utp.topic_id,
      utp.subtopic_id,
      utp.completed
    FROM public.user_topic_progress utp
    WHERE utp.user_id = p_user_id
      AND utp.topic_id = ANY(p_topic_ids)
      AND utp.completed = true
      AND utp.subtopic_id IS NOT NULL
  ),
  completed_counts AS (
    -- Считаем завершенные подтемы для каждой темы
    SELECT 
      ts.topic_id,
      ts.total_subtopic_count,
      COUNT(DISTINCT up.subtopic_id) AS completed_subtopic_count
    FROM topic_subtopics ts
    LEFT JOIN user_progress up ON up.topic_id = ts.topic_id 
      AND up.subtopic_id = ANY(COALESCE(ts.subtopic_ids, ARRAY[]::UUID[]))
    GROUP BY ts.topic_id, ts.total_subtopic_count
  ),
  previous_topics_completed AS (
    -- Определяем, завершены ли предыдущие темы для разблокировки
    SELECT 
      t.id AS topic_id,
      CASE 
        WHEN t.order_index = (SELECT MIN(order_index) FROM public.topics WHERE id = ANY(p_topic_ids)) THEN true
        ELSE EXISTS (
          SELECT 1
          FROM public.topics prev_topic
          LEFT JOIN public.user_topic_progress prev_utp 
            ON prev_utp.user_id = p_user_id 
            AND prev_utp.topic_id = prev_topic.id
            AND prev_utp.completed = true
            AND prev_utp.subtopic_id IS NULL
          WHERE prev_topic.order_index < t.order_index
            AND prev_topic.id = ANY(p_topic_ids)
          GROUP BY prev_topic.id
          HAVING COUNT(prev_utp.id) > 0
        )
      END AS is_unlocked
    FROM public.topics t
    WHERE t.id = ANY(p_topic_ids)
  )
  SELECT 
    t.id AS topic_id,
    CASE 
      WHEN COALESCE(ts.total_subtopic_count, 0) = 0 THEN false
      ELSE COALESCE(cc.completed_subtopic_count, 0) >= COALESCE(ts.total_subtopic_count, 0)
    END AS completed,
    CASE 
      WHEN COALESCE(ts.total_subtopic_count, 0) > 0 
      THEN ROUND((COALESCE(cc.completed_subtopic_count, 0)::NUMERIC / ts.total_subtopic_count::NUMERIC) * 100, 2)
      ELSE 0
    END AS progress_percent,
    COALESCE(cc.completed_subtopic_count, 0)::INTEGER AS completed_subtopic_count,
    COALESCE(ts.total_subtopic_count, 0)::INTEGER AS total_subtopic_count,
    COALESCE(ptc.is_unlocked, t.order_index = (SELECT MIN(order_index) FROM public.topics WHERE id = ANY(p_topic_ids))) AS is_unlocked
  FROM public.topics t
  LEFT JOIN topic_subtopics ts ON ts.topic_id = t.id
  LEFT JOIN completed_counts cc ON cc.topic_id = t.id
  LEFT JOIN previous_topics_completed ptc ON ptc.topic_id = t.id
  WHERE t.id = ANY(p_topic_ids)
  ORDER BY t.order_index;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_user_topics_progress_batch IS 'Быстрое получение прогресса пользователя по нескольким темам одним запросом';

-- Создаем индексы для ускорения запросов прогресса
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_topic 
  ON public.user_topic_progress(user_id, topic_id) 
  WHERE subtopic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_topic_completed 
  ON public.user_topic_progress(user_id, topic_id, completed) 
  WHERE completed = true AND subtopic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_completed 
  ON public.user_topic_progress(user_id, completed, subtopic_id) 
  WHERE completed = true;
