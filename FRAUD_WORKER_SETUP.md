# 🛠️ Настройка Fraud Check Worker (Free Tier)

> **Для Free плана Supabase** - используем GitHub Actions вместо pg_cron

---

## ✅ Что уже сделано автоматически

1. ✅ Edge Function создана: `supabase/functions/fraud-check-worker/index.ts`
2. ✅ GitHub Actions workflow создан: `.github/workflows/fraud-worker.yml`
3. ✅ Таблица очереди создана в миграции: `fraud_check_queue`

---

## 📋 Что нужно сделать ВРУЧНУЮ (3 простых шага)

### Шаг 1: Задеплоить Edge Function

Открой терминал и выполни:

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase functions deploy fraud-check-worker --no-verify-jwt
```

**Что это делает:** Загружает функцию на Supabase сервер.

**Ожидаемый результат:** Увидишь сообщение типа `Deployed Function fraud-check-worker`

---

### Шаг 2: Добавить секреты в GitHub

1. Открой репозиторий на GitHub: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep
2. Перейди: **Settings** → **Secrets and variables** → **Actions**
3. Нажми **New repository secret** и добавь два секрета:

   **Секрет 1:**
   - **Name:** `SUPABASE_URL`
   - **Value:** Твой Supabase URL (например: `https://yffjnqegeiorunyvcxkn.supabase.co`)
   - Где найти: Supabase Dashboard → Settings → API → Project URL

   **Секрет 2:**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Твой Service Role Key
   - Где найти: Supabase Dashboard → Settings → API → service_role key (⚠️ секретный ключ!)

4. Нажми **Add secret** для каждого

**Важно:** Service Role Key - это секретный ключ! Никому не показывай его.

---

### Шаг 3: Запустить workflow вручную (тест)

1. На GitHub перейди: **Actions** → **Fraud Check Worker**
2. Нажми **Run workflow** → **Run workflow**
3. Подожди 10-20 секунд
4. Нажми на выполненный workflow и проверь, что всё зелёное ✅

**Ожидаемый результат:** 
- Видишь зелёную галочку ✅
- В логах: `✅ Fraud check worker completed successfully`

---

## 🎉 Готово!

Теперь система будет автоматически проверять фрод каждые 6 часов (4 раза в сутки).

---

## 🧪 Как проверить, что всё работает

### Тест 1: Проверка очереди

1. Создай тестовую конверсию (через API или вручную в БД):
   ```sql
   INSERT INTO partner_conversions (partner_id, partner_code, event_type, session_id)
   VALUES (
     (SELECT id FROM partners LIMIT 1),
     'TEST',
     'click',
     'test-session-' || gen_random_uuid()::TEXT
   );
   ```

2. Проверь, что задача появилась в очереди:
   ```sql
   SELECT * FROM fraud_check_queue WHERE status = 'pending';
   ```

3. Запусти workflow вручную (Actions → Fraud Check Worker → Run workflow)

4. Проверь, что задача обработана:
   ```sql
   SELECT * FROM fraud_check_queue WHERE status = 'completed';
   ```

### Тест 2: Проверка логов

1. На GitHub: **Actions** → выбери последний запуск
2. Открой лог шага "Trigger Fraud Check Edge Function"
3. Должен быть ответ от функции с количеством обработанных задач

---

## ⚙️ Настройка частоты запуска

Если хочешь изменить частоту запуска, отредактируй файл `.github/workflows/fraud-worker.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Каждые 6 часов
```

**Варианты:**
- `'0 */6 * * *'` - каждые 6 часов (4 раза в день) ✅ **Рекомендуется**
- `'0 4 * * *'` - раз в сутки в 4:00 UTC
- `'*/10 * * * *'` - каждые 10 минут (⚠️ быстро закончится лимит GitHub Actions)

---

## 🐛 Решение проблем

### Проблема: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

**Решение:** Проверь, что секреты добавлены в GitHub (Settings → Secrets → Actions)

### Проблема: "Function not found"

**Решение:** Убедись, что функция задеплоена:
```bash
supabase functions deploy fraud-check-worker --no-verify-jwt
```

### Проблема: "No pending jobs"

**Это нормально!** Значит очередь пустая, фрода нет.

---

## 📊 Мониторинг

### Проверить очередь вручную:

```sql
-- Сколько задач в очереди
SELECT status, COUNT(*) 
FROM fraud_check_queue 
GROUP BY status;

-- Последние обработанные задачи
SELECT * FROM fraud_check_queue 
ORDER BY processed_at DESC 
LIMIT 10;
```

### Проверить fraud alerts:

```sql
-- Последние алерты
SELECT * FROM partner_fraud_alerts 
ORDER BY created_at DESC 
LIMIT 10;
```

---

**Всё готово! Система работает автоматически.** 🚀

