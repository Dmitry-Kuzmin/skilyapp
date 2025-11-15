# ✅ Настройка Retry через GitHub Actions (для Free плана)

## 🎯 Проблема

Ошибка `relation "cron.job" does not exist` означает, что у вас **Free план Supabase**, и `pg_cron` недоступен.

## ✅ Решение: GitHub Actions

GitHub Actions позволяет запускать задачи по расписанию **бесплатно**.

---

## 📋 Шаг 1: Получить ANON_KEY из Supabase

1. Откройте **Supabase Dashboard → Settings → API**
2. Найдите секцию **"Project API keys"**
3. Скопируйте ключ **"anon public"** (это ваш `ANON_KEY`)

---

## 📋 Шаг 2: Добавить секрет в GitHub

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings → Secrets and variables → Actions**
3. Нажмите **"New repository secret"**
4. **Name:** `SUPABASE_ANON_KEY`
5. **Secret:** Вставьте скопированный `ANON_KEY`
6. Нажмите **"Add secret"**

---

## 📋 Шаг 3: Закоммитить workflow файл

Workflow файл уже создан: `.github/workflows/stars-payment-retry.yml`

Теперь нужно закоммитить и запушить:

```bash
# Проверить, что файл создан
ls -la .github/workflows/stars-payment-retry.yml

# Добавить в git
git add .github/workflows/stars-payment-retry.yml

# Закоммитить
git commit -m "Add GitHub Actions workflow for stars payment retry"

# Запушить
git push
```

---

## 📋 Шаг 4: Проверить работу

1. Откройте GitHub → **Actions** (вкладка в репозитории)
2. Должен появиться workflow **"Stars Payment Retry"**
3. Можно запустить вручную:
   - Нажмите на workflow
   - Нажмите **"Run workflow"** → **"Run workflow"**

---

## 🧪 Тестирование

### Ручной запуск через GitHub:

1. GitHub → Actions → Stars Payment Retry
2. Нажмите **"Run workflow"**
3. Выберите ветку (обычно `main`)
4. Нажмите **"Run workflow"**

### Проверка логов:

После запуска откройте выполнение workflow и проверьте логи. Должно быть:

```
🔄 Запуск retry начислений Stars Payment...
Ответ от функции:
{
  "success": true,
  "processed": 0,
  "succeeded": 0,
  ...
}
✅ Retry выполнен успешно!
```

---

## ⏰ Расписание

Workflow настроен на запуск **каждые 5 минут** автоматически.

Расписание: `*/5 * * * *` (каждые 5 минут)

---

## 🔍 Мониторинг

### Проверить платежи, требующие retry:

В Supabase Dashboard → SQL Editor:

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

### Проверить историю запусков GitHub Actions:

GitHub → Actions → Stars Payment Retry → История запусков

---

## ❓ Troubleshooting

### Проблема: "Secret SUPABASE_ANON_KEY not found"

**Решение:** Убедитесь, что секрет создан в Settings → Secrets and variables → Actions

### Проблема: Workflow не запускается автоматически

**Решение:** 
1. Проверьте, что файл закоммичен и запушен
2. Проверьте синтаксис YAML (должен быть правильный отступ)
3. GitHub Actions может задержаться на несколько минут

### Проблема: Ошибка авторизации

**Решение:** Проверьте, что `SUPABASE_ANON_KEY` правильный (скопирован из Supabase Dashboard)

---

## ✅ Готово!

После настройки GitHub Actions будет автоматически запускать retry каждые 5 минут, и платежи со статусом `failed` или `pending` будут автоматически обрабатываться.

**Преимущества GitHub Actions:**
- ✅ Бесплатно
- ✅ Надежно
- ✅ Можно запускать вручную
- ✅ История запусков и логи
- ✅ Не зависит от плана Supabase

