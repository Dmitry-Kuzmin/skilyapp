-- Добавляем флаг для включения/выключения дуэлей
INSERT INTO app_config (key, value, description) VALUES
  ('duels_enabled', 'true'::jsonb, 'Включить функцию Дуэли')
ON CONFLICT (key) DO NOTHING;

