# 🛡️ Гибридный Трекинг Партнеров - Решение "Слепого Пятна"

## Проблема

**Telegram Partner Program работает ТОЛЬКО с Telegram Stars.**

Если пользователь:
1. Приходит по партнерской ссылке (`t.me/bot/app?startapp=PARTNER_CODE`)
2. Но платит через **Paddle** (картой в евро)

→ Telegram об этом **НЕ узнает**, партнер **НЕ получит комиссию** через встроенную программу.

**Риск:** Партнер видит выплату только за половину продаж и уходит.

---

## Решение: "Страховочная Сетка" (Safety Net)

Реализован **Гибридный Трекинг**:
- ✅ Telegram Partner Program для Stars (автоматически)
- ✅ Собственный трекинг для Paddle/Stripe (вручную)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│              ПАРТНЕРСКАЯ ССЫЛКА                         │
│  t.me/sdadimtutbot/app?startapp=PARTNER_CODE          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         Telegram Web App открывается                    │
│  start_param = "PARTNER_CODE" передается в initData    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TelegramInit.ts → parseDeepLink()                      │
│  Сохраняет в sessionStorage: 'partner_ref_code'          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  UserContext → после авторизации                        │
│  Вызывает: link_user_to_partner_from_start_param()     │
│  Сохраняет в profiles.partner_ref_code                  │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────┴───────────────────────┐
        ↓                                               ↓
┌───────────────────────┐                    ┌───────────────────────┐
│  Платеж через Stars   │                    │  Платеж через Paddle  │
│                       │                    │                       │
│  Telegram сам         │                    │  paddle-webhook       │
│  начисляет комиссию   │                    │  проверяет:          │
│  (автоматически)      │                    │  - partner_ref_code?  │
│                       │                    │  - вызывает:          │
│  ✅ Работает          │                    │    add_partner_       │
│     автоматически     │                    │    commission_for_    │
│                       │                    │    paddle_payment()   │
└───────────────────────┘                    │                       │
                                             │  ✅ Начисляет         │
                                             │     комиссию вручную   │
                                             └───────────────────────┘
```

---

## Что было сделано

### 1. Миграция БД (`20250113000000_add_partner_tracking_for_paddle.sql`)

**Добавлено:**
- Поле `partner_ref_code` в таблицу `profiles`
- Индекс для быстрого поиска
- Функция `link_user_to_partner_from_start_param()` - связывает пользователя с партнером
- Функция `add_partner_commission_for_paddle_payment()` - начисляет комиссию при платеже Paddle

### 2. Обновлен `TelegramInit.ts`

**Добавлено:**
- Обработка партнерских кодов из `start_param`
- Функция `linkUserToPartner()` - вызывает RPC для связки (если пользователь уже авторизован)
- Сохранение в `sessionStorage` для последующей обработки

### 3. Обновлен `parseDeepLink()` в `telegramNotifications.ts`

**Добавлено:**
- Поддержка формата `partner_XXX`
- Поддержка кодов без префикса (Telegram Partner Program может использовать просто код)
- Автоматическое определение партнерских кодов (3-6 символов, буквы/цифры)

### 4. Обновлен `UserContext.tsx`

**Добавлено:**
- Проверка `partner_ref_code` из `sessionStorage`
- Вызов `link_user_to_partner_from_start_param()` после создания профиля
- Очистка `sessionStorage` после успешной связки

### 5. Обновлен `paddle-webhook/index.ts`

**Добавлено:**
- Проверка `partner_ref_code` в профиле пользователя
- Вызов `add_partner_commission_for_paddle_payment()` при успешном платеже
- Начисление комиссии в таблицу `partner_commissions` (через существующую функцию `add_partner_commission_to_hold`)

---

## Как это работает

### Сценарий 1: Пользователь платит Stars

1. Пользователь открывает `t.me/bot/app?startapp=PARTNER_CODE`
2. `TelegramInit.ts` сохраняет код в `sessionStorage`
3. После авторизации код сохраняется в `profiles.partner_ref_code`
4. Пользователь покупает через **Telegram Stars**
5. **Telegram сам начисляет комиссию** партнеру (автоматически)
6. ✅ **Нагрузка на нас: 0**

### Сценарий 2: Пользователь платит Paddle

1. Пользователь открывает `t.me/bot/app?startapp=PARTNER_CODE`
2. `TelegramInit.ts` сохраняет код в `sessionStorage`
3. После авторизации код сохраняется в `profiles.partner_ref_code`
4. Пользователь покупает через **Paddle** (картой)
5. Paddle отправляет webhook → `paddle-webhook/index.ts`
6. Webhook проверяет: `SELECT partner_ref_code FROM profiles WHERE id = user_id`
7. Если код найден → вызывает `add_partner_commission_for_paddle_payment()`
8. Функция:
   - Находит партнера по коду
   - Вычисляет комиссию (17% по умолчанию, или из `partners.commission_rate`)
   - Записывает в `partner_conversions` (event_type = 'purchase')
   - Начисляет комиссию через `add_partner_commission_to_hold()`
9. ✅ **Партнер получает комиссию вручную**

---

## Форматы start_param

Поддерживаются следующие форматы:

1. **С префиксом:** `partner_MIGUEL` → `{ action: 'partner', id: 'MIGUEL' }`
2. **Без префикса:** `MIGUEL` → `{ action: 'partner', id: 'MIGUEL' }` (автоопределение)
3. **Реферальный:** `ref_ABC123` → `{ action: 'ref', id: 'ABC123' }` (не трогаем)

---

## Важные детали

### 1. Приоритет связки

Если пользователь уже привязан к другому партнеру, новая связка **не создается** (защита от перезаписи).

### 2. Тип партнера

Комиссия начисляется только для партнеров с `partner_type = 'revenue_share'`.

### 3. Комиссия

Используется `partners.commission_rate` или 17% по умолчанию.

### 4. Воронка конверсий

Автоматически записываются события:
- `install` - при первом входе (если партнер найден)
- `purchase` - при успешном платеже Paddle

---

## Тестирование

### Тест 1: Связка при входе

1. Открой `t.me/sdadimtutbot/app?startapp=MIGUEL`
2. Авторизуйся
3. Проверь в БД:
   ```sql
   SELECT partner_ref_code FROM profiles WHERE id = 'твой_user_id';
   -- Должно вернуть: MIGUEL
   ```

### Тест 2: Комиссия при платеже Paddle

1. Пользователь с `partner_ref_code = 'MIGUEL'` покупает через Paddle
2. Проверь в БД:
   ```sql
   SELECT * FROM partner_conversions 
   WHERE partner_code = 'MIGUEL' 
   AND event_type = 'purchase'
   ORDER BY created_at DESC LIMIT 1;
   -- Должна быть запись с commission_amount
   ```

### Тест 3: Комиссия в балансе партнера

```sql
SELECT balance_hold, balance_available 
FROM partners 
WHERE partner_code = 'MIGUEL';
-- balance_hold должен увеличиться на commission_amount
```

---

## Итог

✅ **Telegram Partner Program** работает для Stars (автоматически)  
✅ **Собственный трекинг** работает для Paddle (вручную)  
✅ **Партнеры получают комиссию за ВСЕ покупки**  
✅ **Нет потери денег партнеров**

---

## Следующие шаги

1. ✅ Применить миграцию: `supabase db push`
2. ✅ Протестировать связку при входе
3. ✅ Протестировать начисление комиссии при платеже Paddle
4. ⏳ Включить Telegram Partner Program в BotFather (для Stars)
5. ⏳ Обновить документацию для партнеров

---

## Важные файлы

- `supabase/migrations/20250113000000_add_partner_tracking_for_paddle.sql` - миграция
- `src/core/TelegramInit.ts` - обработка start_param
- `src/lib/telegramNotifications.ts` - парсинг deep links
- `src/contexts/UserContext.tsx` - связка после авторизации
- `supabase/functions/paddle-webhook/index.ts` - начисление комиссии




