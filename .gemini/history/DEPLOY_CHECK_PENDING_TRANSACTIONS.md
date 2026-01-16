# 🚀 Задеплой Edge Function: check-pending-transactions

## 📋 Инструкция по задеплою

### Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

#### Шаг 1: Открой Supabase Dashboard
1. Перейди на: https://supabase.com/dashboard
2. Выбери проект **sdadim-dgt-prep**

#### Шаг 2: Открой Edge Functions
1. В меню слева найди **"Edge Functions"**
2. Нажми на него

#### Шаг 3: Создай новую функцию
1. Нажми кнопку **"Create a new function"** или **"New Function"**
2. Введи название: `check-pending-transactions`
3. Нажми **"Create"**

#### Шаг 4: Вставь код
1. Открой файл `supabase/functions/check-pending-transactions/index.ts` в проекте
2. Скопируй **ВЕСЬ** код (Ctrl+A, Ctrl+C)
3. Вставь код в редактор Supabase Dashboard
4. Нажми **"Deploy"** или **"Save"**

#### Шаг 5: ⚠️ КРИТИЧНО - Настрой переменные окружения

**ВАЖНО:** Edge Functions в облаке НЕ видят локальный `.env` файл! Секреты нужно залить в облако.

**Вариант А: Через Supabase Dashboard**
1. Перейди в **Edge Functions** → **Settings** → **Secrets**
2. Добавь следующие секреты (если еще не добавлены):

**Для Cryptomus:**
- `CRYPTOMUS_MERCHANT_ID` - ID мерчанта Cryptomus
- `CRYPTOMUS_PAYMENT_KEY` - Секретный ключ для подписи

**Для Paddle:**
- `PADDLE_API_KEY` - API ключ Paddle

**Для Telegram Stars:**
- Не требуется (использует данные из БД)

**Общие (уже должны быть):**
- `SUPABASE_URL` - URL проекта
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key

#### Шаг 6: Проверь деплой
1. После деплоя должно появиться сообщение об успехе
2. Проверь логи: нажми **"Logs"** - там должны быть сообщения `[check-pending]`
3. URL функции: `https://your-project.supabase.co/functions/v1/check-pending-transactions`

---

### Способ 2: Через CLI

#### Шаг 1: Установи Supabase CLI (если еще не установлен)

**На macOS (через Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Или через npm:**
```bash
npm install -g supabase
```

#### Шаг 2: Авторизуйся в Supabase
```bash
supabase login
```

#### Шаг 3: Свяжи проект
```bash
# Найди project-ref в настройках проекта в Supabase Dashboard
# Settings → General → Reference ID
supabase link --project-ref ваш-project-ref
```

#### Шаг 4: ⚠️ КРИТИЧНО - Залей секреты в облако

**ВАЖНО:** Секреты нужно залить ДО деплоя функции!

**Вариант А: Через CLI (рекомендуется)**
```bash
# Если есть файл .env.prod
supabase secrets set --env-file ./supabase/.env.prod

# Или вручную для критичных ключей:
supabase secrets set CRYPTOMUS_MERCHANT_ID=your_merchant_id
supabase secrets set CRYPTOMUS_PAYMENT_KEY=your_payment_key
supabase secrets set PADDLE_API_KEY=your_paddle_key
```

**Вариант Б: Через Dashboard**
1. Перейди в **Edge Functions** → **Settings** → **Secrets**
2. Добавь секреты вручную (см. Способ 1, Шаг 5)

#### Шаг 5: Задеплой функцию
```bash
# Для функций, вызываемых через Service Role (как check-pending-transactions)
supabase functions deploy check-pending-transactions --no-verify-jwt

# Или без флага, если проверяешь JWT сам
supabase functions deploy check-pending-transactions
```

---

## ✅ Проверка работы

### 🧪 Smoke Test (КРИТИЧНО - сделай сразу после деплоя!)

**Цель:** Убедиться, что функция работает в облаке

**Шаг 1: Простейший тест**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Ожидаемый результат:**
- ✅ HTTP 200 (не 500!)
- ✅ JSON ответ с полями `results`, `total_checked`, etc.
- ✅ В логах нет ошибок типа "Missing config" или "CRYPTOMUS_MERCHANT_ID not configured"

**Если Smoke Test провален:**
- 🔴 **STOP!** Не иди дальше по плану
- Проверь секреты в Dashboard
- Проверь логи функции
- Исправь ошибки перед продолжением

---

### Тест 1: Ручной вызов через curl (детальный)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Ожидаемый ответ:**
```json
{
  "timestamp": "2025-01-08T...",
  "results": {
    "cryptomus": { "checked": 0, "completed": 0, "failed": 0, "errors": [] },
    "paddle": { "checked": 0, "completed": 0, "failed": 0, "errors": [] },
    "telegram_stars": { "checked": 0, "completed": 0, "failed": 0, "errors": [] }
  },
  "total_checked": 0,
  "total_completed": 0,
  "total_failed": 0
}
```

### Тест 2: Проверка логов

1. Открой Supabase Dashboard → Edge Functions → check-pending-transactions → Logs
2. Должны быть логи с префиксом `[check-pending]`

---

## 🔧 Настройка GitHub Actions

GitHub Actions workflow уже создан (`.github/workflows/check-pending-transactions.yml`).

**Проверь секреты в GitHub:**
1. Перейди в GitHub → Settings → Secrets and variables → Actions
2. Убедись, что есть:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

**Workflow запускается:**
- Ежедневно в 04:00 UTC
- Можно запустить вручную через GitHub UI

---

## 📊 Мониторинг

### Проверка результатов работы

После первого запуска (04:00 UTC) проверь:
1. Логи GitHub Actions
2. Логи Edge Function в Supabase Dashboard
3. Статистику в ответе функции

### Что смотреть в логах:

**Успешная работа:**
```
[check-pending] Found 5 pending Cryptomus purchases
[check-pending] Processing completed purchase ...
[check-pending] ✅ Premium granted to user ...
```

**Ошибки:**
```
[check-pending] ❌ Error checking Cryptomus order ...
[check-pending] Error fetching Cryptomus purchases: ...
```

---

## ⚠️ Важные замечания

### 🔑 1. Secrets Management (КРИТИЧНО!)
- **Edge Functions НЕ видят локальный `.env` файл!**
- Секреты нужно залить в облако через Dashboard или CLI
- Без секретов функция упадет с ошибкой 500 при первом запуске
- Проверь секреты ДО деплоя функции

### 🌐 2. CORS
- Для `check-pending-transactions` (вызывается CRON-ом) CORS не критичен
- Функция обрабатывает `OPTIONS` запросы (см. код)
- Для функций, вызываемых с фронтенда, убедись в корректной обработке CORS

### 🧪 3. Smoke Testing
- **Сделай Smoke Test сразу после деплоя!**
- Если тест провален — **STOP!** Не иди дальше, пока не исправишь
- Простой тест: вызови функцию и проверь, что она отвечает (не 500)

### 📊 4. Другие замечания
- **Права доступа:** Функция использует `SERVICE_ROLE_KEY` для обхода RLS
- **Лимиты:** Функция обрабатывает максимум 50 транзакций за раз (защита от timeout)
- **Повторные запуски:** Если транзакций больше 50, они будут обработаны при следующем запуске

---

## 🎯 Следующие шаги

После успешного задеплоя:
1. ✅ Протестировать функцию вручную
2. ✅ Проверить работу GitHub Actions
3. ✅ Мониторить логи после первого автоматического запуска
4. ✅ Перейти к тестированию других критических функций

---

**Готово к задеплою!** 🚀

