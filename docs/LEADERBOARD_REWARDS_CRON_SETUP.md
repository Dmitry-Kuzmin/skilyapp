# 🕐 Настройка автоматического начисления призов лидерборда

## Варианты настройки

### Вариант 1: Supabase pg_cron (рекомендуется, если доступно)

1. **Включи расширение pg_cron** (если ещё не включено):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Настрой cron задачу** через SQL Editor в Supabase Dashboard:
   ```sql
   SELECT cron.schedule(
     'daily-season-rewards-check',
     '0 0 * * *', -- Каждый день в полночь UTC
     $$
     SELECT mark_season_for_rewards_distribution();
     $$
   );
   ```

3. **Проверь расписание**:
   ```sql
   SELECT * FROM cron.job;
   ```

4. **Удали задачу** (если нужно):
   ```sql
   SELECT cron.unschedule('daily-season-rewards-check');
   ```

### Вариант 2: Внешний Cron (GitHub Actions, Vercel Cron, или другой сервис)

Создай cron job, который будет вызывать Edge Function:

**Пример для GitHub Actions** (`.github/workflows/season-rewards.yml`):
```yaml
name: Season Rewards Distribution

on:
  schedule:
    - cron: '0 0 * * *' # Каждый день в полночь UTC
  workflow_dispatch: # Ручной запуск

jobs:
  distribute-rewards:
    runs-on: ubuntu-latest
    steps:
      - name: Call Season End Rewards
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/season-end-rewards" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"season_id": null}' # null = обработает все завершившиеся сезоны
```

**Пример для Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/season-rewards",
    "schedule": "0 0 * * *"
  }]
}
```

### Вариант 3: Ручной запуск через Supabase Dashboard

1. Перейди в **Supabase Dashboard** → **Edge Functions**
2. Найди функцию `season-end-rewards`
3. Нажми **Invoke** и передай JSON:
   ```json
   {
     "season_id": 1
   }
   ```

### Вариант 4: Автоматический триггер при завершении сезона

Когда сезон завершается (обновляется `is_active = false`), триггер автоматически логирует событие.

Затем можно:
- Вручную вызвать Edge Function
- Или настроить внешний сервис, который читает логи и вызывает функцию

## Проверка работы

### 1. Проверь завершившиеся сезоны:
```sql
SELECT * FROM process_ended_seasons();
```

### 2. Проверь логи cron задач:
```sql
SELECT * FROM cron_job_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Проверь, начислены ли призы:
```sql
SELECT 
  ulr.*,
  s.name_ru as season_name
FROM user_leaderboard_rewards ulr
JOIN duel_pass_seasons s ON s.id = ulr.season_id
ORDER BY ulr.created_at DESC;
```

## Рекомендации

1. **Тестирование**: Сначала протестируй на тестовом сезоне
2. **Мониторинг**: Регулярно проверяй логи `cron_job_logs`
3. **Резервный вариант**: Настрой уведомления на случай ошибок
4. **Время запуска**: Запускай в неактивное время (например, 00:00 UTC)

## Troubleshooting

### pg_cron не работает
- Проверь, включено ли расширение: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- В некоторых планах Supabase pg_cron недоступен
- Используй внешний cron (Вариант 2)

### Edge Function не вызывается
- Проверь правильность URL и ключей
- Проверь логи Edge Function в Supabase Dashboard
- Убедись, что функция задеплоена

### Призы не начисляются
- Проверь, что сезон действительно завершился (`end_date <= NOW()`)
- Проверь, что есть игроки в топ-10
- Проверь логи в `cron_job_logs`

