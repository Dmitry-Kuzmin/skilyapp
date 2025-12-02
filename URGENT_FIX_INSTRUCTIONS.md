# 🚨 СРОЧНЫЕ ИНСТРУКЦИИ ПО ИСПРАВЛЕНИЮ

## Проблема
Edge Function `complete-test-and-award` падает с **500 Internal Server Error**

## ✅ Что уже исправлено в коде
1. ✅ Логика прохождения теста (80% минимум)
2. ✅ Fallback для наград при ошибке
3. ✅ Обработка offline режима
4. ✅ Инвалидация кэша dashboard
5. ✅ Убраны проблемные уведомления test_result
6. ✅ Код задеплоен в Vercel

## ❌ Что НУЖНО СДЕЛАТЬ В БАЗЕ ДАННЫХ

### Шаг 1: Диагностика (ОБЯЗАТЕЛЬНО!)
Сначала нужно понять, что именно не работает:

```
1. Открыть: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Скопировать весь файл: CHECK_REWARDS_ERROR.sql
3. Нажать "Run" (или Ctrl+Enter)
4. Посмотреть результаты - там будет финальный вердикт
```

**Возможные результаты:**

#### ❌ Вердикт: "Таблица reward_config не существует"
**Решение:** Нужно применить оригинальную миграцию:
```sql
-- Открыть файл: supabase/migrations/20251119000000_create_test_rewards_system.sql
-- Скопировать весь контент
-- Выполнить в SQL Editor
```

#### ❌ Вердикт: "Нет активной конфигурации test_rewards"
**Решение:** Выполнить `FIX_REWARDS_SYSTEM.sql` (инструкция ниже)

#### ❌ Вердикт: "Функция get_active_reward_config возвращает NULL"
**Решение:** Проблема с search_path, выполнить `FIX_REWARDS_SYSTEM.sql`

#### ✅ Вердикт: "Все проверки пройдены"
**Если все проверки пройдены, но ошибка все еще есть:**
- Проверить логи Edge Function: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/complete-test-and-award/logs
- Посмотреть детали ошибки в логах

---

### Шаг 2: Применение исправлений

**Если диагностика показала проблему, выполнить:**

```sql
-- 1. Открыть: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- 2. Скопировать ВЕСЬ файл FIX_REWARDS_SYSTEM.sql
-- 3. Нажать "Run"
-- 4. Дождаться выполнения всех команд
```

**Ожидаемый результат:**
```
✅ Создана дефолтная конфигурация test_rewards
✅ Таблица test_results существует
✅ РАБОТАЕТ (тест get_active_reward_config)
```

---

### Шаг 3: Проверка работы

После применения SQL скрипта:

1. **Подождать 2-3 минуты** (чтобы Edge Function перезапустилась)

2. **Открыть приложение в Telegram**

3. **Пройти тест** (любой, хотя бы 3-5 вопросов)

4. **Проверить результаты:**
   - ✅ Награды должны начислиться
   - ✅ Не должно быть ошибки "Награды будут начислены позже"
   - ✅ Статистика должна обновиться

5. **Если все еще ошибка:**
   - Открыть DevTools (F12) в браузере
   - Посмотреть Console
   - Скопировать ошибку из `[TestSession] Error awarding test:`
   - Проверить логи Edge Function

---

## 📊 Проверка логов Edge Function

Если после применения SQL все еще ошибка:

1. Открыть: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/complete-test-and-award

2. Перейти на вкладку "Logs"

3. Искать последние ошибки (красные строки)

4. Посмотреть детали:
   - `Config error` - проблема с reward_config
   - `Coins update error` - проблема с increment_profile_value
   - `Insert error` - проблема с вставкой в test_results
   - `SP update error` - проблема с season-sp функцией

---

## 🔍 Возможные дополнительные проблемы

### Если функция increment_profile_value не существует:

```sql
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_column NOT IN ('coins', 'xp', 'duel_pass_sp') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column;
  END IF;
  
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  ) USING p_amount, p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;
END;
$$;
```

### Если таблица test_results не существует:

Нужно применить полную миграцию:
```
supabase/migrations/20251119000000_create_test_rewards_system.sql
```

---

## 📝 Краткая версия (TL;DR)

```bash
# 1. Диагностика
Выполнить: CHECK_REWARDS_ERROR.sql
Посмотреть вердикт

# 2. Исправление
Выполнить: FIX_REWARDS_SYSTEM.sql

# 3. Проверка
Пройти тест в Telegram App
Проверить что награды начисляются

# 4. Если не помогло
Посмотреть логи Edge Function
Скопировать ошибку и отправить разработчику
```

---

## ✅ Контрольный список

- [ ] Выполнен CHECK_REWARDS_ERROR.sql
- [ ] Посмотрен финальный вердикт
- [ ] Выполнен FIX_REWARDS_SYSTEM.sql (если нужно)
- [ ] Подождано 2-3 минуты
- [ ] Пройден тест в Telegram App
- [ ] Награды начисляются корректно
- [ ] Статистика обновляется на dashboard
- [ ] Нет ошибок в Console

---

## 🆘 Если ничего не помогло

1. Скопировать полный вывод `CHECK_REWARDS_ERROR.sql`
2. Скопировать ошибку из Console (DevTools)
3. Скопировать последние логи Edge Function
4. Отправить все это разработчику

Логи находятся здесь:
- Edge Function: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/complete-test-and-award/logs
- Supabase Logs: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/logs/explorer

---

## 📞 Важно!

**БЕЗ ПРИМЕНЕНИЯ SQL СКРИПТОВ НАГРАДЫ НЕ БУДУТ РАБОТАТЬ!**

Код исправлен и задеплоен, но база данных требует обновления.

