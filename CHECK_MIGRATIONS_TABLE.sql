-- ============================================
-- ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ МИГРАЦИЙ
-- ============================================
-- Проверяем, какие колонки есть в таблице миграций

-- 1. Структура таблицы миграций
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- 2. Последние миграции (показываем все доступные колонки)
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

