# 🚀 Деплой Rate Limiting

**Статус:** ✅ Rate Limiting добавлен в код  
**Что дальше:** Задеплоить функции в Supabase

---

## 📋 Что сделано

- ✅ Rate Limiting добавлен в `duel-manager` (лимит: 100/мин)
- ✅ Rate Limiting добавлен в `coins-spend` (лимит: 50/мин)
- ✅ Rate Limiting добавлен в `ai-chat` (лимит: 30/мин)

---

## 🚀 Деплой функций

### Вариант 1: Через Supabase CLI (рекомендуется)

```bash
# Деплой всех функций с rate limiting
supabase functions deploy duel-manager
supabase functions deploy coins-spend
supabase functions deploy ai-chat
```

### Вариант 2: Через Supabase Dashboard

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Выберите ваш проект
   - Перейдите в **Edge Functions**

2. **Для каждой функции:**
   - Откройте функцию (например, `duel-manager`)
   - Нажмите **"Deploy"** или **"Redeploy"**
   - Дождитесь завершения деплоя

3. **Функции для деплоя:**
   - [ ] `duel-manager`
   - [ ] `coins-spend`
   - [ ] `ai-chat`

---

## ✅ Проверка работы

### Тест 1: Нормальный запрос

```bash
# Должен вернуть 200 OK
curl -X POST https://your-project.supabase.co/functions/v1/duel-manager \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "create_duel", "num_questions": 10}'
```

### Тест 2: Rate Limit

```bash
# Сделайте 101 запрос подряд
for i in {1..101}; do
  curl -X POST https://your-project.supabase.co/functions/v1/duel-manager \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action": "create_duel", "num_questions": 10}'
  echo "Request $i"
done
```

**Ожидаемый результат:**
- Первые 100 запросов: 200 OK
- 101-й запрос: 429 Rate Limit Exceeded

---

## 📊 Мониторинг

После деплоя проверьте:

1. **Логи в Supabase:**
   - Edge Functions → `duel-manager` → Logs
   - Должны быть сообщения о rate limiting

2. **Upstash Dashboard:**
   - Проверьте количество команд Redis
   - Должны быть записи `INCR` и `EXPIRE`

---

## 🎯 Итоговый статус

После деплоя:

- ✅ Rate Limiting работает
- ✅ Защита от DDoS активна
- ✅ Готово к запуску рекламы! 🚀

---

**Следующий шаг:** Применить миграцию Feature Flags (см. `NEXT_STEPS_AFTER_SECRETS.md`)

