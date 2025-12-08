# ⚛️ Неделя 2: Атомарные операции для критических полей

## 🎯 Цель

Заменить все неатомарные обновления `coins`, `xp`, `sp` на атомарные операции через RPC функцию `increment_profile_value`.

**Почему это важно:**
- Решает 90% проблем синхронизации при offline-first архитектуре
- Защищает от конфликтов при параллельных запросах
- Предотвращает потерю данных при конфликтах write-after-write

---

## ✅ Что уже есть

### RPC функция `increment_profile_value`
- ✅ Уже создана в миграции `20251101131602_d8cf8664-04d8-4a5d-948d-29c88e3fa432.sql`
- ✅ Поддерживает отрицательные значения (для списания)
- ✅ Проверяет что coins не станет отрицательным
- ✅ Используется в Edge Functions (`complete-test-and-award`, `coins-spend`, `process-purchase`)

---

## 🔍 Найденные проблемы

### 1. `src/pages/DailyBonus.tsx` (строка 230)
**Проблема:**
```typescript
const newCoins = userCoins - 10;
await supabase
  .from('profiles')
  .update({ coins: newCoins }) // ❌ Неатомарно!
  .eq('id', profileId);
```

**Решение:**
```typescript
await supabase.rpc('increment_profile_value', {
  p_profile_id: profileId,
  p_column: 'coins',
  p_amount: -10 // Отрицательное значение для списания
});
```

---

## 📋 План исправлений

### Приоритет 1: Критические места (клиентский код)
- [ ] `src/pages/DailyBonus.tsx` - заменить прямое обновление coins

### Приоритет 2: Проверка Edge Functions
- [x] `complete-test-and-award` - уже использует `increment_profile_value` ✅
- [x] `coins-spend` - уже использует `increment_profile_value` ✅
- [x] `process-purchase` - уже использует `increment_profile_value` ✅
- [x] `purchase-webhook` - уже использует `increment_profile_value` ✅
- [ ] Проверить другие Edge Functions на наличие прямых обновлений

### Приоритет 3: Проверка других полей
- [ ] Проверить обновления `xp` (если есть)
- [ ] Проверить обновления `sp` (если есть)
- [ ] Проверить обновления других критических полей

---

## 🛠 Реализация

### Шаг 1: Исправить DailyBonus.tsx

Заменить прямое обновление на атомарную операцию.

### Шаг 2: Проверить все Edge Functions

Убедиться что все используют `increment_profile_value` для coins, xp, sp.

### Шаг 3: Создать дополнительные RPC функции (если нужно)

Если нужно обновлять несколько полей одновременно:
```sql
CREATE OR REPLACE FUNCTION increment_profile_values(
  p_profile_id UUID,
  p_coins INTEGER DEFAULT 0,
  p_xp INTEGER DEFAULT 0,
  p_sp INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  IF p_coins != 0 THEN
    PERFORM increment_profile_value(p_profile_id, 'coins', p_coins);
  END IF;
  IF p_xp != 0 THEN
    PERFORM increment_profile_value(p_profile_id, 'xp', p_xp);
  END IF;
  IF p_sp != 0 THEN
    PERFORM increment_profile_value(p_profile_id, 'sp', p_sp);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ Критерии успеха

- [x] Все обновления coins используют `increment_profile_value` или `increment_profile_stats`
- [x] Все обновления xp используют `increment_profile_value` или `increment_profile_stats`
- [x] Все обновления sp используют `increment_profile_value` или `increment_profile_stats`
- [x] Нет прямых `UPDATE profiles SET coins = ...` в клиентском коде
- [x] Нет прямых `update({ coins: ... })` в клиентском коде
- [x] Оптимистичные обновления вычисляют баланс локально (не полагаются на сервер)
- [x] Оптимистичные обновления откатываются при ошибках

---

## ✅ Выполнено

### 1. Создана bulk функция `increment_profile_stats`
- Один атомарный UPDATE вместо нескольких вызовов
- Обновляет coins, xp, sp одновременно
- Проверяет отрицательный баланс для coins

### 2. Исправлен `DailyBonus.tsx`
- Использует `increment_profile_value` с правильными параметрами (`p_profile_id`, `p_column`, `p_amount`)
- Реализованы optimistic updates с локальным вычислением
- Откат при ошибках

### 3. Исправлен `useCoins.ts`
- Optimistic updates вычисляют баланс локально
- Откат при ошибках
- Синхронизация с сервером после успешной операции

### 4. Исправлены Edge Functions
- `claim-daily-bonus` - использует retry вместо прямого UPDATE
- `process-purchase` - использует retry вместо прямого UPDATE
- `purchase-webhook` - использует retry вместо прямого UPDATE

---

## 🚀 Следующие шаги

1. ✅ Применить миграцию `20250101000003_create_increment_profile_stats.sql`
2. ✅ Протестировать optimistic updates
3. Перейти к следующей задаче Недели 2 (архивация через pg_cron)

