-- ============================================
-- ANALYTICS VIEWS для мониторинга
-- Легкие view для ежедневного контроля
-- ============================================

-- ============================================
-- 0. Создаем user_events если не существует
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_type 
  ON public.user_events(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_user_events_type_date 
  ON public.user_events(event_type, created_at DESC);

-- RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON public.user_events FOR SELECT
  USING (public.can_access_daily_bonus(user_id));

CREATE POLICY "System can insert events"
  ON public.user_events FOR INSERT
  WITH CHECK (current_setting('role', true) = 'service_role');

COMMENT ON TABLE public.user_events IS 
  'Лог событий пользователя (streak_lost, freeze_used, etc)';

-- ============================================
-- 1. Admin Daily Pulse (главный дашборд)
-- ============================================

CREATE OR REPLACE VIEW public.admin_daily_pulse AS
SELECT
  -- Сегодняшняя активность
  COUNT(*) FILTER (WHERE last_claimed_date = CURRENT_DATE) as claims_today,
  
  -- Премиум пользователи (с защитой)
  COUNT(*) FILTER (WHERE freeze_available > 0) as users_with_freeze,
  
  -- Здоровье системы
  AVG(current_streak) as avg_streak,
  MAX(current_streak) as max_streak,
  
  -- Недельная динамика
  COUNT(*) FILTER (WHERE last_claimed_date >= CURRENT_DATE - 7) as active_this_week,
  
  -- Риск потери (не заходили вчера)
  COUNT(*) FILTER (
    WHERE last_claimed_date < CURRENT_DATE - 1 
      AND current_streak >= 3
  ) as at_risk_users,
  
  -- Всего активных
  COUNT(*) FILTER (WHERE current_streak > 0) as total_active_users

FROM public.user_daily_bonus;

COMMENT ON VIEW public.admin_daily_pulse IS 
  'Ежедневный пульс системы: активность, здоровье, риски';

-- ============================================
-- 2. Daily Bonus Metrics (детализация)
-- ============================================

CREATE OR REPLACE VIEW public.daily_bonus_metrics AS
SELECT
  DATE(last_claimed_date) as date,
  
  -- Основные метрики
  COUNT(*) as total_claims,
  COUNT(DISTINCT user_id) as unique_users,
  
  -- Streak метрики
  AVG(current_streak) as avg_streak,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_streak) as median_streak,
  MAX(current_streak) as max_streak,
  
  -- Распределение по дням недели
  COUNT(*) FILTER (WHERE (current_streak - 1) % 7 + 1 = 1) as day_1_claims,
  COUNT(*) FILTER (WHERE (current_streak - 1) % 7 + 1 = 7) as day_7_claims,
  
  -- Freeze usage
  COUNT(*) FILTER (WHERE freeze_available > 0) as users_with_freeze,
  
  -- Retention signal
  COUNT(*) FILTER (WHERE current_streak >= 7) as d7_plus,
  COUNT(*) FILTER (WHERE current_streak >= 30) as d30_plus

FROM public.user_daily_bonus
WHERE last_claimed_date >= CURRENT_DATE - 30  -- Последние 30 дней
GROUP BY DATE(last_claimed_date)
ORDER BY date DESC;

COMMENT ON VIEW public.daily_bonus_metrics IS 
  'Детализированная статистика по дням за последние 30 дней';

-- ============================================
-- 3. Freeze Usage Analytics
-- ============================================

CREATE OR REPLACE VIEW public.freeze_usage_stats AS
SELECT
  DATE(created_at) as date,
  
  -- Использование freeze
  COUNT(*) FILTER (WHERE event_type = 'streak_freeze_auto_used') as auto_used,
  
  -- Средний спасенный streak
  AVG((metadata->>'streak_saved')::INTEGER) 
    FILTER (WHERE event_type = 'streak_freeze_auto_used') as avg_streak_saved,
  
  -- Потери streak (без freeze)
  COUNT(*) FILTER (WHERE event_type = 'streak_lost') as streaks_lost,
  
  -- Средний потерянный streak
  AVG((metadata->>'old_streak')::INTEGER) 
    FILTER (WHERE event_type = 'streak_lost') as avg_streak_lost

FROM public.user_events
WHERE event_type IN ('streak_freeze_auto_used', 'streak_lost')
  AND created_at >= CURRENT_DATE - 30
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW public.freeze_usage_stats IS 
  'Статистика использования Streak Freeze и потерь streak';

-- ============================================
-- 4. Streak Distribution (распределение)
-- ============================================

CREATE OR REPLACE VIEW public.streak_distribution AS
SELECT
  CASE 
    WHEN current_streak = 0 THEN '0 (inactive)'
    WHEN current_streak BETWEEN 1 AND 3 THEN '1-3 days'
    WHEN current_streak BETWEEN 4 AND 6 THEN '4-6 days'
    WHEN current_streak = 7 THEN '7 days (week)'
    WHEN current_streak BETWEEN 8 AND 13 THEN '8-13 days'
    WHEN current_streak BETWEEN 14 AND 29 THEN '14-29 days'
    WHEN current_streak BETWEEN 30 AND 59 THEN '30-59 days (month+)'
    WHEN current_streak BETWEEN 60 AND 89 THEN '60-89 days'
    ELSE '90+ days (legend)'
  END as streak_range,
  
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage

FROM public.user_daily_bonus
GROUP BY 
  CASE 
    WHEN current_streak = 0 THEN '0 (inactive)'
    WHEN current_streak BETWEEN 1 AND 3 THEN '1-3 days'
    WHEN current_streak BETWEEN 4 AND 6 THEN '4-6 days'
    WHEN current_streak = 7 THEN '7 days (week)'
    WHEN current_streak BETWEEN 8 AND 13 THEN '8-13 days'
    WHEN current_streak BETWEEN 14 AND 29 THEN '14-29 days'
    WHEN current_streak BETWEEN 30 AND 59 THEN '30-59 days (month+)'
    WHEN current_streak BETWEEN 60 AND 89 THEN '60-89 days'
    ELSE '90+ days (legend)'
  END
ORDER BY MIN(current_streak);

COMMENT ON VIEW public.streak_distribution IS 
  'Распределение пользователей по длине streak';

-- ============================================
-- 5. Top Streakers (лидерборд)
-- ============================================

CREATE OR REPLACE VIEW public.top_streakers AS
SELECT
  udb.user_id,
  p.username,
  udb.current_streak,
  udb.total_claims,
  udb.last_claimed_date,
  
  -- Вычисляемый multiplier (без хранения в БД)
  LEAST(1.0 + (FLOOR(udb.current_streak / 7.0) * 0.05), 1.5) as streak_multiplier,
  
  -- Вычисляемый freeze (если колонка есть)
  COALESCE(udb.freeze_available, 0) as freeze_available,
  
  -- Ранг
  RANK() OVER (ORDER BY udb.current_streak DESC) as rank,
  
  -- Tier
  CASE 
    WHEN udb.current_streak >= 365 THEN 'legendary'
    WHEN udb.current_streak >= 90 THEN 'diamond'
    WHEN udb.current_streak >= 30 THEN 'gold'
    WHEN udb.current_streak >= 14 THEN 'silver'
    WHEN udb.current_streak >= 7 THEN 'bronze'
    ELSE 'rookie'
  END as tier

FROM public.user_daily_bonus udb
LEFT JOIN public.profiles p ON p.id = udb.user_id
WHERE udb.current_streak > 0
ORDER BY udb.current_streak DESC
LIMIT 100;

COMMENT ON VIEW public.top_streakers IS 
  'Топ-100 пользователей по streak (для лидерборда)';

-- ============================================
-- 6. Quick Health Check (для алертов)
-- ============================================

CREATE OR REPLACE VIEW public.system_health_check AS
SELECT
  -- Критичные метрики
  (SELECT COUNT(*) FROM public.user_daily_bonus 
   WHERE last_claimed_date = CURRENT_DATE) as claims_today,
  
  (SELECT AVG(current_streak) FROM public.user_daily_bonus 
   WHERE current_streak > 0) as avg_active_streak,
  
  (SELECT COUNT(*) FROM public.user_daily_bonus 
   WHERE last_claimed_date = CURRENT_DATE - 1) as claims_yesterday,
  
  -- Проблемы
  (SELECT COUNT(*) FROM public.user_events 
   WHERE event_type = 'streak_lost' 
     AND created_at >= CURRENT_DATE) as streaks_lost_today,
  
  -- Freeze эффективность
  (SELECT COUNT(*) FROM public.user_events 
   WHERE event_type = 'streak_freeze_auto_used' 
     AND created_at >= CURRENT_DATE) as freezes_used_today,
  
  -- Рост
  ROUND(
    100.0 * (
      SELECT COUNT(*) FROM user_daily_bonus WHERE last_claimed_date = CURRENT_DATE
    ) / NULLIF(
      (SELECT COUNT(*) FROM user_daily_bonus WHERE last_claimed_date = CURRENT_DATE - 1), 
      0
    ) - 100, 
    2
  ) as growth_rate_percent;

COMMENT ON VIEW public.system_health_check IS 
  'Быстрая проверка здоровья системы (для алертов)';

-- ============================================
-- Права доступа (только чтение для аналитики)
-- ============================================

-- Эти view могут читать только админы
-- Для обычных пользователей - создать отдельные view с фильтрами

GRANT SELECT ON public.admin_daily_pulse TO service_role;
GRANT SELECT ON public.daily_bonus_metrics TO service_role;
GRANT SELECT ON public.freeze_usage_stats TO service_role;
GRANT SELECT ON public.streak_distribution TO service_role;
GRANT SELECT ON public.top_streakers TO authenticated; -- Лидерборд для всех
GRANT SELECT ON public.system_health_check TO service_role;

-- ============================================
-- Пример использования
-- ============================================

/*
-- Быстрый check (запускать каждое утро)
SELECT * FROM admin_daily_pulse;

-- Детализация за неделю
SELECT * FROM daily_bonus_metrics 
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC;

-- Проверить эффективность Freeze
SELECT * FROM freeze_usage_stats 
WHERE date >= CURRENT_DATE - 7;

-- Распределение пользователей
SELECT * FROM streak_distribution;

-- Топ стрикеры
SELECT * FROM top_streakers LIMIT 10;

-- Алерты (если что-то не так)
SELECT * FROM system_health_check;
*/

