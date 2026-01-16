# ✅ Следующие шаги после настройки GitHub Actions

## 🎯 Что уже сделано:
- ✅ Workflow файл создан и запушен в GitHub
- ✅ Файл: `.github/workflows/stars-payment-retry.yml`

## 📋 Что нужно сделать сейчас:

### Шаг 1: Добавить секрет SUPABASE_ANON_KEY в GitHub

1. **Откройте GitHub репозиторий:**
   - Перейдите на: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep

2. **Откройте настройки секретов:**
   - Нажмите **Settings** (вверху репозитория)
   - В левом меню выберите **Secrets and variables** → **Actions**

3. **Создайте новый секрет:**
   - Нажмите **"New repository secret"**
   - **Name:** `SUPABASE_ANON_KEY`
   - **Secret:** Вставьте ваш ANON_KEY из Supabase

4. **Как получить ANON_KEY:**
   - Откройте Supabase Dashboard → **Settings** → **API**
   - Найдите секцию **"Project API keys"**
   - Скопируйте ключ **"anon public"** (это и есть ANON_KEY)

5. **Сохраните секрет:**
   - Нажмите **"Add secret"**

---

### Шаг 2: Проверить workflow в GitHub

1. **Откройте вкладку Actions:**
   - В репозитории нажмите **Actions** (вверху)

2. **Найдите workflow:**
   - Должен появиться workflow **"Stars Payment Retry"**

3. **Запустите вручную (для теста):**
   - Нажмите на workflow **"Stars Payment Retry"**
   - Нажмите **"Run workflow"** (справа вверху)
   - Выберите ветку `feature/premium-race-game` (или `main`)
   - Нажмите **"Run workflow"**

4. **Проверьте выполнение:**
   - Откройте запущенный workflow
   - Нажмите на job **"retry"**
   - Проверьте логи - должно быть:
     ```
     🔄 Запуск retry начислений Stars Payment...
     Ответ от функции:
     {
       "success": true,
       "processed": 0,
       ...
     }
     ✅ Retry выполнен успешно!
     ```

---

### Шаг 3: Проверить автоматический запуск

После добавления секрета workflow будет запускаться **автоматически каждые 5 минут**.

**Проверить:**
- GitHub → Actions → Stars Payment Retry
- Должны появиться автоматические запуски каждые 5 минут

---

## 🧪 Тестирование всей системы

### 1. Проверить, что функция задеплоена:

```bash
# Проверить в Supabase Dashboard → Edge Functions
# Должна быть функция: stars-payment-retry
```

### 2. Протестировать функцию вручную:

```bash
# Получить ANON_KEY из Supabase Dashboard → Settings → API
export SUPABASE_ANON_KEY="your_anon_key_here"

# Запустить retry
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
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
  "timestamp": "2025-01-20T..."
}
```

### 3. Проверить платежи в БД:

В Supabase Dashboard → SQL Editor:

```sql
-- Платежи, требующие retry
SELECT 
  id,
  stars_amount,
  status,
  rewards_status,
  retry_count,
  created_at
FROM stars_payments
WHERE status = 'completed'
  AND rewards_status IN ('pending', 'failed', 'retrying')
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Итоговый чеклист

- [ ] Workflow файл запушен в GitHub ✅ (уже сделано)
- [ ] Секрет `SUPABASE_ANON_KEY` добавлен в GitHub
- [ ] Workflow запущен вручную и работает
- [ ] Проверены логи - нет ошибок
- [ ] Автоматический запуск работает (проверить через 5 минут)

---

## 🎉 Готово!

После выполнения всех шагов система будет:
- ✅ Автоматически обрабатывать платежи каждые 5 минут
- ✅ Повторять начисление наград при ошибках
- ✅ Логировать все действия
- ✅ Работать бесплатно (не зависит от плана Supabase)

---

## 📊 Мониторинг

### Проверить историю запусков:
- GitHub → Actions → Stars Payment Retry → История запусков

### Проверить платежи с ошибками:
- Supabase Dashboard → SQL Editor → Запрос выше

### Проверить логи функции:
- Supabase Dashboard → Edge Functions → stars-payment-retry → Logs

---

## ❓ Если что-то не работает

1. **Workflow не запускается:**
   - Проверьте, что секрет `SUPABASE_ANON_KEY` добавлен
   - Проверьте синтаксис YAML файла

2. **Ошибка авторизации:**
   - Проверьте, что ANON_KEY правильный
   - Убедитесь, что скопировали "anon public", а не "service_role"

3. **Функция не отвечает:**
   - Проверьте, что функция `stars-payment-retry` задеплоена
   - Проверьте логи функции в Supabase Dashboard

