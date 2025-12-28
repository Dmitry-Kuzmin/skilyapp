-- Добавляем поля для сохранения предпочтений страны и категории
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_country text DEFAULT 'russia',
ADD COLUMN IF NOT EXISTS preferred_license_category text DEFAULT 'B';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_country ON profiles(preferred_country);

COMMENT ON COLUMN profiles.preferred_country IS 'Предпочтительная страна для обучения ПДД (russia, spain)';
COMMENT ON COLUMN profiles.preferred_license_category IS 'Предпочтительная категория прав (A, B, C и т.д.)';
