# Применение миграции системы сезонов

## Проблема
Миграция `20251116000000_create_season_system.sql` не применяется автоматически из-за конфликта с существующими миграциями.

## Решение: Применить вручную через SQL Editor

### Шаг 1: Откройте SQL Editor в Supabase Dashboard
1. Перейдите: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Откройте SQL Editor

### Шаг 2: Скопируйте и выполните миграцию
Откройте файл `supabase/migrations/20251116000000_create_season_system.sql` и скопируйте его содержимое в SQL Editor, затем выполните.

### Или используйте команду напрямую:
```bash
# Прочитайте содержимое миграции
cat supabase/migrations/20251116000000_create_season_system.sql

# Скопируйте содержимое и вставьте в SQL Editor в Supabase Dashboard
```

### Шаг 3: Проверьте результат
После выполнения проверьте, что таблицы созданы:

```sql
-- Проверить таблицы сезонов
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%season%';

-- Должны быть:
-- - duel_pass_seasons
-- - duel_pass_season_rewards
-- - user_season_progress
-- - season_challenges
-- - user_challenge_progress
-- - user_season_history

-- Проверить активный сезон
SELECT * FROM duel_pass_seasons WHERE is_active = true;

-- Проверить награды (должно быть 30 уровней)
SELECT COUNT(*) FROM duel_pass_season_rewards WHERE season_id = 1;

-- Проверить челленджи
SELECT COUNT(*) FROM season_challenges WHERE season_id = 1;
```

## Альтернативный способ: Применить только новую миграцию

Если хотите применить только новую миграцию через CLI:

```bash
# Создайте временную директорию с только новой миграцией
mkdir -p temp_migrations
cp supabase/migrations/20251116000000_create_season_system.sql temp_migrations/

# Примените через psql напрямую (если есть доступ)
# Или используйте Supabase SQL Editor (рекомендуется)
```

## После применения миграции

1. ✅ Проверьте, что таблицы созданы
2. ✅ Проверьте, что сезон создан (должен быть сезон #1 "Operación Asfalto")
3. ✅ Проверьте, что награды созданы (30 уровней)
4. ✅ Проверьте, что челленджи созданы (примеры Daily/Weekly/Season)
5. ✅ Запустите приложение и проверьте работу

## Тестирование

После применения миграции следуйте инструкциям в `TESTING_SEASON_SYSTEM.md`

