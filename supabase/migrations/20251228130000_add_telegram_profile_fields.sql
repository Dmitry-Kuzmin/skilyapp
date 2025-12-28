-- Добавляем поля для полной синхронизации данных Telegram
-- Эти данные используются для персонализации и аналитики

-- 1. Добавляем новые поля в таблицу profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS language_code TEXT,
ADD COLUMN IF NOT EXISTS is_telegram_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allows_write_to_pm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT now();

-- 2. Комментарии для документации
COMMENT ON COLUMN profiles.username IS 'Telegram username (без @)';
COMMENT ON COLUMN profiles.is_telegram_premium IS 'Статус Telegram Premium подписки пользователя';
COMMENT ON COLUMN profiles.allows_write_to_pm IS 'Разрешение на отправку личных сообщений от бота';
COMMENT ON COLUMN profiles.language_code IS 'Язык интерфейса Telegram (ru, es, en)';
COMMENT ON COLUMN profiles.last_login_at IS 'Время последнего входа пользователя';

-- 3. Индекс для быстрого поиска по username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
