# 🏆 Настройка автоматического распределения призов лидерборда

## 📋 Обзор

Система автоматического распределения призов работает в два этапа:

1. **Обнаружение завершившихся сезонов** — через pg_cron (SQL) или GitHub Actions
2. **Распределение призов** — через Edge Function `season-end-rewards`

---

## 🎯 Вариант 1: pg_cron (рекомендуется, если доступно)

### Шаг 1: Применить миграцию

Выполни в Supabase SQL Editor:

```sql
-- Примени миграцию
-- supabase/migrations/20251121000000_setup_automatic_rewards_distribution.sql
```

Или выполни вручную:

```sql
-- 1. Проверь, доступен ли pg_cron
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Если нет, включи расширение (требуются права суперпользователя)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Шаг 2: Проверь созданную задачу

```sql
-- Посмотри все cron задачи
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE jobname = 'weekly-season-rewards-check';
```

Должно показать:
- `jobname = 'weekly-season-rewards-check'`
- `schedule = '0 0 * * 0'` (каждое воскресенье в 00:00 UTC)
- `active = true`

### Шаг 3: Проверь работу

```sql
-- Ручной запуск проверки
SELECT manual_check_seasons();

-- Посмотри логи
SELECT * FROM cron_job_logs 
WHERE job_name = 'check_and_log_ended_seasons'
ORDER BY created_at DESC 
LIMIT 10;
```

### Шаг 4: Настрой внешний вызов Edge Function

**Важно:** pg_cron может вызывать только SQL функции, не Edge Functions напрямую.

Поэтому нужно:
1. pg_cron логирует завершившиеся сезоны в `cron_job_logs`
2. Внешний сервис (GitHub Actions) читает логи и вызывает Edge Function

**Альтернатива:** Используй только GitHub Actions (см. Вариант 2)

---

## 🚀 Вариант 2: GitHub Actions (рекомендуется, если pg_cron недоступен)

### Шаг 1: Настрой Secrets в GitHub

Перейди в **Settings → Secrets and variables → Actions** и добавь:

- `SUPABASE_URL` — URL твоего Supabase проекта
- `SUPABASE_SERVICE_ROLE_KEY` — Service Role Key (не Anon Key!)

### Шаг 2: Файл уже создан

Файл `.github/workflows/season-rewards.yml` уже создан и настроен.

### Шаг 3: Проверь работу

1. Перейди в **Actions** в GitHub
2. Найди workflow "🏆 Season Rewards Distribution"
3. Нажми **Run workflow** для ручного запуска
4. Проверь логи выполнения

### Шаг 4: Автоматический запуск

Workflow настроен на автоматический запуск:
- **Каждое воскресенье в 00:00 UTC**
- Это оптимально для месячных сезонов (30 дней)

---

## 🔧 Вариант 3: Ручной запуск

### Через Supabase Dashboard

1. Перейди в **Edge Functions** → `season-end-rewards`
2. Нажми **Invoke**
3. Передай JSON:
   ```json
   {
     "season_id": 1
   }
   ```
   Или оставь пустым `{}` для обработки всех завершившихся сезонов

### Через SQL + Edge Function

```sql
-- 1. Проверь завершившиеся сезоны
SELECT manual_check_seasons();

-- 2. Посмотри логи
SELECT * FROM cron_job_logs 
WHERE job_name = 'check_and_log_ended_seasons'
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Вызови Edge Function вручную (через Dashboard или curl)
```

---

## ✅ Проверка работы

### 1. Проверь завершившиеся сезоны

```sql
SELECT 
  id,
  season_number,
  name_ru,
  end_date,
  is_active,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_leaderboard_rewards 
      WHERE season_id = duel_pass_seasons.id 
      LIMIT 1
    ) THEN '✅ Rewards distributed'
    ELSE '⏳ Pending'
  END as rewards_status
FROM duel_pass_seasons
WHERE end_date <= NOW()
ORDER BY end_date DESC;
```

### 2. Проверь начисленные призы

```sql
SELECT 
  ulr.*,
  s.name_ru as season_name,
  s.season_number
FROM user_leaderboard_rewards ulr
JOIN duel_pass_seasons s ON s.id = ulr.season_id
ORDER BY ulr.created_at DESC
LIMIT 20;
```

### 3. Проверь логи cron

```sql
SELECT 
  id,
  job_name,
  status,
  result_data->>'season_id' as season_id,
  result_data->>'season_name' as season_name,
  created_at
FROM cron_job_logs 
WHERE job_name IN ('check_and_log_ended_seasons', 'mark_season_for_rewards')
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🐛 Troubleshooting

### pg_cron не работает

**Проблема:** `ERROR: extension "pg_cron" does not exist`

**Решение:**
1. Проверь план Supabase (pg_cron доступен не на всех планах)
2. Используй GitHub Actions (Вариант 2)
3. Или обратись в поддержку Supabase для включения pg_cron

### Edge Function не вызывается

**Проблема:** Призы не начисляются

**Решение:**
1. Проверь логи Edge Function в Supabase Dashboard
2. Убедись, что `SUPABASE_SERVICE_ROLE_KEY` правильный (не Anon Key!)
3. Проверь, что сезон действительно завершился (`end_date <= NOW()`)
4. Проверь, что есть игроки в топ-10

### GitHub Actions не запускается

**Проблема:** Workflow не выполняется

**Решение:**
1. Проверь, что Secrets настроены правильно
2. Проверь, что файл `.github/workflows/season-rewards.yml` существует
3. Проверь логи в **Actions** → **Season Rewards Distribution**

---

## 📊 Мониторинг

### Рекомендуется настроить:

1. **Уведомления на ошибки** — через GitHub Actions или Supabase
2. **Регулярная проверка логов** — раз в неделю
3. **Проверка начисленных призов** — после каждого сезона

### Полезные запросы:

```sql
-- Статистика по призам
SELECT 
  s.season_number,
  s.name_ru,
  COUNT(DISTINCT ulr.user_id) as players_with_rewards,
  COUNT(ulr.id) as total_rewards_distributed
FROM duel_pass_seasons s
LEFT JOIN user_leaderboard_rewards ulr ON ulr.season_id = s.id
WHERE s.end_date <= NOW()
GROUP BY s.id, s.season_number, s.name_ru
ORDER BY s.season_number DESC;
```

---

## 🎯 Рекомендации

1. **Используй GitHub Actions**, если pg_cron недоступен
2. **Тестируй на тестовом сезоне** перед продакшеном
3. **Настрой уведомления** на ошибки
4. **Проверяй логи** регулярно
5. **Документируй изменения** в сезонах

---

## ✅ Готово!

После настройки система будет автоматически:
1. Обнаруживать завершившиеся сезоны
2. Логировать их для обработки
3. Распределять призы игрокам

**Следующий шаг:** Протестируй на тестовом сезоне!

