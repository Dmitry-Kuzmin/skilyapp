# ✅ Неделя 4: Готовность к деплою

## 🎯 Статус: Инструкции готовы

Все инструкции обновлены с учетом критических замечаний CTO.

---

## 📋 Что обновлено

### 1. ✅ Secrets Management
- **Добавлено предупреждение:** Edge Functions НЕ видят локальный `.env` файл!
- **Добавлена команда:** `supabase secrets set` для заливки секретов через CLI
- **Добавлена проверка:** Чеклист для проверки секретов перед деплоем

### 2. ✅ Smoke Testing
- **Добавлена секция:** Простейший тест сразу после деплоя
- **Добавлено правило:** Если Smoke Test провален — STOP! Не иди дальше
- **Добавлен чеклист:** Пошаговая проверка после деплоя

### 3. ✅ CORS
- **Проверено:** Функция `check-pending-transactions` обрабатывает OPTIONS запросы
- **Отмечено:** Для функций, вызываемых с фронтенда, нужно проверить CORS

---

## 🚀 Готово к деплою

### Файлы с инструкциями:
1. **`DEPLOY_CHECK_PENDING_TRANSACTIONS.md`** - Полная инструкция по задеплою
2. **`DEPLOYMENT_CHECKLIST.md`** - Пошаговый чеклист перед деплоем
3. **`WEEK4_PLAN.md`** - Обновленный план с учетом замечаний CTO

### Команды для деплоя:

```bash
# 1. Залить секреты (КРИТИЧНО!)
supabase secrets set CRYPTOMUS_MERCHANT_ID=... CRYPTOMUS_PAYMENT_KEY=... PADDLE_API_KEY=...

# 2. Задеплоить функцию
supabase functions deploy check-pending-transactions --no-verify-jwt

# 3. Smoke Test
curl -X POST https://your-project.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## ✅ Чеклист перед деплоем

- [ ] Секреты залиты в облако (Dashboard или CLI)
- [ ] Функция задеплоена
- [ ] Smoke Test пройден (HTTP 200, не 500)
- [ ] Логи доступны и читаемы
- [ ] GitHub Actions настроен

---

## 🎯 Следующий шаг

**Начать деплой!**

1. Следуй инструкции в `DEPLOY_CHECK_PENDING_TRANSACTIONS.md`
2. Используй чеклист из `DEPLOYMENT_CHECKLIST.md`
3. После деплоя сделай Smoke Test
4. Отчитайся: "Функции в облаке, секреты прописаны, hello-world работает"

---

**Готово к старту!** 🚀

