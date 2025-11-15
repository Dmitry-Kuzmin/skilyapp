-- Исправить проблему с миграцией 20251104000000
-- Выполните в Supabase SQL Editor перед повторным запуском supabase db push

-- Удалить запись о проблемной миграции (если она была применена с ошибкой)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251104000000';

-- Теперь можно снова запустить: supabase db push



