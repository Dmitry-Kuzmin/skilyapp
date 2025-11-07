# 🔄 Автоматическое применение миграций

## ✅ Система готова!

Теперь миграции будут применяться автоматически через Edge Function `apply-sql`.

---

## 🚀 Первый запуск (один раз)

### Шаг 1: Задеплоить функцию `apply-sql`

**Через Supabase Dashboard:**

1. Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
2. Нажмите **"New Function"**
3. Название: `apply-sql`
4. Скопируйте код из `supabase/functions/apply-sql/index.ts`
5. Нажмите **"Deploy"**

**Или через CLI (если установлен):**
```bash
supabase functions deploy apply-sql
```

### Шаг 2: Настроить переменные окружения

В Supabase Dashboard → Edge Functions → `apply-sql` → Settings → Secrets:

- `DATABASE_URL`: `postgres://postgres:ZfNtylh28w-b7-KlZih-Ama7H6vtJJiN@db.ijijcrucqqnnjbkclqhb.supabase.co:5432/postgres?sslmode=prefer`

---

## 📋 Применение миграций

### Способ 1: Через npm скрипт (рекомендуется)

```bash
npm run supabase:apply APPLY_NOW.sql "описание миграции"
```

### Способ 2: Напрямую через скрипт

```bash
node scripts/apply-migration-auto-v2.js APPLY_NOW.sql "описание миграции"
```

### Способ 3: С указанием Service Role Key

```bash
export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ"
npm run supabase:apply APPLY_NOW.sql "описание миграции"
```

---

## ✅ Что делает скрипт

1. Читает SQL из указанного файла
2. Отправляет SQL в Edge Function `apply-sql`
3. Edge Function выполняет SQL напрямую через PostgreSQL
4. Возвращает результат

---

## ⚠️ Важно

- Edge Function `apply-sql` должна быть задеплоена
- Переменная окружения `DATABASE_URL` должна быть настроена в Edge Function
- Service Role Key должен быть сохранен в `.env.local` (не коммитьте в Git!)

---

## 🔗 Прямые ссылки

- **Edge Functions**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
- **SQL Editor** (резервный вариант): https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
