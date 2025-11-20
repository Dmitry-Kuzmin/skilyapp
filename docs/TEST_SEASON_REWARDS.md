# 🧪 Тестирование системы распределения призов

## ✅ Текущий статус

Результат `manual_check_seasons()`:
```json
{
  "message": "No seasons to process",
  "success": true,
  "timestamp": "2025-11-20T19:35:08.226862+00:00",
  "seasons_found": 0
}
```

**Это означает:**
- ✅ Функция работает корректно
- ✅ Нет завершившихся сезонов, требующих обработки
- ✅ Все завершившиеся сезоны уже обработаны (или их нет)

---

## 📊 Проверка текущих сезонов

### 1. Посмотри все сезоны

```sql
SELECT 
  id,
  season_number,
  name_ru,
  start_date,
  end_date,
  is_active,
  CASE 
    WHEN end_date > NOW() THEN '🟢 Активен'
    WHEN end_date <= NOW() AND is_active = true THEN '🟡 Завершён (не обработан)'
    WHEN end_date <= NOW() AND is_active = false THEN '🔴 Завершён (обработан)'
    ELSE '⚪ Неактивен'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_leaderboard_rewards 
      WHERE season_id = duel_pass_seasons.id 
      LIMIT 1
    ) THEN '✅ Призы распределены'
    ELSE '⏳ Призы не распределены'
  END as rewards_status
FROM duel_pass_seasons
ORDER BY season_number DESC;
```

### 2. Проверь завершившиеся сезоны

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
    ) THEN '✅ Призы распределены'
    ELSE '⏳ Требует обработки'
  END as rewards_status
FROM duel_pass_seasons
WHERE end_date <= NOW()
ORDER BY end_date DESC;
```

### 3. Проверь начисленные призы

```sql
SELECT 
  ulr.id,
  ulr.user_id,
  ulr.season_id,
  ulr.position,
  ulr.reward_type,
  ulr.reward_data,
  ulr.created_at,
  s.season_number,
  s.name_ru as season_name
FROM user_leaderboard_rewards ulr
JOIN duel_pass_seasons s ON s.id = ulr.season_id
ORDER BY ulr.created_at DESC
LIMIT 20;
```

---

## 🧪 Тестирование системы

### Вариант 1: Тест с существующим сезоном

Если у тебя есть активный сезон, можно временно изменить его `end_date` для теста:

```sql
-- 1. Найди активный сезон
SELECT id, season_number, name_ru, end_date 
FROM duel_pass_seasons 
WHERE is_active = true 
ORDER BY season_number DESC 
LIMIT 1;

-- 2. Временно измени end_date на прошлое (для теста)
-- ВАЖНО: Запиши оригинальную дату!
UPDATE duel_pass_seasons 
SET end_date = NOW() - INTERVAL '1 day'
WHERE id = 1; -- Замени на ID твоего сезона

-- 3. Проверь функцию
SELECT manual_check_seasons();

-- 4. Восстанови оригинальную дату
UPDATE duel_pass_seasons 
SET end_date = '2025-12-20 00:00:00+00' -- Замени на оригинальную дату
WHERE id = 1;
```

### Вариант 2: Создай тестовый сезон

```sql
-- 1. Создай тестовый сезон, который уже завершился
INSERT INTO duel_pass_seasons (
  season_number,
  name_ru,
  name_es,
  name_en,
  theme,
  start_date,
  end_date,
  is_active,
  description_ru
) VALUES (
  999, -- Тестовый номер
  'Тестовый сезон',
  'Temporada de prueba',
  'Test Season',
  'special',
  NOW() - INTERVAL '35 days', -- Начался 35 дней назад
  NOW() - INTERVAL '5 days',  -- Завершился 5 дней назад
  true,
  'Тестовый сезон для проверки системы призов'
);

-- 2. Проверь функцию
SELECT manual_check_seasons();

-- 3. Посмотри логи
SELECT * FROM cron_job_logs 
WHERE job_name = 'check_and_log_ended_seasons'
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Удали тестовый сезон после проверки
DELETE FROM duel_pass_seasons WHERE season_number = 999;
```

### Вариант 3: Ручной вызов Edge Function

```sql
-- 1. Найди завершившийся сезон
SELECT id, season_number, name_ru 
FROM duel_pass_seasons 
WHERE end_date <= NOW() 
  AND is_active = true
ORDER BY end_date DESC 
LIMIT 1;

-- 2. Вызови Edge Function вручную через Supabase Dashboard:
-- Edge Functions → season-end-rewards → Invoke
-- Body: {"season_id": 1} -- Замени на ID сезона
```

---

## ✅ Проверка работы cron задачи

### 1. Проверь, что задача активна

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'weekly-season-rewards-check';
```

### 2. Посмотри историю выполнения

```sql
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details 
WHERE jobid = 3 -- Замени на ID твоей задачи
ORDER BY start_time DESC 
LIMIT 10;
```

### 3. Проверь логи после выполнения

```sql
SELECT 
  id,
  job_name,
  status,
  result_data,
  created_at
FROM cron_job_logs 
WHERE job_name = 'check_and_log_ended_seasons'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🎯 Что делать дальше

### Если нет завершившихся сезонов:

1. ✅ **Система работает корректно** — просто нет сезонов для обработки
2. ⏳ **Дождись окончания текущего сезона** — тогда функция найдёт его
3. 🧪 **Протестируй на тестовом сезоне** (см. выше)

### Если есть завершившиеся сезоны:

1. ✅ **Проверь логи** — функция должна их залогировать
2. 🚀 **Вызови Edge Function** — вручную или через GitHub Actions
3. ✅ **Проверь призы** — убедись, что они начислены

---

## 📋 Чеклист проверки

- [ ] Функция `manual_check_seasons()` работает
- [ ] pg_cron задача создана и активна
- [ ] GitHub Actions настроен (если используется)
- [ ] Edge Function `season-end-rewards` задеплоена
- [ ] Призы для сезона настроены в `leaderboard_season_rewards`
- [ ] Косметика для призов создана в `skin_definitions`, `badge_definitions`

---

## 🐛 Troubleshooting

### Функция не находит сезоны

**Проверь:**
1. Есть ли завершившиеся сезоны: `SELECT * FROM duel_pass_seasons WHERE end_date <= NOW();`
2. Активны ли они: `SELECT * FROM duel_pass_seasons WHERE end_date <= NOW() AND is_active = true;`
3. Уже ли распределены призы: `SELECT * FROM user_leaderboard_rewards;`

### Cron задача не выполняется

**Проверь:**
1. Активна ли задача: `SELECT active FROM cron.job WHERE jobid = 3;`
2. История выполнения: `SELECT * FROM cron.job_run_details WHERE jobid = 3;`
3. Логи ошибок в `return_message`

---

## ✅ Готово!

Система настроена и работает. Когда сезон завершится, функция автоматически найдёт его и залогирует для обработки.

