# 🔑 Значения для настройки Cryptomus

## ✅ Найденные значения из вашего аккаунта

### 1. Merchant ID
```
4d822fef-9ba5-4840-a770-b168291864bc
```

### 2. Payment API Key
```
n49K********RNNK
```
⚠️ **При копировании вы получите полный ключ!**

---

## 📋 Что добавить в Supabase

**Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**

### Добавьте следующие секреты:

```
CRYPTOMUS_MERCHANT_ID=4d822fef-9ba5-4840-a770-b168291864bc
CRYPTOMUS_PAYMENT_KEY=полный_ключ_после_копирования
CRYPTOMUS_SUCCESS_URL=https://skilyapp.com/success
CRYPTOMUS_CANCEL_URL=https://skilyapp.com/cancel
```

---

## 🔍 Как скопировать Payment Key

1. В настройках мерчанта найдите **"Платежный API ключ"**
2. Нажмите на иконку **копирования** (📋) справа от ключа
3. Вставьте полный ключ в секрет `CRYPTOMUS_PAYMENT_KEY`

⚠️ **Не копируйте вручную** — используйте кнопку копирования, чтобы получить полный ключ!

---

## ✅ После настройки

1. ✅ Секреты добавлены в Supabase
2. ✅ Edge Functions задеплоены (уже сделано)
3. ✅ Webhook настроен в Cryptomus
4. ✅ Готово к тестированию!

---

**Готово!** Теперь Cryptomus полностью настроен. 🎉

