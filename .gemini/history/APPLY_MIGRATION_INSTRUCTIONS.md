# Инструкция по применению миграции analytics_events_log

## 🎯 Важность
**КРИТИЧНО**: Эта миграция необходима для предотвращения дубликатов событий аналитики.

## 📋 Способы применения

### Вариант 1: Через SQL Editor (Рекомендуется)

1. **Откройте SQL Editor:**
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
   ```

2. **Скопируйте содержимое файла:**
   - Откройте: `supabase/migrations/20250120000000_create_analytics_events_table.sql`
   - Или готовый файл: `APPLY_ANALYTICS_EVENTS_TABLE.sql`

3. **Вставьте в SQL Editor и нажмите "Run"**

### Вариант 2: Через Supabase CLI (если настроен)

```bash
# Если у вас настроен Supabase CLI
supabase db push

# Или применить конкретную миграцию
supabase migration up
```

### Вариант 3: Через скрипт (если есть SERVICE_ROLE_KEY)

```bash
# Установите переменную окружения
export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ"

# Примените миграцию
npm run supabase:apply supabase/migrations/20250120000000_create_analytics_events_table.sql
```

## ✅ Проверка после применения

1. **Проверьте таблицу:**
   ```sql
   SELECT * FROM public.analytics_events_log LIMIT 1;
   ```

2. **Проверьте индексы:**
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'analytics_events_log';
   ```

3. **Проверьте политики RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'analytics_events_log';
   ```

## 🔍 Что будет создано

- ✅ Таблица `analytics_events_log`
- ✅ Уникальный индекс на `event_id` (для дедупликации)
- ✅ Индексы для быстрого поиска
- ✅ RLS политика для Service Role

## 📝 Примечание

Эта миграция безопасна - использует `IF NOT EXISTS`, поэтому можно применять несколько раз.

