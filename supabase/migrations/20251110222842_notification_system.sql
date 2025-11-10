-- =====================================================
-- Telegram Bot Notification System
-- =====================================================
-- Комплексная система уведомлений для Telegram-бота
-- с AI-персонализацией и маркетинговыми триггерами

-- =====================================================
-- 1. Таблица шаблонов уведомлений
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('progress', 'duel', 'daily', 'educational', 'motivation', 'system')),
  type text NOT NULL, -- start, finish, streak, reminder, challenge, etc
  title_template text NOT NULL,
  message_template text NOT NULL,
  icon text,
  trigger_condition jsonb DEFAULT '{}'::jsonb, -- {event: 'duel_finished', condition: 'is_winner'}
  cooldown_hours int DEFAULT 24 CHECK (cooldown_hours >= 0),
  cta_text text, -- текст кнопки
  cta_deeplink text, -- deeplink в Mini App: /duel/{id}, /test/{topic_id}
  priority int DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=critical
  is_active boolean DEFAULT true,
  ai_enhance boolean DEFAULT false, -- использовать AI для персонализации
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;

-- =====================================================
-- 2. Таблица метрик пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_test_at timestamptz,
  last_duel_at timestamptz,
  last_login_at timestamptz DEFAULT now(),
  streak_days int DEFAULT 0 CHECK (streak_days >= 0),
  last_streak_date date,
  total_tests_completed int DEFAULT 0 CHECK (total_tests_completed >= 0),
  total_duels_played int DEFAULT 0 CHECK (total_duels_played >= 0),
  total_questions_answered int DEFAULT 0 CHECK (total_questions_answered >= 0),
  correct_answers int DEFAULT 0 CHECK (correct_answers >= 0),
  readiness_level numeric(5,2) DEFAULT 0 CHECK (readiness_level BETWEEN 0 AND 100),
  topics_completed jsonb DEFAULT '[]'::jsonb, -- массив topic_id
  common_mistakes jsonb DEFAULT '{}'::jsonb, -- {topic_id: error_count}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Индексы для аналитики и триггеров
CREATE INDEX idx_user_metrics_user_id ON user_metrics(user_id);
CREATE INDEX idx_user_metrics_last_test ON user_metrics(last_test_at);
CREATE INDEX idx_user_metrics_last_login ON user_metrics(last_login_at);
CREATE INDEX idx_user_metrics_streak ON user_metrics(streak_days DESC);

-- =====================================================
-- 3. Таблица настроек уведомлений пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT true,
  quiet_hours_start time, -- например, 22:00
  quiet_hours_end time, -- например, 09:00
  categories_enabled jsonb DEFAULT '["duel", "daily", "motivation", "educational"]'::jsonb,
  preferred_language text DEFAULT 'ru' CHECK (preferred_language IN ('ru', 'es', 'en')),
  timezone text DEFAULT 'Europe/Madrid',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Индекс для быстрого поиска настроек
CREATE INDEX idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX idx_user_notification_settings_enabled ON user_notification_settings(enabled) WHERE enabled = true;

-- =====================================================
-- 4. Лог отправленных уведомлений
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  telegram_message_id bigint, -- ID сообщения в Telegram
  telegram_chat_id bigint, -- Chat ID пользователя
  title text NOT NULL,
  message text NOT NULL,
  category text,
  type text,
  metadata jsonb DEFAULT '{}'::jsonb, -- дополнительные данные (deeplink, variables и т.д.)
  was_ai_enhanced boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  clicked boolean DEFAULT false,
  clicked_at timestamptz,
  delivery_status text DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed'))
);

-- Индексы для аналитики
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_template_id ON notification_logs(template_id);
CREATE INDEX idx_notification_logs_category ON notification_logs(category);
CREATE INDEX idx_notification_logs_clicked ON notification_logs(clicked) WHERE clicked = true;

-- =====================================================
-- RLS Политики
-- =====================================================

-- notification_templates: все могут читать активные шаблоны
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active notification templates"
  ON notification_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "System can manage notification templates"
  ON notification_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_metrics: пользователи видят только свои метрики
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON user_metrics
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

CREATE POLICY "Users can insert their own metrics"
  ON user_metrics
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

CREATE POLICY "Users can update their own metrics"
  ON user_metrics
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

-- System can manage all metrics (для Edge Functions)
CREATE POLICY "System can manage all metrics"
  ON user_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_notification_settings: пользователи управляют своими настройками
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
  ON user_notification_settings
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

CREATE POLICY "Users can insert their own notification settings"
  ON user_notification_settings
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

CREATE POLICY "Users can update their own notification settings"
  ON user_notification_settings
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

-- notification_logs: пользователи видят только свои уведомления
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
  ON notification_logs
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        )
    )
  );

-- System can insert and update logs
CREATE POLICY "System can manage notification logs"
  ON notification_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Триггеры для updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_metrics_updated_at
  BEFORE UPDATE ON user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Функция для автоматического создания метрик
-- =====================================================

CREATE OR REPLACE FUNCTION create_user_metrics_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_metrics (user_id, last_login_at)
  VALUES (NEW.id, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_notification_settings (user_id, preferred_language)
  VALUES (NEW.id, COALESCE(NEW.language_code, 'ru'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_metrics_on_new_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_metrics_on_profile();

-- =====================================================
-- Комментарии для документации
-- =====================================================

COMMENT ON TABLE notification_templates IS 'Шаблоны уведомлений для Telegram-бота с поддержкой AI-персонализации';
COMMENT ON TABLE user_metrics IS 'Метрики активности пользователей для триггеров и аналитики';
COMMENT ON TABLE user_notification_settings IS 'Персональные настройки уведомлений пользователей';
COMMENT ON TABLE notification_logs IS 'Журнал отправленных уведомлений для аналитики и отладки';

