# ✅ Проверка настройки автоматического распределения призов

## 🎉 Задача успешно создана!

Результат `schedule 3` означает:
- ✅ Задача создана с ID = 3
- ✅ Имя задачи: `weekly-season-rewards-check`
- ✅ Расписание: Каждое воскресенье в 00:00 UTC
- ✅ Команда: `SELECT check_and_log_ended_seasons();`

---

## 📋 Проверка настройки

### 1. Проверь созданную задачу

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command,
  nodename,
  nodeport,
  database,
  username
FROM cron.job 
WHERE jobname = 'weekly-season-rewards-check';
```

**Ожидаемый результат:**
- `jobid = 3`
- `jobname = 'weekly-season-rewards-check'`
- `schedule = '0 0 * * 0'`
- `active = true`
- `command` содержит `SELECT check_and_log_ended_seasons();`

### 2. Проверь все cron задачи

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
ORDER BY jobid;
```

### 3. Тестовый запуск функции

```sql
-- Ручной запуск функции для проверки
SELECT manual_check_seasons();
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "seasons_found": 0,
  "message": "No seasons to process",
  "timestamp": "2025-01-21T..."
}
```

Или, если есть завершившиеся сезоны:
```json
{
  "success": true,
  "seasons_found": 1,
  "message": "Found 1 season(s) that need rewards distribution...",
  "seasons": [...]
}
```

### 4. Проверь логи

```sql
SELECT 
  id,
  job_name,
  status,
  result_data->>'season_id' as season_id,
  result_data->>'season_name' as season_name,
  created_at
FROM cron_job_logs 
WHERE job_name = 'check_and_log_ended_seasons'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔄 История выполнения

### Посмотреть историю выполнения задачи

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
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details 
WHERE jobid = 3
ORDER BY start_time DESC 
LIMIT 10;
```

**Что смотреть:**
- `status` — должен быть `succeeded` или `failed`
- `return_message` — сообщения об ошибках (если есть)
- `start_time` — когда задача выполнялась
- `duration` — сколько времени заняло выполнение

---

## ⚙️ Управление задачей

### Временно отключить задачу

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'weekly-season-rewards-check';
```

### Включить задачу обратно

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'weekly-season-rewards-check';
```

### Изменить расписание

```sql
-- 1. Удалить старую задачу
SELECT cron.unschedule('weekly-season-rewards-check');

-- 2. Создать новую с другим расписанием
SELECT cron.schedule(
  'weekly-season-rewards-check',
  '0 0 * * 1', -- Каждый понедельник (пример)
  $cron$SELECT check_and_log_ended_seasons();$cron$
);
```

### Удалить задачу

```sql
SELECT cron.unschedule('weekly-season-rewards-check');
-- или по ID:
SELECT cron.unschedule(3);
```

---

## 🎯 Что происходит дальше

### Автоматический процесс:

1. **Каждое воскресенье в 00:00 UTC** pg_cron запускает `check_and_log_ended_seasons()`
2. Функция находит завершившиеся сезоны и логирует их в `cron_job_logs`
3. **Внешний сервис** (GitHub Actions) читает логи и вызывает Edge Function `season-end-rewards`
4. Edge Function начисляет призы игрокам

### Важно:

⚠️ **pg_cron только логирует сезоны**, но не вызывает Edge Function напрямую!

**Нужно настроить:**
- GitHub Actions (рекомендуется) — см. `.github/workflows/season-rewards.yml`
- Или вручную вызывать Edge Function после проверки логов

---

## 📊 Мониторинг

### Проверь завершившиеся сезоны

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

### Проверь начисленные призы

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

---

## ✅ Следующие шаги

1. ✅ **pg_cron задача создана** — будет запускаться каждое воскресенье
2. ⚠️ **Настрой GitHub Actions** для вызова Edge Function (см. `docs/SETUP_AUTOMATIC_REWARDS.md`)
3. 📋 **Проверь логи** после первого выполнения (в следующее воскресенье)
4. 🧪 **Протестируй вручную** — создай тестовый сезон и проверь работу

---

## 🐛 Troubleshooting

### Задача не выполняется

1. Проверь, что `active = true`:
   ```sql
   SELECT active FROM cron.job WHERE jobid = 3;
   ```

2. Проверь историю выполнения:
   ```sql
   SELECT * FROM cron.job_run_details WHERE jobid = 3 ORDER BY start_time DESC LIMIT 5;
   ```

3. Проверь логи ошибок в `return_message`

### Функция не находит сезоны

1. Проверь, что есть завершившиеся сезоны:
   ```sql
   SELECT * FROM duel_pass_seasons WHERE end_date <= NOW() AND is_active = true;
   ```

2. Проверь, что призы ещё не распределены:
   ```sql
   SELECT * FROM user_leaderboard_rewards;
   ```

---

## 🎉 Готово!

Твоя система автоматического распределения призов настроена и будет работать каждое воскресенье!

**Не забудь:**
- Настроить GitHub Actions для вызова Edge Function
- Проверить логи после первого выполнения
- Протестировать на тестовом сезоне

