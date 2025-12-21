# 🧹 Настройка автоматической очистки данных дуэлей

## Обзор

Система автоматической очистки удаляет старые временные данные дуэлей:
- `duel_answers` — ответы игроков (удаляются через 7 дней после завершения дуэли)
- `duel_active_exploits` — активные атаки/эксплойты (удаляются через 1 день)

**Важно:** Агрегированные данные (статистика, результаты) остаются в таблицах `duels`, `duel_stats` и `match_summary`, поэтому очистка безопасна.

---

## ⚙️ Настройка на бесплатном тарифе Supabase

На бесплатном тарифе `pg_cron` недоступен, поэтому используем **Edge Function + внешний cron**.

### Шаг 1: Применить миграцию

Миграция уже создана: `20250121000000_optimize_duel_data_pruning.sql`

Она создаст:
- ✅ Колонку `match_summary` в таблице `duels`
- ✅ Функцию `delete_old_duel_data()` для очистки
- ✅ Индексы для быстрой работы
- ❌ `pg_cron` (закомментирован, т.к. недоступен на Free)

### Шаг 2: Развернуть Edge Function

Edge Function уже создана: `supabase/functions/duel-data-cleanup/index.ts`

Разверните её через Supabase CLI:
```bash
supabase functions deploy duel-data-cleanup
```

Или через Supabase Dashboard → Edge Functions → Deploy.

### Шаг 3: Настроить автоматический запуск

Выберите один из вариантов:

#### Вариант A: GitHub Actions (рекомендуется, бесплатно)

1. **Создайте файл** `.github/workflows/duel-data-cleanup.yml` (уже создан в проекте)

2. **Добавьте секреты в GitHub:**
   - Перейдите в Repository → Settings → Secrets and variables → Actions
   - Добавьте:
     - `SUPABASE_URL` — URL вашего проекта (например, `https://xxxxx.supabase.co`)
     - `SUPABASE_ANON_KEY` — Anon key из Supabase Dashboard → Settings → API

3. **Готово!** Workflow будет запускаться каждый день в 4:00 UTC автоматически

#### Вариант B: Vercel Cron (если используете Vercel)

Добавьте в `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/duel-cleanup",
    "schedule": "0 4 * * *"
  }]
}
```

Создайте API route `pages/api/cron/duel-cleanup.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/duel-data-cleanup`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
```

#### Вариант C: Ручной запуск

1. Перейдите в Supabase Dashboard → Edge Functions
2. Найдите `duel-data-cleanup`
3. Нажмите "Invoke" для ручного запуска

---

## 💰 Настройка на платном тарифе Supabase (Pro+)

Если у вас платный план, можно использовать встроенный `pg_cron`:

1. **Раскомментируйте секцию в миграции:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   
   DO $$
   BEGIN
     PERFORM cron.unschedule('cleanup-old-duel-data') 
     WHERE EXISTS (
       SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-duel-data'
     );
   
     PERFORM cron.schedule(
       'cleanup-old-duel-data',
       '0 4 * * *',
       'SELECT * FROM public.delete_old_duel_data();'
     );
   END;
   $$;
   ```

2. **Примените миграцию** — cron будет настроен автоматически

---

## 📊 Мониторинг

### Проверить статистику очистки

Вызовите Edge Function вручную или через cron, и получите ответ:
```json
{
  "success": true,
  "result": {
    "deleted_answers": 1234,
    "deleted_exploits": 56,
    "cleaned_duels": 78,
    "timestamp": "2025-01-21T04:00:00.000Z"
  }
}
```

### Проверить размер таблиц

```sql
-- Размер таблицы duel_answers
SELECT 
  pg_size_pretty(pg_total_relation_size('duel_answers')) as size,
  COUNT(*) as row_count
FROM duel_answers;

-- Размер таблицы duel_active_exploits
SELECT 
  pg_size_pretty(pg_total_relation_size('duel_active_exploits')) as size,
  COUNT(*) as row_count
FROM duel_active_exploits;
```

---

## 🔧 Ручной запуск очистки

### Через SQL:
```sql
SELECT * FROM public.delete_old_duel_data();
```

### Через Edge Function (curl):
```bash
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/duel-data-cleanup" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## ⚠️ Важные моменты

1. **Безопасность:** Очищаются только данные завершенных дуэлей (`status IN ('finished', 'cancelled')`)
2. **Агрегация:** Вся статистика сохраняется в `duel_stats` и `match_summary`
3. **Производительность:** Индексы на `created_at` обеспечивают быструю работу
4. **Частота:** Рекомендуется запускать раз в день, но можно и чаще

---

## 📈 Оценка эффективности

При 1000 дуэлях в день:
- Без очистки: ~20,000 строк/день → ~7.3 млн строк/год
- С очисткой (7 дней): максимум ~140,000 строк всегда

Экономия места: ~98% для `duel_answers` 📉
















