-- ============================================
-- Week 3: Performance Optimization - Indexes
-- ============================================
-- Добавление недостающих индексов для оптимизации частых запросов
-- Применяется после анализа медленных запросов

-- ============================================
-- 1. Индексы для внешних ключей (Foreign Keys)
-- ============================================
-- Foreign Keys не индексируются автоматически в PostgreSQL!
-- Эти индексы критичны для JOIN операций

-- user_progress: уже есть idx_user_progress_user и idx_user_progress_question (проверено)
-- user_topic_progress: уже есть индексы (проверено)
-- test_sessions: уже есть индексы (проверено)
-- transactions: уже есть idx_transactions_user_id (проверено)
-- purchases: уже есть idx_purchases_user_id (проверено)

-- Проверяем и добавляем только недостающие:
CREATE INDEX IF NOT EXISTS idx_user_progress_user_question_composite 
  ON public.user_progress(user_id, question_id);
-- Составной индекс для частых запросов типа "найти прогресс пользователя по конкретному вопросу"

-- ============================================
-- 2. Индексы для частых выборок (WHERE status = ...)
-- ============================================
-- Эти индексы уже существуют:
-- - idx_purchases_status (для Cron-скрипта check-pending-transactions)
-- - idx_test_sessions_cleanup (составной: status, started_at)

-- Добавляем только если не существует:
CREATE INDEX IF NOT EXISTS idx_duel_players_activity_status 
  ON public.duel_players(user_id, activity_status) 
  WHERE activity_status IS NOT NULL;
-- Для поиска активных дуэлей игрока (WHERE user_id = ? AND activity_status = 'online')

CREATE INDEX IF NOT EXISTS idx_duel_players_connected 
  ON public.duel_players(duel_id, connected) 
  WHERE connected = true;
-- Для поиска подключенных игроков в дуэли

-- ============================================
-- 3. Составные индексы для оптимизации JOIN
-- ============================================
-- Для частых запросов с несколькими условиями WHERE

CREATE INDEX IF NOT EXISTS idx_purchases_user_status_created 
  ON public.purchases(user_id, status, created_at DESC);
-- Оптимизация для: "найти все pending покупки пользователя, отсортированные по дате"

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_created 
  ON public.transactions(user_id, transaction_type, created_at DESC);
-- Оптимизация для: "найти транзакции пользователя определенного типа, отсортированные по дате"

-- ============================================
-- 4. Частичные индексы (Partial Indexes) для экономии места
-- ============================================
-- Индексы только для активных/незавершенных записей

CREATE INDEX IF NOT EXISTS idx_purchases_pending 
  ON public.purchases(created_at DESC) 
  WHERE status = 'pending';
-- Оптимизация для check-pending-transactions: все pending покупки
-- Фильтр по времени (created_at < NOW() - 24h) применяется в запросе Edge Function

CREATE INDEX IF NOT EXISTS idx_stars_payments_pending_rewards 
  ON public.stars_payments(completed_at) 
  WHERE status = 'completed' AND rewards_status = 'pending';
-- Оптимизация для check-pending-transactions: только платежи с незачисленными наградами

-- ============================================
-- 5. Индексы для дуэлей (если еще не существуют)
-- ============================================
-- Проверяем существующие индексы и добавляем недостающие

CREATE INDEX IF NOT EXISTS idx_duels_status_created 
  ON public.duels(status, created_at DESC);
-- Для поиска активных/завершенных дуэлей

CREATE INDEX IF NOT EXISTS idx_duel_answers_player_question 
  ON public.duel_answers(player_id, duel_question_id);
-- Для быстрого поиска ответов игрока

-- ============================================
-- 6. Обновление статистики планировщика
-- ============================================
-- КРИТИЧНО: После создания индексов нужно обновить статистику,
-- чтобы PostgreSQL планировщик знал о новых индексах

ANALYZE VERBOSE public.purchases;
ANALYZE VERBOSE public.transactions;
ANALYZE VERBOSE public.test_sessions;
ANALYZE VERBOSE public.user_progress;
ANALYZE VERBOSE public.duel_players;
ANALYZE VERBOSE public.duels;
ANALYZE VERBOSE public.stars_payments;

-- ============================================
-- Комментарии к индексам
-- ============================================

COMMENT ON INDEX idx_user_progress_user_question_composite IS 
  'Составной индекс для оптимизации запросов прогресса пользователя по конкретному вопросу';

COMMENT ON INDEX idx_duel_players_activity_status IS 
  'Индекс для поиска активных дуэлей игрока по статусу активности';

COMMENT ON INDEX idx_purchases_pending IS 
  'Частичный индекс для оптимизации check-pending-transactions: все pending покупки (фильтр по времени в запросе)';

COMMENT ON INDEX idx_stars_payments_pending_rewards IS 
  'Частичный индекс для оптимизации check-pending-transactions: платежи с незачисленными наградами';

