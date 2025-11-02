-- Создание таблицы уведомлений для дуэлей
CREATE TABLE IF NOT EXISTS duel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duel_id uuid REFERENCES duels(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind')),
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_duel_notifications_user_id ON duel_notifications(user_id);
CREATE INDEX idx_duel_notifications_duel_id ON duel_notifications(duel_id);
CREATE INDEX idx_duel_notifications_created_at ON duel_notifications(created_at DESC);
CREATE INDEX idx_duel_notifications_is_read ON duel_notifications(is_read) WHERE is_read = false;

-- RLS политики
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои уведомления
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Система может создавать уведомления
CREATE POLICY "System can create notifications"
  ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

-- Пользователи могут обновлять свои уведомления (пометить как прочитанные)
CREATE POLICY "Users can update their own notifications"
  ON duel_notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Включаем realtime для таблицы уведомлений
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;