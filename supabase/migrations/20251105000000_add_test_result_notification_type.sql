-- Добавление типа 'test_result' для уведомлений о результатах тестов
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'test_result'));

