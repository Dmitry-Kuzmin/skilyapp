# ✅ Чеклист перед деплоем Edge Functions

## 🔑 Шаг 1: Проверка секретов

### Критичные секреты (обязательны для всех функций):
- [ ] `SUPABASE_URL` - URL проекта
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key

### Секреты для check-pending-transactions:
- [ ] `CRYPTOMUS_MERCHANT_ID` (если используешь Cryptomus)
- [ ] `CRYPTOMUS_PAYMENT_KEY` (если используешь Cryptomus)
- [ ] `PADDLE_API_KEY` (если используешь Paddle)

### Как проверить:
1. Открой Supabase Dashboard → Edge Functions → Settings → Secrets
2. Убедись, что все секреты добавлены
3. Или через CLI: `supabase secrets list`

---

## 🚀 Шаг 2: Деплой функции

### Через Dashboard:
- [ ] Создана функция `check-pending-transactions`
- [ ] Код скопирован из `supabase/functions/check-pending-transactions/index.ts`
- [ ] Функция задеплоена (статус: Active)

### Через CLI:
- [ ] Выполнена команда: `supabase functions deploy check-pending-transactions --no-verify-jwt`
- [ ] Деплой успешен (нет ошибок)

---

## 🧪 Шаг 3: Smoke Test

### Простейший тест:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Проверь:**
- [ ] HTTP статус: 200 (не 500!)
- [ ] JSON ответ содержит поля: `results`, `total_checked`, `total_completed`
- [ ] В логах нет ошибок типа "Missing config"

**Если тест провален:**
- 🔴 **STOP!** Не иди дальше
- Проверь секреты
- Проверь логи функции
- Исправь ошибки

---

## 📊 Шаг 4: Проверка логов

- [ ] Открой Supabase Dashboard → Edge Functions → check-pending-transactions → Logs
- [ ] Убедись, что есть логи с префиксом `[check-pending]`
- [ ] Нет ошибок в логах

---

## 🔄 Шаг 5: Проверка GitHub Actions

- [ ] Workflow `.github/workflows/check-pending-transactions.yml` существует
- [ ] Секреты в GitHub настроены:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
- [ ] Workflow можно запустить вручную (Actions → Run workflow)

---

## ✅ Итоговая проверка

После выполнения всех шагов:
- [ ] Функция задеплоена и работает
- [ ] Секреты настроены
- [ ] Smoke Test пройден
- [ ] Логи доступны
- [ ] GitHub Actions настроен

**Статус:** 🟢 Готово к продакшену

---

## 🚨 Если что-то пошло не так

### Ошибка: "Missing config" или "CRYPTOMUS_MERCHANT_ID not configured"
**Решение:** Проверь секреты в Dashboard → Edge Functions → Settings → Secrets

### Ошибка: HTTP 500
**Решение:** 
1. Проверь логи функции
2. Проверь секреты
3. Проверь код функции на синтаксические ошибки

### Ошибка: "Function not found"
**Решение:** Убедись, что функция задеплоена (статус: Active)

---

**Готово!** После прохождения всех шагов функция готова к работе. 🎉

