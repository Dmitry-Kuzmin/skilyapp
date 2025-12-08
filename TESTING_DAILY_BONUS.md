# 🧪 Тестирование Daily Bonus Edge Function

## ✅ Что было реализовано

### Edge Function `claim-daily-bonus`
- ✅ Использует серверное UTC время (не клиентское)
- ✅ Идемпотентность через `user_id + date` (UTC)
- ✅ Атомарные операции для начисления наград (RPC `increment_profile_value`)
- ✅ Вычисление streak на сервере
- ✅ Защита от повторных запросов

### Клиентский код
- ✅ `src/pages/Index.tsx` - упрощен, использует Edge Function
- ✅ `src/pages/DailyBonus.tsx` - упрощен, использует Edge Function
- ✅ Убрана вся логика с клиента (вычисление дат, streak, начисление наград)

## 🧪 План тестирования

### 1. Базовый функционал
- [ ] Получение бонуса в первый раз (streak = 1)
- [ ] Получение бонуса на следующий день (streak увеличивается)
- [ ] Проверка идемпотентности (повторный запрос не начисляет награду дважды)
- [ ] Проверка UTC времени (бонус доступен по UTC, не по локальному времени)

### 2. Edge Cases
- [ ] Прерванный streak (пропущен день)
- [ ] Streak > 7 дней (циклический расчет дня недели)
- [ ] Награда с XP
- [ ] Награда с монетами
- [ ] Награда с boost
- [ ] Награда с random_loot (на клиенте)

### 3. Безопасность
- [ ] Нельзя получить бонус дважды в один день (UTC)
- [ ] Нельзя подделать время (серверное время)
- [ ] Атомарные операции работают (нет конфликтов при параллельных запросах)

### 4. Интеграция
- [ ] Вызов season-sp для начисления SP
- [ ] Обновление данных в dashboard после получения
- [ ] Toast уведомления работают

## 🔍 Как протестировать

### Локальное тестирование Edge Function

```bash
# Запустить локальный dev сервер
npm run dev

# В другом терминале - вызвать Edge Function
curl -X POST http://localhost:54321/functions/v1/claim-daily-bonus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"user_id": "YOUR_USER_ID"}'
```

### Проверка в браузере

1. Открой DevTools Console
2. Перейди на Dashboard
3. Нажми "Получить награду"
4. Проверь логи:
   - `[handleClaimBonus] Claim successful`
   - `[claim-daily-bonus] Claim successful` (в Edge Function logs)

### Проверка в Supabase Dashboard

1. Открой Supabase Dashboard → Edge Functions → claim-daily-bonus → Logs
2. Проверь логи выполнения
3. Проверь таблицу `user_daily_bonus` - должна обновиться `last_claimed_date` (UTC)
4. Проверь таблицу `profiles` - должны увеличиться `xp` и `coins`

## ⚠️ Потенциальные проблемы

### 1. RPC функция `increment_profile_value`
- **Проверка:** Убедиться что функция существует в БД
- **Fallback:** Если RPC не работает, используется прямой UPDATE (не атомарно, но работает)

### 2. Вызов season-sp из Edge Function
- **Проверка:** Используется прямой HTTP fetch (более надежно чем supabase.functions.invoke)
- **Fallback:** Ошибка не блокирует ответ (асинхронный вызов)

### 3. Структура reward
- **Проверка:** Валидация структуры reward перед использованием
- **Fallback:** Если reward невалиден - возвращается ошибка 500

## 📝 Чеклист перед деплоем

- [ ] Edge Function задеплоена в Supabase
- [ ] Проверена работа в dev режиме
- [ ] Проверена идемпотентность (повторные запросы)
- [ ] Проверено UTC время (не локальное)
- [ ] Проверены атомарные операции (RPC работает)
- [ ] Проверена интеграция с season-sp
- [ ] Проверены toast уведомления
- [ ] Проверено обновление данных в dashboard

## 🚀 Деплой

```bash
# Задеплоить Edge Function
npm run supabase:deploy claim-daily-bonus

# Или через Supabase CLI
supabase functions deploy claim-daily-bonus
```

