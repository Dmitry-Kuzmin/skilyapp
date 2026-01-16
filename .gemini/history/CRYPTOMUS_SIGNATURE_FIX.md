# ✅ Исправление ошибки "Invalid Sign" в Cryptomus

## ❌ Проблема

Ошибка:
```
[cryptomus-payment] Cryptomus API error: {"message":"Invalid Sign."}
```

## ✅ Решение

Проблема была в формате подписи. Cryptomus использует **MD5**, а не SHA-256, и формат другой:

### Правильный формат подписи:
1. Кодируем JSON payload в **base64**
2. Объединяем base64 payload с **Payment Key**
3. Вычисляем **MD5** хэш от этой строки

### Что исправлено:

1. ✅ Обновлена функция `createSignature` в `cryptomus-payment`
2. ✅ Обновлена функция `createSignature` в `cryptomus-webhook`
3. ✅ Используется MD5 вместо SHA-256
4. ✅ Используется формат: `MD5(base64(payload) + secret)`

---

## 🧪 Тестирование

Попробуйте создать платеж через Cryptomus снова:

1. Откройте приложение
2. Попробуйте купить Premium или монеты
3. Выберите метод оплаты "Крипто"
4. Должна открыться страница оплаты Cryptomus

Если ошибка осталась, проверьте логи в Supabase Dashboard.

---

## 📋 Если ошибка осталась

1. **Проверьте логи** в Supabase Dashboard → Edge Functions → cryptomus-payment → Logs
2. **Проверьте секреты** - убедитесь, что `CRYPTOMUS_PAYMENT_KEY` правильный
3. **Пришлите логи** - я помогу исправить

---

**Готово!** Теперь подпись должна работать правильно. 🎉

