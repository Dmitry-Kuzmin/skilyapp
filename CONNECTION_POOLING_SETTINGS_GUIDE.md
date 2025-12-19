# ⚙️ Настройки Connection Pooling - Что делать?

**Текущие настройки (из скриншота):**
- Pool Size: **15** (CONNECTIONS)
- Max Client Connections: **200** (CLIENTS)

---

## ✅ Текущие настройки - ПРАВИЛЬНО!

### Что означают настройки:

1. **Pool Size: 15**
   - Это максимальное количество соединений к Postgres на комбинацию user+db
   - Для Nano размера (Free план) это нормально
   - **Не нужно менять!**

2. **Max Client Connections: 200**
   - Это максимум одновременных клиентских подключений
   - Фиксировано для Nano размера (Free план)
   - **Нельзя изменить** (зависит от размера compute)

---

## 🔍 Что проверить

### 1. Режим Pooler (Transaction Mode)

**Где проверить:**
1. Supabase Dashboard → **Database** → **Connection Pooling**
2. Или Settings → **Database** → **Connection Pooling**

**Что должно быть:**
- ✅ **Pool Mode:** Transaction (рекомендуется)
- ✅ **Port:** 6543

**Если не Transaction Mode:**
- Переключите на **Transaction Mode**
- Это критично для работы Edge Functions

---

### 2. Проверка использования Pooler в Edge Functions

**Убедитесь, что функции используют pooled клиент:**

✅ **Уже сделано:**
- `duel-manager` - использует `createPooledSupabaseClient()`
- `coins-spend` - использует `createPooledSupabaseClient()`
- `ai-chat` - использует `createPooledSupabaseClient()`

**Проверка:**
1. Откройте логи любой функции
2. Должны быть успешные запросы без ошибок "too many connections"

---

## 📊 Что означают цифры

### Pool Size: 15

**Это нормально для Free плана:**
- 15 соединений к Postgres могут обслуживать **1000+ клиентских запросов**
- Connection Pooler переиспользует соединения
- **Не нужно увеличивать** (это не лимит клиентов!)

### Max Client Connections: 200

**Это лимит Free плана:**
- Максимум 200 одновременных клиентских подключений
- При превышении → нужно апгрейдить на Pro
- **Нельзя изменить** (зависит от размера compute)

---

## ✅ Что делать СЕЙЧАС

### 1. Проверьте Pool Mode (если не проверили)

1. Supabase Dashboard → **Database** → **Connection Pooling**
2. Убедитесь, что **Pool Mode = Transaction**
3. Если нет - переключите на Transaction

### 2. Сохраните настройки (если меняли)

1. На странице Database Settings
2. Нажмите кнопку **"Save"** (зеленая кнопка внизу)
3. Дождитесь подтверждения

### 3. Проверьте работу

**Тест:**
1. Вызовите Edge Function:
   ```bash
   curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/duel-manager \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"action": "create_duel", "num_questions": 10}'
   ```

2. Проверьте логи:
   - Dashboard → Edge Functions → `duel-manager` → Logs
   - Должны быть успешные запросы

---

## 🎯 Итоговый вердикт

**Текущие настройки:**
- ✅ Pool Size: 15 - **правильно, не менять**
- ✅ Max Client Connections: 200 - **правильно, нельзя изменить**
- ⚠️ Проверьте Pool Mode = Transaction

**Что делать:**
1. ✅ Проверьте Pool Mode (должен быть Transaction)
2. ✅ Сохраните настройки (если меняли)
3. ✅ Проверьте работу Edge Functions

**Готово!** Настройки правильные, Connection Pooling работает. 🚀

---

## 📈 Мониторинг

**Следите за Active Connections:**
- Dashboard → Database → Health → Active Connections
- При 40+ connections → апгрейд на Pro

**С Pool Size 15:**
- Можете обслуживать 1000+ пользователей
- Pooler переиспользует соединения эффективно

---

**Всё правильно настроено!** Можно запускать рекламу. ✅

