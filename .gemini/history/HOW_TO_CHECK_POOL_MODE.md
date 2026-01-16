# 🔍 Как проверить Pool Mode (Transaction Mode)

**Где найти:** Supabase Dashboard → Database → Connection Pooling

---

## 📋 Пошаговая инструкция

### Шаг 1: Откройте Supabase Dashboard

1. Перейдите на: https://supabase.com/dashboard
2. Выберите ваш проект (`yffjnqegeiorunyvcxkn`)

### Шаг 2: Откройте раздел Database

**Вариант A (через левое меню):**
1. В левом меню найдите **"Database"** (иконка домика 🏠)
2. Нажмите на него
3. В подменю найдите **"Connection Pooling"**
4. Нажмите на него

**Вариант B (через Settings):**
1. В левом меню найдите **"Settings"** (иконка шестеренки ⚙️)
2. Нажмите на него
3. В подменю найдите **"Database"**
4. Нажмите на него
5. Найдите раздел **"Connection Pooling"** или **"Connection pooling configuration"**

### Шаг 3: Проверьте Pool Mode

На странице Connection Pooling вы увидите:

**Что искать:**
- **Pool Mode** или **Mode**
- Должно быть: **"Transaction"** или **"Transaction Mode"**

**Если видите:**
- ✅ **"Transaction"** → Всё правильно, ничего не нужно менять!
- ⚠️ **"Session"** → Нужно переключить на Transaction
- ⚠️ Другой режим → Переключите на Transaction

---

## 🎯 Альтернативный путь (если не нашли)

### Через Database Settings:

1. **Database** → **Settings** (в левом меню под Database)
2. Найдите раздел **"Connection pooling configuration"**
3. Там должен быть указан **Pool Mode**

---

## 📸 Что вы должны увидеть

На странице Connection Pooling должно быть что-то вроде:

```
Connection Pooling
─────────────────
Pool Mode: Transaction ✅
Port: 6543
Pool Size: 15
Max Client Connections: 200
```

Или в настройках:

```
Connection pooling configuration
────────────────────────────────
SHARED POOLER
Pool Size: 15 CONNECTIONS
Max Client Connections: 200 CLIENTS
```

---

## ✅ Если Pool Mode = Transaction

**Всё правильно!** Ничего не нужно менять.

Connection Pooling работает в правильном режиме.

---

## ⚠️ Если Pool Mode ≠ Transaction

**Что делать:**
1. Найдите кнопку **"Edit"** или **"Change"** рядом с Pool Mode
2. Выберите **"Transaction"** или **"Transaction Mode"**
3. Нажмите **"Save"** или **"Update"**
4. Дождитесь подтверждения

---

## 🔍 Если не можете найти

**Попробуйте:**
1. **Database** → **Connection Pooling** (прямая ссылка)
2. Или в поиске Dashboard введите: **"pooling"**
3. Или **Settings** → **Database** → прокрутите вниз до Connection Pooling

---

## 💡 Важно

**Если вы на странице Database Settings (как на скриншоте):**
- Там показаны настройки Pool Size и Max Client Connections
- Но Pool Mode может быть на другой странице
- Перейдите в **Database** → **Connection Pooling** для проверки режима

---

## ✅ Итог

**Если Pool Mode = Transaction:**
- ✅ Всё правильно
- ✅ Connection Pooling работает
- ✅ Можно запускать рекламу

**Если Pool Mode НЕ ВИДЕН (как у вас):**
- ✅ **Это нормально для Free плана!**
- ✅ Если видите **"SHARED POOLER"** → Pooler включен
- ✅ На Free плане Pool Mode **всегда Transaction** (по умолчанию)
- ✅ **Ничего не нужно менять!**

**Как проверить, что всё работает:**
1. Проверьте Connection String (должен быть порт 6543)
2. Проверьте Active Connections (должно быть < 10 при нагрузке)
3. Проверьте логи Edge Functions (не должно быть ошибок)

---

**Готово!** Если видите "SHARED POOLER" - всё правильно. Pool Mode = Transaction по умолчанию. ✅

