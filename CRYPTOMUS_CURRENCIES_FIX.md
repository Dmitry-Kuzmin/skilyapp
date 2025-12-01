# ✅ Исправление ошибки валидации currencies в Cryptomus

## ❌ Проблема

Ошибка:
```
[cryptomus-payment] Cryptomus API error: {
  "state": 1,
  "errors": {
    "currencies.0.currency": ["validation.required"],
    "currencies.1.currency": ["validation.required"],
    "currencies.2.currency": ["validation.required"],
    "currencies.3.currency": ["validation.required"]
  }
}
```

## ✅ Решение

Cryptomus API ожидает массив **объектов** с полем `currency`, а не массив строк.

### Неправильно:
```typescript
currencies: ["USDT", "BTC", "ETH", "TRX"]
```

### Правильно:
```typescript
currencies: [
  { currency: "USDT" },
  { currency: "BTC" },
  { currency: "ETH" },
  { currency: "TRX" }
]
```

---

## ✅ Что исправлено

1. ✅ Обновлен формат массива `currencies` в `cryptomus-payment`
2. ✅ Функция задеплоена

---

## 🧪 Тестирование

Попробуйте создать платеж через Cryptomus снова:

1. Откройте приложение
2. Попробуйте купить Premium или монеты
3. Выберите метод оплаты "Крипто"
4. Должна открыться страница оплаты Cryptomus

---

**Готово!** Теперь формат currencies правильный. 🎉

