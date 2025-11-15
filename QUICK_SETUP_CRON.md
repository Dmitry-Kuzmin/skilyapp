# ⚙️ Быстрая настройка Cron Job для Stars Payment Retry

## 🎯 Что нужно сделать

Настроить автоматический retry начислений каждые 5 минут.

---

## 📋 Шаг 1: Определить ваш план Supabase

Откройте Supabase Dashboard → Settings → Billing

- **Pro план или выше** → Используйте [Вариант A](#вариант-a-pro-план)
- **Free план** → Используйте [Вариант B](#вариант-b-free-план)

---

## ✅ Вариант A: Pro план (pg_cron)

### Способ 1: Через SQL Editor (рекомендуется)

1. Откройте **Supabase Dashboard → SQL Editor**
2. Скопируйте содержимое файла `scripts/setup-stars-retry-cron.sql`
3. Вставьте в SQL Editor и нажмите **Run** (или `Ctrl+Enter`)

### Способ 2: Через миграцию

```bash
# Применить миграцию
supabase db push
```

### Проверка:

```sql
-- Проверить, что cron job создан
SELECT * FROM cron.job WHERE jobname = 'stars-payment-retry';
```

**Ожидаемый результат:** Должна быть одна запись с `schedule = '*/5 * * * *'`

---

## ✅ Вариант B: Free план (внешний сервис)

### Рекомендуемый вариант: GitHub Actions

1. **Создайте файл** `.github/workflows/stars-payment-retry.yml`:

```yaml
name: Stars Payment Retry

on:
  schedule:
    - cron: '*/5 * * * *'  # Каждые 5 минут
  workflow_dispatch:  # Ручной запуск

jobs:
  retry:
    runs-on: ubuntu-latest
    steps:
      - name: Call Retry Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry
```

2. **Добавьте секрет в GitHub:**
   - Откройте репозиторий → Settings → Secrets and variables → Actions
   - Нажмите "New repository secret"
   - Имя: `SUPABASE_ANON_KEY`
   - Значение: Скопируйте из Supabase Dashboard → Settings → API → "anon public"

3. **Закоммитьте и запушьте файл:**
   ```bash
   git add .github/workflows/stars-payment-retry.yml
   git commit -m "Add GitHub Actions workflow for stars payment retry"
   git push
   ```

4. **Проверьте:**
   - Откройте GitHub → Actions
   - Должен появиться workflow "Stars Payment Retry"
   - Можно запустить вручную через "Run workflow"

---

## 🧪 Тестирование

### Ручной запуск retry:

```bash
# Установите ANON_KEY
export SUPABASE_ANON_KEY="your_anon_key_here"

# Запустите скрипт
./scripts/manual-retry-stars-payment.sh
```

Или через curl:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "manual_review": 0,
  "errors": [],
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

---

## 📊 Мониторинг

### Проверить платежи, требующие retry:

```sql
SELECT 
  id,
  user_id,
  stars_amount,
  status,
  rewards_status,
  retry_count,
  rewards_errors,
  created_at
FROM stars_payments
WHERE status = 'completed'
  AND rewards_status IN ('pending', 'failed', 'retrying')
ORDER BY created_at DESC;
```

### Проверить историю cron job (только для Pro плана):

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stars-payment-retry')
ORDER BY start_time DESC
LIMIT 10;
```

---

## ❓ Troubleshooting

### Проблема: "extension pg_cron does not exist"

**Решение:** У вас Free план. Используйте [Вариант B](#вариант-b-free-план).

### Проблема: Cron job не запускается

**Решение:**
1. Проверьте, что cron job активен: `SELECT active FROM cron.job WHERE jobname = 'stars-payment-retry';`
2. Проверьте логи: `SELECT * FROM cron.job_run_details WHERE jobid = ...`
3. Убедитесь, что функция `stars-payment-retry` задеплоена

### Проблема: GitHub Actions не запускается

**Решение:**
1. Проверьте, что секрет `SUPABASE_ANON_KEY` создан
2. Проверьте синтаксис YAML файла
3. Проверьте логи в GitHub → Actions

---

## ✅ Готово!

После настройки cron job будет автоматически обрабатывать платежи со статусом `pending`, `failed` или `retrying` каждые 5 минут.

