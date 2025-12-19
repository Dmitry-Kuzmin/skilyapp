-- Безопасная версия миграции Feature Flags
-- Проверяет существование перед созданием

-- Создаем таблицу только если не существует
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем дефолтные флаги (только если их нет)
INSERT INTO app_config (key, value, description) VALUES
  ('realtime_enabled', 'true'::jsonb, 'Включить Real-time подписки'),
  ('notifications_realtime', 'false'::jsonb, 'Real-time для уведомлений (по умолчанию отключено - используем polling)'),
  ('duel_realtime', 'true'::jsonb, 'Real-time для дуэлей'),
  ('ai_chat_enabled', 'true'::jsonb, 'Включить AI чат')
ON CONFLICT (key) DO NOTHING;

-- Включаем RLS только если еще не включен
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'app_config'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Создаем политику только если не существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'app_config' 
    AND policyname = 'Anyone can read app_config'
  ) THEN
    CREATE POLICY "Anyone can read app_config"
      ON app_config FOR SELECT
      USING (true);
  END IF;
END $$;

-- Создаем функцию (заменяет существующую)
CREATE OR REPLACE FUNCTION get_feature_flag(flag_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_value JSONB;
BEGIN
  SELECT value INTO flag_value
  FROM app_config
  WHERE key = flag_key;
  
  IF flag_value IS NULL THEN
    RETURN true; -- По умолчанию включено
  END IF;
  
  -- Поддерживаем разные форматы: {enabled: true} или просто true/false
  IF jsonb_typeof(flag_value) = 'boolean' THEN
    RETURN flag_value::boolean;
  END IF;
  
  IF jsonb_typeof(flag_value) = 'object' THEN
    RETURN COALESCE((flag_value->>'enabled')::boolean, true);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Создаем индекс только если не существует
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);

