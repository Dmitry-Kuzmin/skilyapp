# ✅ Проверка Connection Pooling (Порт 6543)

**Критично:** Убедитесь, что Edge Functions используют Connection Pooler

---

## 🔍 Как проверить

### Способ 1: Проверка через Supabase Dashboard

1. **Откройте Supabase Dashboard:**
   - Database → **Connection Pooling**
   - Или Settings → **Database** → **Connection Pooling**

2. **Проверьте настройки:**
   - Должен быть включен **Connection Pooler**
   - Режим: **Transaction** (рекомендуется)
   - Порт: **6543**

3. **Проверьте использование:**
   - Database → **Health** → **Active Connections**
   - При нагрузке должно быть **< 10** подключений (pooler переиспользует)

---

### Способ 2: Проверка через логи Edge Functions

1. **Вызовите функцию:**
   ```bash
   curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/duel-manager \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "create_duel", "num_questions": 10}'
   ```

2. **Проверьте логи:**
   - Supabase Dashboard → Edge Functions → `duel-manager` → **Logs**
   - Не должно быть ошибок типа "too many connections"

---

### Способ 3: Нагрузочное тестирование

**Тест:**
1. Запустите 100 одновременных запросов:
   ```bash
   for i in {1..100}; do
     curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/duel-manager \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -d '{"action": "create_duel", "num_questions": 10}' &
   done
   wait
   ```

2. **Проверьте Active Connections:**
   - Dashboard → Database → Health → Active Connections
   - **С Pooler:** Должно быть 5-10 подключений
   - **Без Pooler:** Было бы 100 подключений → превышение лимита

---

## ✅ Что должно быть

### Правильно (с Pooler):
- ✅ Active Connections: **< 10** при 100 запросах
- ✅ Нет ошибок "too many connections"
- ✅ Все запросы успешны

### Неправильно (без Pooler):
- ❌ Active Connections: **> 50** при 100 запросах
- ❌ Ошибки "too many connections" при 60+ запросах
- ❌ Запросы начинают падать

---

## 🚨 Если Pooler не работает

### Проблема: Active Connections > 50

**Решение:**
1. Проверьте, что функции используют `createPooledSupabaseClient()`
2. Передеплойте функции:
   ```bash
   supabase functions deploy duel-manager
   supabase functions deploy coins-spend
   supabase functions deploy ai-chat
   ```

3. Проверьте настройки Connection Pooler в Dashboard

---

## 📊 Мониторинг в час "Ч"

### Критичные метрики:

| Метрика | Значение | Действие |
|---------|----------|----------|
| **Active Connections** | 0-30 | ✅ Всё хорошо |
| **Active Connections** | 30-50 | ⚠️ Приближаемся к лимиту |
| **Active Connections** | 40-50 | 🚨 **СРОЧНО:** Апгрейд на Pro! |
| **Active Connections** | 50-60 | 🔴 **КРИТИЧНО:** Проект может упасть |

### Где смотреть:
- Supabase Dashboard → **Database** → **Health** → **Active Connections**

---

**Готово!** После проверки вы будете уверены, что Pooler работает. ✅

