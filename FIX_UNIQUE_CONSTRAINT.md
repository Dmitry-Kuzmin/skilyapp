# 🔧 Исправление ошибки "there is no unique or exclusion constraint matching the ON CONFLICT specification"

## ❌ Проблема

Ошибка в логах:
```
Ошибка upsert вопроса: there is no unique or exclusion constraint matching the ON CONFLICT specification (source_id: GS-60, тема: 3)
```

**Причина:** В таблице `questions_new` нет уникального ограничения (constraint) на колонку `source_id`, поэтому `ON CONFLICT (source_id)` не работает.

## 🔍 Что произошло

В миграции был создан уникальный индекс с условием:
```sql
CREATE UNIQUE INDEX idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;
```

**Проблема:** В PostgreSQL `UNIQUE INDEX` с условием `WHERE` **не может использоваться** в `ON CONFLICT`. Для `ON CONFLICT` нужен `UNIQUE CONSTRAINT` или `UNIQUE INDEX` без условия.

## ✅ Решение

Создана новая миграция, которая:
1. Удаляет старый уникальный индекс
2. Создает уникальный constraint на `source_id`

### Применить миграцию

**Вариант 1: Через SQL Editor (рекомендуется)**

1. Откройте SQL Editor:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
   ```

2. Скопируйте и выполните SQL:
   ```sql
   -- Drop the existing unique index (if it exists)
   DROP INDEX IF EXISTS idx_questions_new_source_id;

   -- Create a unique constraint on source_id
   ALTER TABLE public.questions_new
   ADD CONSTRAINT questions_new_source_id_key UNIQUE (source_id);
   ```

3. Нажмите "Run" или `Ctrl+Enter`

**Вариант 2: Через Supabase CLI**

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase db push
```

## ⚠️ Важные замечания

1. **NULL значения:**
   - Уникальный constraint не позволяет иметь несколько NULL значений
   - Если в таблице есть записи с `source_id = NULL`, нужно их обработать:
     - Либо заполнить `source_id` для всех записей
     - Либо удалить записи с `source_id = NULL`

2. **Дубликаты:**
   - Если в таблице уже есть дубликаты `source_id`, constraint не создастся
   - Нужно сначала удалить дубликаты

## 🔍 Проверка перед применением

1. **Проверьте, есть ли NULL значения:**
   ```sql
   SELECT COUNT(*) FROM questions_new WHERE source_id IS NULL;
   ```

2. **Проверьте, есть ли дубликаты:**
   ```sql
   SELECT source_id, COUNT(*) 
   FROM questions_new 
   WHERE source_id IS NOT NULL
   GROUP BY source_id 
   HAVING COUNT(*) > 1;
   ```

3. **Если есть дубликаты или NULL:**
   - Обработайте их перед созданием constraint
   - Или удалите проблемные записи

## 📋 После применения миграции

1. **Попробуйте синхронизировать снова**
2. **Проверьте логи** - ошибка должна исчезнуть
3. **Проверьте данные** - вопросы должны синхронизироваться

## 🔗 Полезные ссылки

- **SQL Editor:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
- **Table Editor:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/editor
- **Логи функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs

