# 🧪 Руководство по тестированию системы монетизации

## ✅ Что было реализовано:

### 1. **База данных**
- ✅ Новые поля в `profiles`: `premium_until`, `trial_until`, `duel_pass_level`, `duel_pass_xp`, `coins`
- ✅ Таблица `transactions` - все операции с монетами
- ✅ Таблица `purchases` - покупки через Stripe
- ✅ Таблица `duel_pass_rewards` - 10 уровней наград
- ✅ Таблица `user_claimed_rewards` - полученные награды

### 2. **Edge Functions**
- ✅ `premium-status` - проверка Premium статуса
- ✅ `coins-earn` - начисление монет
- ✅ `coins-spend` - списание монет
- ✅ `purchase-create` - создание покупки через Stripe
- ✅ `purchase-webhook` - обработка Stripe webhooks
- ✅ `duel-pass-xp` - начисление XP для Duel Pass
- ✅ `duel-pass-claim` - получение награды Duel Pass
- ✅ `assistant-suggest` - предложения от ассистента

### 3. **Frontend**
- ✅ Хуки `usePremium()` и `useCoins()`
- ✅ Компонент `PaywallModal` - модальное окно покупок
- ✅ Компонент `DuelPassProgress` - прогресс Duel Pass
- ✅ Интеграция в существующие страницы

---

## 🧪 Где и как тестировать:

### 1. **Premium статус и Trial период**

**Где проверить:**
- Главная страница (`/`)
- Страница тестов (`/tests`)

**Что проверить:**
1. **Новые пользователи** автоматически получают 3-дневный trial
   - Войдите как новый пользователь
   - Проверьте, что Premium функции доступны
   - Проверьте в консоли: `usePremium()` должен вернуть `isTrial: true`

2. **Проверка Premium статуса:**
   ```javascript
   // В консоли браузера (F12)
   const { data } = await supabase.functions.invoke('premium-status', {
     body: { user_id: 'ВАШ_PROFILE_ID' }
   });
   console.log('Premium Status:', data);
   ```

3. **В UI:**
   - Premium функции должны быть доступны во время trial
   - После окончания trial должен появиться Paywall

---

### 2. **Начисление монет**

**Где проверить:**
- Завершение теста (`/test-results`)
- Ежедневный бонус (`/`)
- Победа/поражение в дуэли (`/duel`)

**Что проверить:**

1. **После завершения теста:**
   - Пройдите любой тест
   - После завершения должны начислиться **10 монет** (или 15 для Premium)
   - Проверьте баланс монет в интерфейсе

2. **Ежедневный бонус:**
   - Откройте главную страницу
   - Нажмите "Забрать бонус"
   - Должны начислиться **5 монет** (или 7.5 для Premium)

3. **В консоли браузера:**
   ```javascript
   // Тест начисления монет
   const { data } = await supabase.functions.invoke('coins-earn', {
     body: { 
       user_id: 'ВАШ_PROFILE_ID',
       reward_type: 'complete_test'
     }
   });
   console.log('Начислено монет:', data);
   ```

4. **Проверка в БД:**
   - Supabase Dashboard → Table Editor → `transactions`
   - Должна появиться запись с типом `coins_earned_test`
   - Supabase Dashboard → Table Editor → `profiles`
   - Поле `coins` должно увеличиться

---

### 3. **Списание монет (покупка бустеров)**

**Где проверить:**
- Магазин бустеров (откройте во время теста или дуэли)

**Что проверить:**

1. **Покупка бустера:**
   - Откройте тест или дуэль
   - Нажмите на иконку магазина бустеров
   - Попробуйте купить бустер (например, "50/50" стоит 40 монет)
   - Баланс должен уменьшиться
   - Бустер должен стать доступным

2. **В консоли браузера:**
   ```javascript
   // Тест списания монет
   const { data } = await supabase.functions.invoke('coins-spend', {
     body: { 
       user_id: 'ВАШ_PROFILE_ID',
       spend_type: 'boost_50_50'
     }
   });
   console.log('Списано монет:', data);
   ```

3. **Проверка в БД:**
   - Supabase Dashboard → `transactions`
   - Должна появиться запись с типом `coins_spent_boost` и отрицательным значением

---

### 4. **Duel Pass (система прогресса)**

**Где проверить:**
- Главная страница (`/`) - виджет Duel Pass
- Страница тестов (`/tests`)

**Что проверить:**

1. **Начисление XP:**
   - Пройдите тест → должно начислиться **20 XP**
   - Заберите ежедневный бонус → должно начислиться **15 XP**
   - Выиграйте дуэль → должно начислиться **30 XP**

2. **Проверка уровня:**
   ```javascript
   // В консоли браузера
   const { data } = await supabase.functions.invoke('duel-pass-xp', {
     body: { 
       user_id: 'ВАШ_PROFILE_ID',
       source_type: 'test'
     }
   });
   console.log('XP и уровень:', data);
   ```

3. **Получение награды:**
   - Достигните нового уровня Duel Pass
   - Нажмите на награду в виджете Duel Pass
   - Должны начислиться монеты или скин

4. **Проверка в БД:**
   - Supabase Dashboard → `profiles`
   - Поля `duel_pass_xp` и `duel_pass_level` должны обновляться
   - Supabase Dashboard → `user_claimed_rewards`
   - Должна появиться запись о полученной награде

---

### 5. **Paywall (модальное окно покупок)**

**Где проверить:**
- Появляется автоматически при:
  - 3 неудачных попытках теста (для не-Premium пользователей)
  - Низком балансе монет
  - Повышении уровня Duel Pass
  - Окончании trial периода

**Что проверить:**

1. **Триггеры Paywall:**
   - Попробуйте пройти тест 3 раза без Premium → должен появиться Paywall
   - Попробуйте купить бустер при низком балансе → должен появиться Paywall

2. **Содержимое Paywall:**
   - Должны быть видны:
     - Premium подписка (месячная/годовая)
     - Duel Pass
     - Пакеты монет (Starter, Popular, Mega, Pro, Whale)

3. **Кнопки покупки:**
   - Нажмите на любую кнопку покупки
   - Должно открыться окно Stripe Checkout (в тестовом режиме)

---

### 6. **Stripe покупки (тестовый режим)**

**Где проверить:**
- Paywall → любая кнопка покупки

**Что проверить:**

1. **Создание покупки:**
   ```javascript
   // В консоли браузера
   const { data } = await supabase.functions.invoke('purchase-create', {
     body: { 
       user_id: 'ВАШ_PROFILE_ID',
       catalog_key: 'premium_monthly'
     }
   });
   console.log('Stripe Checkout URL:', data.url);
   ```

2. **Тестовая карта Stripe:**
   - Используйте тестовую карту: `4242 4242 4242 4242`
   - Любая дата в будущем (например, 12/34)
   - Любой CVC (например, 123)
   - Любой почтовый индекс

3. **После покупки:**
   - Проверьте Supabase Dashboard → `purchases`
   - Статус должен быть `completed`
   - Проверьте `profiles` → `premium_until` должен обновиться
   - Проверьте `transactions` → должна появиться запись

4. **Webhook обработка:**
   - Проверьте Supabase Dashboard → `stripe_events`
   - Должна появиться запись о событии `checkout.session.completed`
   - Проверьте логи Edge Function `purchase-webhook` в Supabase Dashboard

---

### 7. **Ассистент (предложения)**

**Где проверить:**
- Появляется автоматически при определенных событиях

**Что проверить:**

1. **После 2 неудачных тестов:**
   ```javascript
   // В консоли браузера
   const { data } = await supabase.functions.invoke('assistant-suggest', {
     body: { trigger: 'after_2_failed_tests' }
   });
   console.log('Предложение ассистента:', data);
   ```

2. **При низком балансе монет:**
   ```javascript
   const { data } = await supabase.functions.invoke('assistant-suggest', {
     body: { trigger: 'low_coins_in_duel' }
   });
   console.log('Предложение ассистента:', data);
   ```

3. **При повышении уровня Duel Pass:**
   - Достигните нового уровня
   - Должно появиться сообщение от ассистента

---

## 📊 Проверка в Supabase Dashboard:

### Таблицы для проверки:

1. **`profiles`**
   - `premium_until` - дата окончания Premium
   - `trial_until` - дата окончания trial
   - `coins` - баланс монет
   - `duel_pass_level` - текущий уровень Duel Pass
   - `duel_pass_xp` - текущий XP
   - `duel_pass_premium` - куплен ли Premium Duel Pass

2. **`transactions`**
   - Все операции с монетами
   - Типы: `coins_earned_*`, `coins_spent_*`, `premium_purchase_*`

3. **`purchases`**
   - Все покупки через Stripe
   - Статусы: `pending`, `completed`, `failed`

4. **`stripe_events`**
   - Все события от Stripe
   - Проверка обработки webhooks

5. **`duel_pass_rewards`**
   - Статические данные о наградах (10 уровней)

6. **`user_claimed_rewards`**
   - Полученные пользователями награды

---

## 🐛 Возможные проблемы и решения:

### Монеты не начисляются
- Проверьте логи Edge Function `coins-earn` в Supabase Dashboard
- Проверьте таблицу `transactions`
- Проверьте баланс в `profiles.coins`

### Premium статус не определяется
- Проверьте `profiles.premium_until` и `profiles.trial_until`
- Проверьте логи Edge Function `premium-status`
- Убедитесь, что даты в будущем

### Paywall не появляется
- Проверьте логику триггеров в коде
- Проверьте консоль браузера на ошибки
- Убедитесь, что `usePremium()` работает корректно

### Stripe покупки не работают
- Проверьте секреты в Supabase Dashboard → Edge Functions → Settings
- Проверьте webhook в Stripe Dashboard
- Проверьте логи Edge Function `purchase-webhook`
- Убедитесь, что используете тестовые ключи Stripe

---

## ✅ Чеклист тестирования:

- [ ] Premium статус определяется корректно
- [ ] Trial период активируется для новых пользователей
- [ ] Монеты начисляются после тестов
- [ ] Монеты начисляются за ежедневный бонус
- [ ] Монеты списываются при покупке бустеров
- [ ] Duel Pass XP начисляется корректно
- [ ] Уровни Duel Pass повышаются
- [ ] Награды Duel Pass можно получить
- [ ] Paywall появляется при нужных условиях
- [ ] Stripe Checkout открывается
- [ ] Покупки обрабатываются через webhook
- [ ] Premium активируется после покупки
- [ ] Ассистент предлагает покупки в нужных ситуациях
- [ ] Все данные сохраняются в БД

---

## 🎯 Быстрый тест (5 минут):

1. Войдите в приложение
2. Пройдите тест → проверьте начисление монет
3. Заберите ежедневный бонус → проверьте начисление монет и XP
4. Откройте магазин бустеров → попробуйте купить бустер
5. Проверьте Duel Pass прогресс на главной странице
6. Попробуйте вызвать Paywall (3 неудачных теста)

---

## 📝 Логи для отладки:

Все Edge Functions логируются в Supabase Dashboard:
- Edge Functions → выберите функцию → Logs

Проверяйте логи при возникновении проблем!



