# 🎯 Финальная настройка проекта

## ✅ Что уже сделано:

1. ✅ Проект связан с Supabase CLI
2. ✅ Все Edge Functions задеплоены (6 функций)
3. ✅ Таблицы созданы (16 таблиц)
4. ✅ Функции созданы (get_user_profile_id, has_role, modify_boost_inventory)

## 📋 Что нужно сделать:

### Шаг 1: Настроить Secrets для Edge Functions

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
2. В разделе "Secrets" добавьте:

```
SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw
DATABASE_URL=postgresql://postgres.yffjnqegeiorunyvcxkn:345556Ff@?@aws-1-eu-north-1.pooler.supabase.com:5432/postgres
```

**Получить DATABASE_URL:**
1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/database
2. Найдите "Connection string" (URI mode)
3. Скопируйте и используйте

### Шаг 2: Применить все миграции

**Вариант 1: Через SQL Editor (рекомендуется)**

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Откройте файл `ALL_MIGRATIONS.sql` в проекте
3. Скопируйте содержимое
4. Вставьте в SQL Editor
5. Нажмите Run

**Вариант 2: Через Edge Function (после настройки secrets)**

После настройки secrets выполните:
```bash
node scripts/apply-migrations-in-batches.js
```

### Шаг 3: Проверить RLS политики

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/policies
2. Убедитесь, что все таблицы имеют RLS политики
3. Если политики отсутствуют - они должны быть в миграциях

### Шаг 4: Импортировать данные (если нужно)

Если у вас есть данные в старом проекте:
1. Экспортируйте данные из старого проекта
2. Импортируйте в новый проект через SQL Editor или Table Editor

---

## 📊 Текущий статус:

- ✅ Edge Functions: 6/6 задеплоены
- ⚠️  Миграции: нужно применить через SQL Editor
- ⚠️  Secrets: нужно настроить в Dashboard
- ⚠️  RLS политики: будут применены с миграциями

---

## 🚀 Быстрый старт:

1. Настройте secrets для Edge Functions
2. Примените миграции через SQL Editor (файл ALL_MIGRATIONS.sql)
3. Проверьте RLS политики
4. Готово! 🎉

