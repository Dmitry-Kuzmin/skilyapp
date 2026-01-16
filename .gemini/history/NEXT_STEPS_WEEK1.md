# 🚀 Следующие шаги (Неделя 1)

## ✅ Что уже сделано

1. ✅ **Daily Bonus** - Edge Function с серверным UTC временем и идемпотентностью
2. ✅ **Test Validation** - Валидация времени прохождения теста
3. ✅ **Security Fix** - Исправлена критическая уязвимость в RLS политиках

## 📋 Чеклист для завершения Недели 1

### 1. Задеплоить Edge Functions

#### A. `claim-daily-bonus`
```bash
supabase functions deploy claim-daily-bonus
```

#### B. `start-test-session` (новая функция)
```bash
supabase functions deploy start-test-session
```

#### C. `complete-test-and-award` (обновленная)
```bash
supabase functions deploy complete-test-and-award
```

**Проверка:** После деплоя проверьте логи в Supabase Dashboard → Edge Functions → Logs

---

### 2. Протестировать Daily Bonus

#### Тест 1: Базовый функционал
- [ ] Открыть Dashboard
- [ ] Нажать "Получить награду"
- [ ] Проверить что награда начислена (XP, монеты)
- [ ] Проверить что streak увеличился

#### Тест 2: Идемпотентность
- [ ] Получить награду
- [ ] Сразу нажать "Получить награду" еще раз
- [ ] Проверить что награда НЕ начислена повторно
- [ ] Проверить сообщение "Уже получено"

#### Тест 3: UTC время
- [ ] Получить награду сегодня
- [ ] Подождать до следующего дня (по UTC)
- [ ] Проверить что можно получить награду снова

#### Тест 4: Streak
- [ ] Получить награду в первый день (streak = 1)
- [ ] Получить награду на следующий день (streak = 2)
- [ ] Пропустить день
- [ ] Проверить что streak сбросился на 1

**Проверка в БД:**
```sql
-- Проверить последнюю запись
SELECT * FROM user_daily_bonus 
WHERE user_id = 'ваш-user-id' 
ORDER BY last_claimed_date DESC LIMIT 1;

-- Проверить что награды начислены
SELECT xp, coins FROM profiles WHERE id = 'ваш-user-id';
```

---

### 3. Протестировать Test Validation

#### Тест 1: Нормальное прохождение
- [ ] Начать тест (любой режим)
- [ ] Пройти тест нормально (не торопиться)
- [ ] Завершить тест
- [ ] Проверить что награды начислены

#### Тест 2: Слишком быстрое прохождение
- [ ] Начать тест
- [ ] Завершить тест очень быстро (< 3 сек на вопрос)
- [ ] Проверить что награды НЕ начислены (0 монет, 0 SP)
- [ ] Проверить сообщение об ошибке

#### Тест 3: Проверка сессии
- [ ] Попробовать завершить тест БЕЗ начала (через API напрямую)
- [ ] Проверить что запрос отклонен с ошибкой "Test session not found"

**Проверка в БД:**
```sql
-- Проверить что сессия создана
SELECT * FROM test_sessions 
WHERE user_id = 'ваш-user-id' 
ORDER BY started_at DESC LIMIT 1;

-- Проверить результаты теста
SELECT * FROM test_results 
WHERE user_id = 'ваш-user-id' 
ORDER BY created_at DESC LIMIT 1;
```

---

### 4. Проверить автоматическую очистку (pg_cron)

#### Проверка что cron задача создана:
```sql
SELECT * FROM cron.job 
WHERE jobname = 'cleanup-abandoned-sessions';
```

#### Проверка логов выполнения:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'cleanup-abandoned-sessions'
)
ORDER BY start_time DESC LIMIT 10;
```

#### Ручная проверка (можно запустить вручную):
```sql
-- Проверить сколько сессий будет удалено
SELECT COUNT(*) FROM test_sessions
WHERE status = 'started'
AND started_at < NOW() - INTERVAL '24 hours';

-- Запустить очистку вручную (для теста)
DELETE FROM test_sessions
WHERE status = 'started'
AND started_at < NOW() - INTERVAL '24 hours';
```

---

### 5. Проверить безопасность

#### Тест 1: Клиент не может создать сессию
В браузерной консоли (DevTools):
```javascript
const { supabase } = await import('@/integrations/supabase/client');

// Это должно вернуть ошибку 403
const { error } = await supabase
  .from('test_sessions')
  .insert({
    session_id: 'test-hack',
    user_id: 'ваш-user-id',
    questions_count: 10,
    mode: 'practice'
  });

console.log('Error code:', error?.code); // Должно быть '42501'
```

#### Тест 2: Edge Function может создать сессию
- [ ] Начать тест через UI
- [ ] Проверить что сессия создана в БД
- [ ] Проверить что `started_at` установлен сервером (не клиентом)

---

## 🐛 Если что-то не работает

### Проблема: Daily Bonus не работает
1. Проверить логи Edge Function: `claim-daily-bonus` → Logs
2. Проверить что функция задеплоена
3. Проверить что `user_daily_bonus` таблица существует
4. Проверить что RPC функция `increment_profile_value` существует

### Проблема: Test Validation не работает
1. Проверить логи Edge Function: `start-test-session` → Logs
2. Проверить логи Edge Function: `complete-test-and-award` → Logs
3. Проверить что `test_sessions` таблица существует
4. Проверить что RLS политики правильные (только SELECT)

### Проблема: Клиент может создавать сессии
1. Проверить что политики INSERT/UPDATE удалены:
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'test_sessions';
```
2. Должна быть только одна политика: `Users can view own test sessions` (SELECT)

---

## 📝 Следующие задачи (Неделя 1)

После успешного тестирования:

1. ⏳ **Payments E2E** - Написать E2E тесты для платежных потоков
2. ⏳ **DB Cleanup** - Настроить очистку старых данных (если еще не сделано)

---

## ✅ Критерии успеха

- [ ] Daily Bonus работает корректно
- [ ] Test Validation блокирует читеров
- [ ] Клиенты не могут обойти защиту
- [ ] Edge Functions задеплоены и работают
- [ ] Автоматическая очистка настроена
- [ ] Все тесты пройдены

---

## 🎯 Приоритеты

1. **Высокий:** Задеплоить Edge Functions
2. **Высокий:** Протестировать Daily Bonus
3. **Высокий:** Протестировать Test Validation
4. **Средний:** Проверить безопасность
5. **Низкий:** Проверить автоматическую очистку

