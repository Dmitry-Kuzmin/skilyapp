# 🕐 Руководство по настройке pg_cron для призов лидерборда

## ✅ Результат `schedule 1` — что это значит?

Когда ты выполнил:
```sql
SELECT cron.schedule(
  'daily-season-rewards-check',
  '0 0 * * *',
  $$
  SELECT mark_season_for_rewards_distribution();
  $$
);
```

И получил результат `schedule 1` — это означает:
- ✅ **Задача успешно создана!**
- `1` — это ID задачи в pg_cron
- Задача будет выполняться каждый день в полночь UTC (00:00)

---

## 📋 Проверка созданных задач

### Посмотреть все задачи:
```sql
SELECT * FROM cron.job;
```

Результат покажет:
- `jobid` — ID задачи (у тебя это 1)
- `schedule` — расписание (cron expression)
- `command` — команда для выполнения
- `nodename` — узел выполнения
- `nodeport` — порт
- `database` — база данных
- `username` — пользователь
- `active` — активна ли задача (true/false)
- `jobname` — имя задачи ('daily-season-rewards-check')

### Посмотреть историю выполнения:
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

Это покажет:
- Когда задача выполнялась
- Статус выполнения (success/failed)
- Сообщения об ошибках (если были)

---

## 🔍 Проверка работы задачи

### 1. Проверь, что задача активна:
```sql
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE jobname = 'daily-season-rewards-check';
```

Должно показать:
- `active = true`
- `schedule = '0 0 * * *'`
- `command` с твоей функцией

### 2. Проверь логи выполнения:
```sql
SELECT * FROM cron_job_logs 
WHERE job_name = 'mark_season_for_rewards'
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Проверь завершившиеся сезоны:
```sql
SELECT * FROM process_ended_seasons();
```

---

## ⚙️ Управление задачами

### Удалить задачу:
```sql
SELECT cron.unschedule('daily-season-rewards-check');
-- или по ID:
SELECT cron.unschedule(1);
```

### Изменить расписание:
Сначала удали старую задачу, затем создай новую с другим расписанием:
```sql
-- Удалить
SELECT cron.unschedule('daily-season-rewards-check');

-- Создать с новым расписанием (каждые 6 часов)
SELECT cron.schedule(
  'daily-season-rewards-check',
  '0 */6 * * *', -- Каждые 6 часов
  $$
  SELECT mark_season_for_rewards_distribution();
  $$
);
```

### Временно отключить задачу:
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'daily-season-rewards-check';
```

### Включить задачу обратно:
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'daily-season-rewards-check';
```

---

## 📅 Примеры расписаний

| Расписание | Описание |
|------------|----------|
| `'0 0 * * *'` | Каждый день в полночь UTC |
| `'0 */6 * * *'` | Каждые 6 часов |
| `'0 0 * * 0'` | Каждое воскресенье в полночь |
| `'0 0 1 * *'` | Первое число каждого месяца |
| `'*/30 * * * *'` | Каждые 30 минут |

---

## 🚨 Важные моменты

1. **Время выполнения**: Задача выполняется в UTC, учитывай разницу с локальным временем
2. **Проверка работы**: После первого выполнения проверь логи в `cron_job_logs`
3. **Edge Function**: Функция `mark_season_for_rewards_distribution()` только логирует сезоны. Нужно дополнительно вызывать Edge Function `season-end-rewards` для начисления призов
4. **Мониторинг**: Регулярно проверяй `cron.job_run_details` на наличие ошибок

---

## 🔄 Полный цикл работы

1. **pg_cron** запускает `mark_season_for_rewards_distribution()` каждый день
2. Функция находит завершившиеся сезоны и логирует их в `cron_job_logs`
3. **Внешний cron** (или ручной вызов) читает логи и вызывает Edge Function `season-end-rewards`
4. Edge Function начисляет призы игрокам

**Альтернатива**: Можно настроить внешний cron, который напрямую вызывает Edge Function без промежуточного логирования.

---

## ✅ Текущий статус

Твоя задача создана и будет выполняться каждый день в полночь UTC. 

**Следующие шаги:**
1. Дождись первого выполнения (или протестируй вручную)
2. Проверь логи в `cron_job_logs`
3. Настрой внешний cron для вызова Edge Function `season-end-rewards` (см. `LEADERBOARD_REWARDS_CRON_SETUP.md`)

