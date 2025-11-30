# 📦 Создание продуктов в Paddle для SkilyApp

## 🎯 Список продуктов для создания

Нужно создать **7 продуктов** в Paddle Catalog:

### 1. Premium Monthly (Подписка)
- **Name:** `Premium Monthly`
- **Type:** `Subscription`
- **Billing cycle:** `Monthly`
- **Price:** `€9.99`
- **Catalog key:** `premium_monthly`

### 2. Premium Yearly (Подписка)
- **Name:** `Premium Yearly`
- **Type:** `Subscription`
- **Billing cycle:** `Yearly`
- **Price:** `€59.99`
- **Catalog key:** `premium_yearly`

### 3. Duel Pass (Разовый платеж)
- **Name:** `Duel Pass (Season)`
- **Type:** `One-time`
- **Price:** `€4.99`
- **Catalog key:** `duel_pass_season`

### 4. 100 Coins (Разовый платеж)
- **Name:** `100 монет`
- **Type:** `One-time`
- **Price:** `€2.99`
- **Catalog key:** `coins_pack_100`

### 5. 500 Coins + Bonus (Разовый платеж)
- **Name:** `500 монет + 50 бонус`
- **Type:** `One-time`
- **Price:** `€9.99`
- **Catalog key:** `coins_pack_500`

### 6. 1200 Coins + Bonus (Разовый платеж)
- **Name:** `1200 монет + 200 бонус`
- **Type:** `One-time`
- **Price:** `€19.99`
- **Catalog key:** `coins_pack_1200`

### 7. 3000 Coins + Bonus (Разовый платеж)
- **Name:** `3000 монет + 500 бонус`
- **Type:** `One-time`
- **Price:** `€39.99`
- **Catalog key:** `coins_pack_3000`

---

## 📝 Пошаговая инструкция

### Шаг 1: Откройте Catalog

1. Войдите в [Paddle Dashboard](https://vendors.paddle.com)
2. В боковом меню выберите **Catalog**
3. Нажмите **"Create product"** или **"Add product"**

### Шаг 2: Создайте первый продукт (Premium Monthly)

1. **Product name:** `Premium Monthly`
2. **Product type:** Выберите `Subscription`
3. **Description:** `Monthly Premium access to all features`
4. **Image:** (опционально) Загрузите иконку
5. Нажмите **"Continue"** или **"Next"**

6. **Pricing:**
   - **Price:** `9.99`
   - **Currency:** `EUR` (€)
   - **Billing cycle:** `Monthly`
   - **Trial period:** (оставьте пустым или установите по желанию)
7. Нажмите **"Save"** или **"Create"**

8. **Скопируйте Price ID:**
   - После создания продукта откроется страница с деталями
   - Найдите **Price ID** (начинается с `pri_...`)
   - Скопируйте его и запишите: `premium_monthly = pri_xxxxx`

### Шаг 3: Повторите для остальных продуктов

Создайте остальные 6 продуктов по той же схеме:

**Premium Yearly:**
- Type: `Subscription`
- Billing: `Yearly`
- Price: `59.99 EUR`
- Скопируйте Price ID: `premium_yearly = pri_xxxxx`

**Duel Pass:**
- Type: `One-time`
- Price: `4.99 EUR`
- Скопируйте Price ID: `duel_pass_season = pri_xxxxx`

**Coins Packs:**
- Type: `One-time`
- Prices: `2.99`, `9.99`, `19.99`, `39.99 EUR`
- Скопируйте Price IDs для каждого

---

## 📋 Таблица для записи Price IDs

Заполните эту таблицу после создания каждого продукта:

| Catalog Key | Product Name | Price ID (pri_...) |
|-------------|--------------|-------------------|
| premium_monthly | Premium Monthly | `pri_` |
| premium_yearly | Premium Yearly | `pri_` |
| duel_pass_season | Duel Pass | `pri_` |
| coins_pack_100 | 100 монет | `pri_` |
| coins_pack_500 | 500 монет + 50 бонус | `pri_` |
| coins_pack_1200 | 1200 монет + 200 бонус | `pri_` |
| coins_pack_3000 | 3000 монет + 500 бонус | `pri_` |

---

## ✅ После создания всех продуктов

1. Убедитесь, что все 7 Price IDs скопированы
2. Сообщите мне Price IDs, и я обновлю Edge Function
3. Или обновите файл `supabase/functions/paddle-payment/index.ts` самостоятельно

---

## 🔍 Где найти Price ID?

После создания продукта:
1. Откройте продукт в Catalog
2. Перейдите на вкладку **"Pricing"** или **"Prices"**
3. Найдите созданную цену
4. Price ID будет отображаться рядом с ценой (формат: `pri_xxxxxxxxxxxxx`)

Или:
1. В списке продуктов нажмите на продукт
2. В деталях продукта найдите раздел **"Prices"**
3. Скопируйте Price ID

---

## ⚠️ Важно

- **Sandbox vs Live:** Если используете Sandbox API key, создавайте продукты в Sandbox режиме
- **Currency:** Убедитесь, что все цены в EUR (€)
- **Price ID уникален:** Каждый Price ID используется только для одного продукта

---

**Готово!** После создания всех продуктов интеграция будет полностью настроена. 🎉

