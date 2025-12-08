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

### A. GitHub Actions (бесплатно)

Создайте файл `.github/workflows/cleanup-test-sessions.yml`:

```yaml
name: Cleanup Test Sessions

on:
  schedule:
    - cron: '0 3 * * *' # Каждый день в 03:00 UTC
  workflow_dispatch: # Можно запустить вручную

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup old test sessions
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-test-sessions
```

**Настройка:**
1. Создайте секрет `SUPABASE_ANON_KEY` в GitHub Settings → Secrets
2. Замените `YOUR_PROJECT` на ваш проект Supabase
3. Создайте Edge Function `cleanup-test-sessions` (см. ниже)

### B. cron-job.org (бесплатно)

1. Зарегистрируйтесь на https://cron-job.org
2. Создайте новую задачу:
   - **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-test-sessions`
   - **Schedule:** Ежедневно в 03:00 UTC
   - **Method:** POST
   - **Headers:** `Authorization: Bearer YOUR_ANON_KEY`

### C. Edge Function для очистки

Создайте Edge Function `cleanup-test-sessions`:

```typescript
// supabase/functions/cleanup-test-sessions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Очистка незавершенных сессий старше 24 часов
  const { data: deleted1, error: error1 } = await supabase
    .from('test_sessions')
    .delete()
    .eq('status', 'started')
    .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Очистка abandoned сессий старше 7 дней
  const { data: deleted2, error: error2 } = await supabase
    .from('test_sessions')
    .delete()
    .eq('status', 'abandoned')
    .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  return new Response(JSON.stringify({
    success: true,
    deleted_started: deleted1?.length || 0,
    deleted_abandoned: deleted2?.length || 0,
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

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

