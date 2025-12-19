# ✅ Финальный чеклист защиты

**Статус:** 🟡 Почти готово (90%)  
**Осталось:** 2 простых шага

---

## ✅ Что уже сделано

- [x] ✅ Upstash база данных создана
- [x] ✅ Секреты добавлены в Supabase
- [x] ✅ Rate Limiting добавлен в код:
  - [x] `duel-manager` (100 запросов/мин)
  - [x] `coins-spend` (50 запросов/мин)
  - [x] `ai-chat` (30 запросов/мин)
- [x] ✅ Миграция Feature Flags создана
- [x] ✅ Хук `useFeatureFlag` создан

---

## ⏭️ Что осталось сделать (15 минут)

### 1. Применить миграцию Feature Flags (5 минут)

**Шаги:**
1. Откройте Supabase Dashboard → SQL Editor
2. Откройте файл: `supabase/migrations/20250101000000_app_config_feature_flags.sql`
3. Скопируйте весь SQL код
4. Вставьте в SQL Editor и нажмите **Run**

**Проверка:**
```sql
SELECT * FROM app_config;
-- Должны быть 4 записи
```

---

### 2. Задеплоить Edge Functions (10 минут)

**Вариант A: Через Supabase CLI**
```bash
supabase functions deploy duel-manager
supabase functions deploy coins-spend
supabase functions deploy ai-chat
```

**Вариант B: Через Dashboard**
1. Supabase Dashboard → Edge Functions
2. Для каждой функции:
   - Откройте функцию
   - Нажмите **"Deploy"** или **"Redeploy"**

**Функции:**
- [ ] `duel-manager`
- [ ] `coins-spend`
- [ ] `ai-chat`

---

### 3. Отключить Spend Cap (2 минуты) - КРИТИЧНО

**Шаги:**
1. Supabase Dashboard → Settings → Billing
2. Найдите **"Spend Cap"** или **"Usage Limits"**
3. **Отключите** (переключите в OFF)
4. Сохраните

**Почему критично:** Без этого при достижении лимитов API перестанет отвечать.

---

## ✅ Проверка после деплоя

### Тест Rate Limiting:

1. **Нормальный запрос:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/duel-manager \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"action": "create_duel", "num_questions": 10}'
   ```
   Должен вернуть 200 OK

2. **Rate Limit:**
   - Сделайте 101 запрос подряд
   - После 100-го должен вернуть 429

### Тест Feature Flags:

```sql
-- В Supabase SQL Editor:
SELECT * FROM app_config;
-- Должны быть 4 записи
```

---

## 🎯 Итоговый статус

После выполнения всех шагов:

- ✅ Rate Limiting работает (защита от DDoS)
- ✅ Feature Flags готовы (можно отключать фичи)
- ✅ Spend Cap отключен (нет риска остановки)
- ✅ **Готово к запуску рекламы!** 🚀

---

## 📊 Готовность: 90% → 100%

**Осталось:** 15 минут работы

1. Применить миграцию (5 мин)
2. Задеплоить функции (10 мин)
3. Отключить Spend Cap (2 мин)

**После этого:** Полностью защищено и готово к запуску! 🛡️
