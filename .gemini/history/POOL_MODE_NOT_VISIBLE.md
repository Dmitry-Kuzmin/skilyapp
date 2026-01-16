# ✅ Pool Mode не виден - это нормально!

**Важно:** На странице Database Settings Pool Mode может не отображаться явно. Это нормально для Free плана.

---

## ✅ Как понять, что Pool Mode правильный

### Признак 1: "SHARED POOLER"

**Если вы видите:**
- ✅ **"SHARED POOLER"** в секции Connection pooling configuration
- ✅ Pool Size: 15
- ✅ Max Client Connections: 200

**Это означает:**
- ✅ Connection Pooler **включен**
- ✅ На Free плане Pool Mode **всегда Transaction** (по умолчанию)
- ✅ Всё работает правильно!

---

### Признак 2: Проверка через Connection String

**Где проверить:**
1. На той же странице Database Settings
2. Найдите раздел **"Connection string"** или **"Connection info"**
3. Или перейдите: Settings → **Database** → прокрутите вниз

**Что искать:**
- Connection string должен содержать: **`:6543`** (порт pooler)
- Или: **`pooler.supabase.com`**

**Если видите порт 6543:**
- ✅ Pooler работает
- ✅ Pool Mode = Transaction

---

### Признак 3: Проверка через мониторинг

**Самый надежный способ:**

1. **Вызовите Edge Function:**
   ```bash
   curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/duel-manager \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"action": "create_duel", "num_questions": 10}'
   ```

2. **Проверьте Active Connections:**
   - Dashboard → **Database** → **Health** → **Active Connections**
   - Должно быть **< 10** подключений (pooler переиспользует)

**Если подключений мало:**
- ✅ Pooler работает правильно
- ✅ Pool Mode = Transaction

---

## 🎯 Итоговый вердикт

**Если вы видите "SHARED POOLER":**
- ✅ Connection Pooler **включен**
- ✅ Pool Mode = **Transaction** (по умолчанию на Free плане)
- ✅ **Ничего не нужно менять!**

**На Free плане:**
- Pool Mode всегда Transaction
- Нельзя изменить (это фиксированная настройка)
- Всё работает правильно

---

## ✅ Что делать

**Ничего не нужно делать!**

1. ✅ "SHARED POOLER" виден → Pooler включен
2. ✅ Pool Size: 15 → Правильно для Free плана
3. ✅ Max Client Connections: 200 → Правильно для Free плана
4. ✅ Pool Mode = Transaction (по умолчанию, не отображается)

**Всё настроено правильно!** Можно запускать рекламу. 🚀

---

## 🔍 Дополнительная проверка (опционально)

Если хотите убедиться на 100%:

1. **Проверьте Connection String:**
   - Settings → Database → Connection string
   - Должен быть порт **6543** или **pooler.supabase.com**

2. **Проверьте логи Edge Functions:**
   - Dashboard → Edge Functions → `duel-manager` → Logs
   - Не должно быть ошибок "too many connections"

3. **Проверьте Active Connections:**
   - Dashboard → Database → Health → Active Connections
   - При нагрузке должно быть < 10 подключений

---

**Вывод:** Если видите "SHARED POOLER" - всё правильно! Pool Mode = Transaction по умолчанию. ✅

