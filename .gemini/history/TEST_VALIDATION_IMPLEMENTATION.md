# 🧪 Реализация валидации тестов (Неделя 1)

## ✅ Что было реализовано

### 1. Таблица `test_sessions`
- ✅ Создана таблица для хранения начала тестовых сессий
- ✅ Поля: `session_id`, `user_id`, `test_id`, `questions_count`, `mode`, `started_at` (серверное UTC время), `status`
- ✅ Индексы для быстрого поиска
- ✅ RLS политики для безопасности

### 2. Edge Function `start-test-session`
- ✅ Создает запись в `test_sessions` при старте теста
- ✅ Использует серверное UTC время (не клиентское!)
- ✅ Идемпотентность: если сессия уже существует - возвращает существующую
- ✅ Валидация входных данных

### 3. Обновление `complete-test-and-award`
- ✅ Проверка существования сессии в `test_sessions`
- ✅ Валидация минимального времени прохождения: `questions_count * 3 секунды`
- ✅ Блокировка наград при нарушении (слишком быстрое прохождение)
- ✅ Проверка разницы между reported time и actual time
- ✅ Обновление статуса сессии на 'completed' после успешного завершения

### 4. Клиентский код (`TestSession.tsx`)
- ✅ Вызов `start-test-session` Edge Function при загрузке вопросов
- ✅ Обработка offline режима (не блокирует тест)
- ✅ Использование `testSessionStartedRef` для предотвращения повторных вызовов

### 5. Автоматическая очистка (pg_cron)
- ✅ Настроена ежедневная очистка незавершенных сессий старше 24 часов
- ✅ Очистка abandoned сессий старше 7 дней
- ✅ Запуск в 03:00 UTC каждый день

## 🔒 Безопасность

### Защита от читеров:
1. **Серверное время**: `started_at` устанавливается на сервере, нельзя подделать
2. **Минимальное время**: Тест из 30 вопросов должен занять минимум 90 секунд (3 сек/вопрос)
3. **Проверка сессии**: Тест должен быть начат через Edge Function, нельзя просто отправить результаты
4. **Валидация времени**: Проверяется разница между reported time и actual time

### Формула валидации:
```typescript
const MIN_TIME_PER_QUESTION = 3; // секунд
const minRequiredTime = questions_count * MIN_TIME_PER_QUESTION;

if (reportedTime < minRequiredTime) {
  // Блокируем награды
  return { coins_awarded: 0, sp_awarded: 0, validation_failed: true };
}
```

## 📋 Миграции

1. **`20250101000000_create_test_sessions_table.sql`**
   - Создание таблицы `test_sessions`
   - Индексы и RLS политики

2. **`20250101000001_setup_test_sessions_cleanup.sql`**
   - Настройка pg_cron для автоматической очистки

## 🧪 Тестирование

### Проверка базового функционала:
- [ ] Тест начинается через `start-test-session`
- [ ] Запись создается в `test_sessions` с серверным временем
- [ ] При завершении теста проверяется время
- [ ] Награды блокируются при слишком быстром прохождении
- [ ] Статус обновляется на 'completed' после успешного завершения

### Проверка безопасности:
- [ ] Нельзя завершить тест без начала через Edge Function
- [ ] Нельзя подделать время (серверное время используется)
- [ ] Минимальное время прохождения работает корректно
- [ ] Разница между reported и actual time отслеживается

### Проверка edge cases:
- [ ] Offline режим (не блокирует тест)
- [ ] Повторный вызов `start-test-session` (идемпотентность)
- [ ] Очистка старых сессий через pg_cron

## 🚀 Деплой

### 1. Применить миграции:
```bash
# В Supabase Dashboard → SQL Editor
# Применить миграции в порядке:
# 1. 20250101000000_create_test_sessions_table.sql
# 2. 20250101000001_setup_test_sessions_cleanup.sql
```

### 2. Задеплоить Edge Functions:
```bash
# start-test-session
supabase functions deploy start-test-session

# complete-test-and-award (обновленная версия)
supabase functions deploy complete-test-and-award
```

### 3. Проверить pg_cron:
```sql
-- Проверить что задача создана
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-test-sessions';

-- Проверить логи выполнения
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-test-sessions')
ORDER BY start_time DESC LIMIT 10;
```

## ⚠️ Важные замечания

1. **Минимальное время**: 3 секунды на вопрос - это консервативная оценка. Можно настроить в Edge Function.

2. **Offline режим**: В offline режиме `start-test-session` не вызывается, но тест продолжает работать. При синхронизации нужно будет обработать это.

3. **Производительность**: Добавление записи в `test_sessions` при старте теста - это дополнительный запрос, но он критически важен для безопасности.

4. **Очистка**: pg_cron будет автоматически очищать старые сессии, но можно вручную запустить очистку:
```sql
DELETE FROM public.test_sessions
WHERE status = 'started' AND started_at < NOW() - INTERVAL '24 hours';
```

## 📝 Следующие шаги

1. ✅ Daily Bonus - завершено
2. ✅ Test Validation - завершено
3. ⏳ Payments E2E - следующий шаг
4. ⏳ DB Cleanup - следующий шаг

