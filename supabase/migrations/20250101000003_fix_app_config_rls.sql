-- Исправление RLS политики для app_config
-- Убеждаемся, что все могут читать флаги

-- Удаляем старую политику если есть
DROP POLICY IF EXISTS "Anyone can read app_config" ON app_config;

-- Создаем правильную политику (все могут читать)
CREATE POLICY "Anyone can read app_config"
  ON app_config FOR SELECT
  USING (true);

-- Убеждаемся, что RLS включен
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Проверяем, что политика создана
-- SELECT * FROM pg_policies WHERE tablename = 'app_config';

