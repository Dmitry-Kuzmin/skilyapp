# 🔍 Отладка webhook Cryptomus

## ✅ Что сделано

1. ✅ Добавлено детальное логирование всех заголовков
2. ✅ Webhook временно работает без проверки подписи (для тестирования)
3. ✅ Функция задеплоена

---

## 📋 Что делать дальше

### Шаг 1: Проверьте webhook в Cryptomus

1. Откройте **Cryptomus Dashboard** → **Настройки** → **Webhooks**
2. Нажмите **"Проверить"** или **"Test"** на вашем webhook
3. Или создайте тестовый платеж

### Шаг 2: Посмотрите логи в Supabase

1. Откройте **Supabase Dashboard** → **Edge Functions** → **cryptomus-webhook** → **Logs**
2. Найдите последние записи после теста webhook
3. Скопируйте логи, особенно:
   - `All headers:` — все заголовки, которые пришли
   - `Signature from header:` — какая подпись была получена
   - `Payload received:` — тело запроса

### Шаг 3: Отправьте мне логи

Пришлите мне логи, и я помогу:
- Определить, в каком заголовке Cryptomus отправляет подпись
- Исправить код для правильной проверки подписи
- Включить проверку подписи обратно

---

## 🔍 Что искать в логах

### Хорошие логи (всё работает):
```
[cryptomus-webhook] All headers: { "sign": "...", "content-type": "..." }
[cryptomus-webhook] Signature from header: abc123...
[cryptomus-webhook] ✅ Signature verified
```

### Проблемные логи (нужна помощь):
```
[cryptomus-webhook] Missing signature. Available headers: ["content-type", "user-agent"]
```

---

## ⚠️ Временное решение

Сейчас webhook работает **без проверки подписи** (только для тестирования). Это небезопасно для продакшена!

После того, как мы найдем правильный заголовок подписи, я:
1. Исправлю код для правильной проверки
2. Включу проверку подписи обратно
3. Задеплою исправленную версию

---

## 📝 Пример того, что нужно прислать

```
[cryptomus-webhook] All headers: {
  "content-type": "application/json",
  "user-agent": "Cryptomus/1.0",
  "sign": "abc123def456..."
}
```

Или если подписи нет:
```
[cryptomus-webhook] Missing signature. Available headers: ["content-type", "user-agent"]
```

---

**Готово!** Теперь проверьте webhook и пришлите логи. 🎉

