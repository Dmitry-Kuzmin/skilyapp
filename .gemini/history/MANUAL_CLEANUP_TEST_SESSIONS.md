# 🧹 Ручная очистка test_sessions (для Free плана)

## ⚠️ Важно

Если у вас **Free план Supabase**, `pg_cron` недоступен. Используйте один из вариантов ниже.

---

## Вариант 1: Ручная очистка через SQL (самый простой)

### Выполните в Supabase Dashboard → SQL Editor:

```sql
-- Очистка незавершенных сессий старше 24 часов
DELETE FROM public.test_sessions
WHERE status = 'started'
  AND started_at < NOW() - INTERVAL '24 hours';

-- Очистка abandoned сессий старше 7 дней
DELETE FROM public.test_sessions
WHERE status = 'abandoned'
  AND updated_at < NOW() - INTERVAL '7 days';
```

### Как часто запускать:
- **Рекомендуется:** Раз в день (можно делать вручную)
- **Минимум:** Раз в неделю (чтобы не забить БД)

---

## Вариант 2: Внешний сервис (автоматизация)

### A. GitHub Actions (бесплатно) ✅ РЕКОМЕНДУЕТСЯ

**Файл уже создан:** `.github/workflows/cleanup-test-sessions.yml`

**Настройка:**
1. Перейдите в GitHub → Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - `SUPABASE_URL` - URL вашего проекта (например: `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` - Anon/Public ключ из Supabase Dashboard → Settings → API
3. Задеплойте Edge Function `cleanup-test-sessions` (см. ниже)
4. Workflow запустится автоматически каждый день в 03:00 UTC
5. Можно запустить вручную: Actions → Cleanup Test Sessions → Run workflow

**Преимущества:**
- ✅ Бесплатно (2000 минут в месяц, запрос занимает ~1 секунду)
- ✅ Уведомления на почту при ошибках
- ✅ Логи в GitHub Actions
- ✅ Infrastructure as Code (в репозитории)

### B. cron-job.org (бесплатно)

1. Зарегистрируйтесь на https://cron-job.org
2. Создайте новую задачу:
   - **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-test-sessions`
   - **Schedule:** Ежедневно в 03:00 UTC
   - **Method:** POST
   - **Headers:** `Authorization: Bearer YOUR_ANON_KEY`

### C. Edge Function для очистки

**Файл уже создан:** `supabase/functions/cleanup-test-sessions/index.ts`

**Задеплойте функцию:**
```bash
supabase functions deploy cleanup-test-sessions
```

Или через Supabase Dashboard → Edge Functions → Deploy

**Особенности:**
- ✅ Использует современный `Deno.serve` (быстрее, меньше памяти)
- ✅ Использует Service Role Key (обходит RLS)
- ✅ Возвращает количество удаленных записей
- ✅ Логирует ошибки для отладки

---

## Вариант 3: Проверка размера БД

### SQL запрос для проверки:

```sql
-- Сколько незавершенных сессий старше 24 часов
SELECT COUNT(*) as old_sessions
FROM public.test_sessions
WHERE status = 'started'
  AND started_at < NOW() - INTERVAL '24 hours';

-- Сколько всего сессий
SELECT 
  status,
  COUNT(*) as count,
  MIN(started_at) as oldest,
  MAX(started_at) as newest
FROM public.test_sessions
GROUP BY status;
```

**Если `old_sessions > 1000`** - стоит почистить вручную.

---

## ✅ Рекомендация

1. **Сейчас:** Примените миграцию (она безопасна, просто не создаст cron задачу на Free плане)
2. **Потом:** Настройте один из вариантов выше (рекомендую GitHub Actions)
3. **В будущем:** При переходе на Pro план - pg_cron заработает автоматически

---

## 🔍 Проверка что очистка работает

После настройки автоматической очистки проверьте:

```sql
-- До очистки
SELECT COUNT(*) FROM test_sessions WHERE status = 'started';

-- После очистки (через день)
SELECT COUNT(*) FROM test_sessions WHERE status = 'started';
```

Количество должно уменьшиться.

