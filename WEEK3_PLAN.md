# 🚀 Неделя 3: Экономика и Оптимизация

## 🎯 Цель

Завершить подготовку к "Релизу 2.0" через оптимизацию экономики и производительности.

---

## 📋 Задачи

### 1. ✅ Telegram Stars: Разные цены для Telegram Mini App и Web

**Важно:** Telegram Stars используется ТОЛЬКО в Telegram Mini App. На Web используются Cryptomus/Paddle (EUR).

**Проблема:**
- Telegram Stars имеет комиссию Apple/Google (30%) + комиссию Telegram
- Цены в Stars должны быть выше, чем в Web (Cryptomus/Paddle)
- Сейчас в UI показывается только `price_coins`, а не `price_stars` для Telegram
- Поле `price_stars` уже есть в БД, но не используется в UI

**Решение:**
- Поле `price_stars` уже существует в `pricing_packages` ✅
- Обновить UI для показа правильной цены:
  - **В Telegram Mini App:** показывать цену в Stars (`price_stars`)
  - **На Web:** показывать цену в EUR (через Cryptomus/Paddle)
- Убедиться, что Edge Functions используют `price_stars` для Telegram Stars

**План:**
1. ✅ Проверить, что `price_stars` заполнено в БД (уже есть в миграциях)
2. Обновить `PaywallModal.tsx` для загрузки `price_stars` из БД
3. Обновить отображение цены: Stars в Telegram, EUR на Web
4. Проверить Edge Functions (`telegram-stars-payment`) - используют ли `price_stars`
5. Обновить другие компоненты (если есть), где показываются цены

**Критерии успеха:**
- [x] Колонка `price_stars` существует в `pricing_packages` (уже есть)
- [ ] В Telegram Mini App показывается цена в Stars (`price_stars`)
- [ ] На Web показывается цена в EUR (Cryptomus/Paddle)
- [ ] Edge Functions используют `price_stars` для Telegram Stars
- [ ] Нет вычислений на клиенте — все из БД

---

### 2. ✅ Pending Transactions: Проверка зависших платежей

**Проблема:**
- ~2-3% платежей "зависают" в статусе `pending`
- Пользователи не получают Premium/монеты
- Потеря выручки и плохой UX

**Решение:**
- Создать Edge Function для проверки зависших транзакций
- Проверять статусы в Cryptomus, Telegram Stars, Paddle
- Автоматически обновлять статусы и начислять награды

**План:**
1. Создать Edge Function `check-pending-transactions`
2. Проверять `purchases` со статусом `pending` старше 24 часов
3. Для каждого платежного шлюза:
   - Cryptomus: проверить статус через API
   - Telegram Stars: проверить через Telegram Bot API
   - Paddle: проверить через Paddle API
4. Обновить статус и начислить награды при успешном платеже
5. Настроить GitHub Actions для ежедневного запуска

**Критерии успеха:**
- [ ] Edge Function создана и задеплоена
- [ ] Проверка всех трех платежных шлюзов работает
- [ ] Автоматическое обновление статусов
- [ ] GitHub Actions запускается ежедневно
- [ ] Логирование всех операций

---

### 3. ⏳ Performance: Оптимизация индексов (если останется время)

**План:**
- Проверить медленные запросы через Supabase Dashboard
- Добавить недостающие индексы
- Оптимизировать существующие индексы

**Критерии успеха:**
- [ ] Анализ медленных запросов выполнен
- [ ] Добавлены критичные индексы
- [ ] Производительность улучшена

---

## 🎯 Приоритеты

1. **Высокий:** Telegram Stars цены (экономика)
2. **Высокий:** Pending Transactions (выручка)
3. **Средний:** Performance индексы (если время)

---

## 📊 Прогресс

- [ ] Telegram Stars: Разные цены
- [ ] Pending Transactions: Проверка зависших платежей
- [ ] Performance: Оптимизация индексов

**Прогресс: 0%**

---

## 🚀 Следующие шаги

1. Изучить структуру `pricing_packages`
2. Создать миграцию для `stars_price`
3. Обновить Edge Functions и клиентский код
4. Создать Edge Function для проверки pending транзакций
5. Настроить автоматический запуск через GitHub Actions

---

## 📝 Примечания

- **КРИТИЧНО:** Telegram Stars используется ТОЛЬКО в Telegram Mini App
- **КРИТИЧНО:** На Web используются Cryptomus/Paddle (EUR), НЕ Telegram Stars
- **Важно:** Не объяснять причину разных цен в UI (нарушение правил сторов)
- **Важно:** Использовать тестовые ключи для проверки pending транзакций
- **Важно:** Логировать все операции для отладки

## 🔍 Текущее состояние

### Telegram Stars:
- ✅ Поле `price_stars` существует в БД
- ✅ Edge Function `telegram-stars-payment` использует `price_stars`
- ✅ `StarsPaymentButton` показывается только в Telegram Mini App
- ❌ `PaywallModal` НЕ загружает `price_stars` из БД (только `price_coins`)
- ❌ UI не показывает цену в Stars для Telegram Mini App

### Web (Cryptomus/Paddle):
- ✅ `CryptomusPaymentPreview` используется на Web
- ✅ Цены в EUR через Cryptomus/Paddle

