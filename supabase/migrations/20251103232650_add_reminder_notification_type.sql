-- Добавление типа 'reminder' для уведомлений
-- Обновление CHECK constraint для поддержки нового типа уведомлений

ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder'));

