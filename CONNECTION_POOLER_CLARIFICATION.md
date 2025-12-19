# 🔍 Уточнение: Connection Pooler и Transaction Mode

**Источник:** [Supabase Documentation - Connection Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## 📊 Режимы Connection Pooler

### 1. **Transaction Mode** (Порт 6543)

**Когда использовать:**
- ✅ **Serverless функции** (Edge Functions)
- ✅ **Кратковременные задачи**
- ✅ **Много временных соединений**

**Особенности:**
- ❌ **НЕ поддерживает prepared statements**
- ✅ Идеален для Edge Functions
- ✅ Порт: **6543**

**Connection String:**
```
postgres://postgres:[PASSWORD]@db.abcdefghijklmnopqrst.supabase.co:6543/postgres
```

### 2. **Session Mode** (Порт 5432)

**Когда использовать:**
- ✅ **Persistent backend** (долгоживущие серверы)
- ✅ Когда нужен **IPv4** (альтернатива Direct Connection)
- ✅ Когда нужны **prepared statements**

**Особенности:**
- ✅ Поддерживает prepared statements
- ✅ Порт: **5432**

**Connection String:**
```
postgres://postgres.apbkobhfnmcqqzqeeqss:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### 3. **Direct Connection** (Порт 5432)

**Когда использовать:**
- ✅ **Persistent servers** (VM, контейнеры)
- ✅ **Долгоживущие соединения**
- ✅ Когда поддерживается **IPv6**

**Особенности:**
- ✅ Прямое подключение к Postgres
- ✅ Порт: **5432**

---

## ✅ Вывод для Edge Functions

**Для Edge Functions (наш случай):**

✅ **Рекомендуется: Transaction Mode (порт 6543)**

**Почему:**
- Edge Functions = serverless функции
- Требуют много временных соединений
- Transaction mode идеален для этого

**Важно:**
- Transaction mode **НЕ поддерживает prepared statements**
- Нужно отключить prepared statements в библиотеке подключения

---

## 🔍 Проверка: Используем ли мы Transaction Mode?

### В нашем коде:

**Файл:** `supabase/functions/_shared/supabase-client.ts`

```typescript
// Мы используем SUPABASE_URL, который в Edge Functions
// автоматически использует Connection Pooler
const supabaseUrl = getPooledSupabaseUrl(); // https://PROJECT_REF.supabase.co
const client = createClient(supabaseUrl, key);
```

**Проблема:** 
- Supabase JS Client через `SUPABASE_URL` использует **REST API** (PostgREST), а не прямое подключение к Postgres
- REST API автоматически использует Connection Pooler
- Но мы не указываем явно порт 6543

---

## ⚠️ Важно: Как Supabase JS Client работает в Edge Functions

**Согласно документации:**

1. **Supabase JS Client** использует **REST API** (PostgREST), а не прямое подключение к Postgres
2. **REST API** автоматически использует Connection Pooler
3. **Edge Functions** по умолчанию используют **Transaction Mode** через REST API

**Но для прямых SQL запросов:**
- Нужно использовать Connection String с портом **6543** (Transaction Mode)
- Или портом **5432** (Session Mode или Direct)

---

## ✅ Итоговый вердикт

### Для Edge Functions (наш случай):

1. **Supabase JS Client** (`createClient`) через `SUPABASE_URL`:
   - ✅ Использует REST API (PostgREST)
   - ✅ REST API автоматически использует Connection Pooler
   - ✅ **Transaction Mode** используется автоматически для Edge Functions

2. **Если нужны прямые SQL запросы:**
   - Используйте Connection String с портом **6543** (Transaction Mode)
   - Или используйте функцию `getConnectionPoolerUrl()` из нашего кода

### Вывод:

✅ **Для Edge Functions Transaction Mode используется автоматически** через REST API

✅ **Наш код правильный** - мы используем `SUPABASE_URL`, который через REST API использует Transaction Mode

---

## 📋 Рекомендации

### Что делать:

1. ✅ **Текущий код правильный** - используем `SUPABASE_URL` через Supabase JS Client
2. ✅ **Transaction Mode используется автоматически** для Edge Functions через REST API
3. ✅ **Ничего менять не нужно**

### Если нужны прямые SQL запросы:

Используйте функцию `getConnectionPoolerUrl()` из `supabase-client.ts`:
```typescript
import { getConnectionPoolerUrl } from '../_shared/supabase-client.ts';

const poolerUrl = getConnectionPoolerUrl(); // Вернет URL с портом 6543
```

---

## 🔗 Источники

- [Supabase Documentation - Connection Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase Documentation - Connection Methods](https://supabase.com/docs/guides/database/connecting-to-postgres#how-to-connect-to-your-postgres-databases)

---

**Вывод:** Для Edge Functions Transaction Mode используется автоматически через REST API. Наш код правильный! ✅

