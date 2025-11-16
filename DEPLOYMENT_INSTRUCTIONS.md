# Инструкции по деплою системы наград

## ✅ Этап 1: Удаление дубликатов конфигурации

Выполни в Supabase SQL Editor следующий SQL:

```sql
-- Удаляем дубликаты конфигурации, оставляем только самую новую
DELETE FROM reward_config 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY key, season_id ORDER BY effective_from DESC, revision DESC) as rn
    FROM reward_config
    WHERE key = 'test_rewards' AND season_id IS NULL
  ) t
  WHERE rn > 1
);

-- Проверяем результат (должна остаться только одна запись)
SELECT id, key, revision, effective_from, is_active 
FROM reward_config 
WHERE key = 'test_rewards' 
ORDER BY effective_from DESC;
```

**Ожидаемый результат:** Должна остаться только одна запись с `id: 3` (или самая новая).

---

## ✅ Этап 2: Деплой Edge Function

Выполни в терминале:

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase functions deploy complete-test-and-award
```

**Проверка деплоя:**
После деплоя проверь в Supabase Dashboard → Edge Functions, что функция `complete-test-and-award` появилась и активна.

---

## ✅ Этап 3: Тестирование системы

### Тест 1: Базовое начисление наград

1. Пройди любой тест (practice, sequential, или exam mode)
2. Заверши тест с результатом (например, 80% правильных ответов)
3. Проверь:
   - ✅ На странице результатов отображаются монеты и SP
   - ✅ Toast-уведомление показывает награды
   - ✅ В таблице `test_results` появилась запись
   - ✅ В таблице `profiles` обновились `coins`
   - ✅ В таблице `user_season_progress` обновился `sp_earned`

### Тест 2: Идемпотентность (защита от дублей)

1. Пройди тест
2. Открой DevTools → Network
3. Найди запрос к `complete-test-and-award`
4. Скопируй `session_id` из запроса
5. Вручную вызови функцию с тем же `session_id`:
   ```sql
   SELECT * FROM supabase.functions.invoke('complete-test-and-award', '{
     "user_id": "твой_user_id",
     "session_id": "скопированный_session_id",
     "score": 80,
     "questions_count": 10,
     "correct_count": 8,
     "test_duration_seconds": 300,
     "premium_flag": false,
     "double_sp_active": false
   }');
   ```
6. Проверь:
   - ✅ Награды НЕ начислились повторно
   - ✅ В `test_results` только одна запись с этим `session_id`

### Тест 3: Анти-абуз система

1. Пройди несколько тестов очень быстро (менее 60 секунд каждый)
2. Сделай низкий score (менее 40%)
3. Проверь:
   - ✅ Награды снижены (штраф применен)
   - ✅ В `test_results` поле `abuse_penalty` < 1.0
   - ✅ В `test_results` поле `diminishing_factor` может быть < 1.0

### Тест 4: Diminishing Returns

1. Пройди более 25 тестов за один день
2. Проверь:
   - ✅ После 25-го теста награды начинают снижаться
   - ✅ Toast-уведомление показывает сообщение о снижении
   - ✅ В `test_results` поле `diminishing_factor` < 1.0

### Тест 5: Premium бонусы

1. Активируй Premium (если есть)
2. Пройди тест
3. Проверь:
   - ✅ Монеты умножены на 1.5x
   - ✅ SP умножены на 1.2x
   - ✅ В `test_results` поле `premium_used = true`

### Тест 6: Double SP Boost

1. Активируй Double SP boost (если есть)
2. Пройди тест
3. Проверь:
   - ✅ SP умножены на 2x
   - ✅ В `test_results` поле `double_sp_used = true`

---

## 📊 Проверка данных в БД

После тестирования проверь данные:

```sql
-- Последние результаты тестов
SELECT 
  id,
  user_id,
  score,
  questions_count,
  correct_count,
  coins_awarded,
  sp_awarded,
  abuse_penalty,
  diminishing_factor,
  premium_used,
  double_sp_used,
  created_at
FROM test_results
ORDER BY created_at DESC
LIMIT 10;

-- Проверка транзакций
SELECT 
  id,
  user_id,
  amount,
  type,
  source_type,
  metadata,
  created_at
FROM transactions
WHERE source_type = 'test_completed'
ORDER BY created_at DESC
LIMIT 10;

-- Проверка конфигурации
SELECT 
  id,
  key,
  revision,
  is_active,
  effective_from,
  value->>'baseCoins' as base_coins,
  value->>'baseSP' as base_sp
FROM reward_config
WHERE key = 'test_rewards';
```

---

## 🐛 Возможные проблемы

### Проблема: Edge Function не деплоится
**Решение:** 
- Проверь, что Supabase CLI установлен: `supabase --version`
- Проверь, что ты залогинен: `supabase login`
- Проверь, что проект связан: `supabase link`

### Проблема: Награды не начисляются
**Решение:**
- Проверь логи Edge Function в Supabase Dashboard
- Проверь RLS политики на таблицах `profiles`, `user_season_progress`, `transactions`
- Проверь, что конфигурация активна: `SELECT * FROM reward_config WHERE key = 'test_rewards' AND is_active = true`

### Проблема: Идемпотентность не работает
**Решение:**
- Проверь, что `session_id` уникален и передается корректно
- Проверь, что в таблице `test_results` есть UNIQUE constraint на `session_id`

---

## ✅ Чеклист готовности

- [ ] Дубликаты конфигурации удалены
- [ ] Edge Function задеплоена
- [ ] Базовое начисление работает
- [ ] Идемпотентность работает
- [ ] Анти-абуз система работает
- [ ] Diminishing returns работает
- [ ] Premium бонусы работают
- [ ] Double SP boost работает
- [ ] Данные корректно записываются в БД

---

**После выполнения всех этапов система наград готова к продакшену! 🚀**

