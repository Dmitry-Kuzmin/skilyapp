-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная настройка RLS для app_config
-- Проблема: "new row violates row-level security policy" при попытке чтения/записи
-- Решение: Правильные политики для SELECT (все) и INSERT/UPDATE (только админы через Edge Functions)

-- 1. Убеждаемся, что таблица существует
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Включаем RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 3. Удаляем ВСЕ существующие политики (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Anyone can read app_config" ON app_config;
DROP POLICY IF EXISTS "Admins can manage app_config" ON app_config;
DROP POLICY IF EXISTS "Anyone can insert app_config" ON app_config;
DROP POLICY IF EXISTS "Anyone can update app_config" ON app_config;
DROP POLICY IF EXISTS "Service role can manage app_config" ON app_config;

-- 4. Создаем политику для SELECT (все могут читать)
-- Используем IF NOT EXISTS через DO блок
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

-- 5. Создаем политику для INSERT/UPDATE (только через service_role в Edge Functions)
-- ВАЖНО: Обычные пользователи НЕ могут вставлять/обновлять
-- Это делается только через Edge Functions с service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'app_config' 
    AND policyname = 'Service role can manage app_config'
  ) THEN
    CREATE POLICY "Service role can manage app_config"
      ON app_config FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 6. Вставляем дефолтные флаги (только если их нет)
-- ВАЖНО: Это выполняется с service_role, поэтому должно работать
INSERT INTO app_config (key, value, description) VALUES
  ('realtime_enabled', 'true'::jsonb, 'Включить Real-time подписки'),
  ('notifications_realtime', 'false'::jsonb, 'Real-time для уведомлений (по умолчанию отключено - используем polling)'),
  ('duel_realtime', 'true'::jsonb, 'Real-time для дуэлей'),
  ('ai_chat_enabled', 'true'::jsonb, 'Включить AI чат'),
  ('duels_enabled', 'true'::jsonb, 'Включить дуэли')
ON CONFLICT (key) DO NOTHING;

-- 7. Создаем/обновляем функцию для получения флагов
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.1. Создаем функцию для обновления флагов (для админов)
CREATE OR REPLACE FUNCTION update_app_config(
  config_key TEXT,
  config_value JSONB,
  config_description TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
  is_admin_user BOOLEAN;
BEGIN
  -- Получаем текущего пользователя
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Проверяем, что пользователь - админ
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = current_user_id AND role = 'admin'
  ) INTO is_admin_user;
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can update app_config';
  END IF;
  
  -- Обновляем или вставляем конфигурацию
  INSERT INTO app_config (key, value, description, updated_at)
  VALUES (config_key, config_value, config_description, NOW())
  ON CONFLICT (key) DO UPDATE
  SET 
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, app_config.description),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Создаем индекс для производительности
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);

-- 9. Комментарий для документации
COMMENT ON TABLE app_config IS 'Конфигурация приложения (feature flags). Все могут читать, только service_role может изменять.';
COMMENT ON POLICY "Anyone can read app_config" ON app_config IS 'Все пользователи могут читать флаги для проверки доступности фич';
COMMENT ON POLICY "Service role can manage app_config" ON app_config IS 'Только Edge Functions с service_role могут изменять конфигурацию';

