# 🧹 Быстрая настройка автоматической очистки test_sessions

## ✅ Что нужно сделать

### 1. Задеплоить Edge Function

```bash
supabase functions deploy cleanup-test-sessions
```

Или через Supabase Dashboard → Edge Functions → Deploy

### 2. Настроить GitHub Secrets

1. Перейдите в GitHub → Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - **`SUPABASE_URL`** - URL вашего проекта
     - **Значение:** `https://yffjnqegeiorunyvcxkn.supabase.co`
     - Или найти: Supabase Dashboard → Settings → API → Project URL
   - **`SUPABASE_ANON_KEY`** - Anon/Public ключ
     - **Где найти:** 
       1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
       2. Найдите секцию **"Project API keys"**
       3. Найдите ключ с меткой **"anon" "public"** (НЕ service_role!)
       4. Нажмите "Reveal" и скопируйте значение (начинается с `eyJ`)
     - ⚠️ **ВАЖНО:** Используйте только "anon" "public" ключ, НЕ service_role!

### 3. Проверить что всё работает

#### A. Запустить вручную через GitHub Actions:
1. Перейдите в GitHub → Actions
2. Выберите "Cleanup Test Sessions"
3. Нажмите "Run workflow" → "Run workflow"

#### B. Или вызвать Edge Function напрямую:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/cleanup-test-sessions
```

**Где взять `YOUR_ANON_KEY`:**
- Supabase Dashboard → Settings → API → Project API keys → "anon" "public"

**Ожидаемый ответ:**
```json
{
  "success": true,
  "deleted_started": 5,
  "deleted_abandoned": 2,
  "timestamp": "2025-01-01T03:00:00.000Z"
}
```

### 4. Проверить логи

#### GitHub Actions:
- GitHub → Actions → Cleanup Test Sessions → Последний run → View logs

#### Edge Function:
- Supabase Dashboard → Edge Functions → cleanup-test-sessions → Logs

---

## 🔍 Проверка что очистка работает

### До очистки:
```sql
SELECT COUNT(*) FROM test_sessions 
WHERE status = 'started' 
AND started_at < NOW() - INTERVAL '24 hours';
```

### После очистки (через день):
```sql
SELECT COUNT(*) FROM test_sessions 
WHERE status = 'started' 
AND started_at < NOW() - INTERVAL '24 hours';
```

Количество должно уменьшиться (или быть 0).

---

## ⚠️ Troubleshooting

### Проблема: GitHub Action падает с 401/403

**Решение:**
1. Проверьте что `SUPABASE_ANON_KEY` правильный
2. Проверьте что Edge Function задеплоена
3. Проверьте что URL правильный (без `/functions/v1/` в секрете)

### Проблема: Edge Function возвращает ошибку

**Решение:**
1. Проверьте логи Edge Function в Supabase Dashboard
2. Проверьте что таблица `test_sessions` существует
3. Проверьте что Service Role Key настроен правильно

### Проблема: Ничего не удаляется

**Решение:**
1. Проверьте что есть старые сессии:
```sql
SELECT COUNT(*) FROM test_sessions 
WHERE status = 'started' 
AND started_at < NOW() - INTERVAL '24 hours';
```
2. Если есть, но не удаляются - проверьте логи Edge Function

---

## 📊 Мониторинг

### Настроить уведомления (опционально):

GitHub Actions автоматически создаст Issue при ошибке. Для email уведомлений:

1. GitHub → Settings → Notifications
2. Включите "Actions" уведомления

---

## ✅ Готово!

После настройки:
- ✅ Очистка будет запускаться автоматически каждый день в 03:00 UTC
- ✅ Можно запустить вручную через GitHub Actions
- ✅ Логи доступны в GitHub Actions и Supabase Dashboard
- ✅ Уведомления при ошибках

