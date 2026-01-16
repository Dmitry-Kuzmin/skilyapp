# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ - Применить НЕМЕДЛЕННО!

## ❌ Проблема
- Игра не запускается
- Edge Function возвращает 500 ошибку
- Ошибки "mismatch between server and client bindings"

## ✅ Решение (2 минуты)

### Шаг 1: Получить Service Role Key (если нужно)

**Способ 1: Через Dashboard (рекомендуется)**
1. Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/settings/api
2. Найдите "service_role" key
3. Скопируйте его

**Способ 2: Через временную функцию**
1. Задеплойте функцию `get-service-key` (если еще не задеплоена)
2. Откройте: https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key
3. Скопируйте `service_role_key` из ответа
4. **УДАЛИТЕ функцию** сразу после получения ключа!

### Шаг 2: Применить миграцию

**Через SQL Editor (рекомендуется):**

1. Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
2. Скопируйте **ВСЁ** содержимое файла `URGENT_FIX.sql`
3. Вставьте в SQL Editor
4. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)
5. Проверьте, что нет ошибок

**Или через скрипт (если есть Service Role Key):**

```bash
export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ"
node scripts/apply-urgent-fix-direct.js
```

### Шаг 3: Перезагрузить страницу

После применения миграции:
1. Перезагрузите страницу в браузере (F5)
2. Проверьте, что игра запускается
3. Проверьте консоль - ошибки должны исчезнуть

---

## 📄 Файл для применения

**`URGENT_FIX.sql`** - содержит все необходимые исправления

---

## ⚠️ После получения Service Role Key

1. **Сохраните ключ** в `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=ваш-ключ
   ```

2. **УДАЛИТЕ временную функцию** `get-service-key`:
   - Dashboard → Edge Functions → get-service-key → Delete
   - Или удалите папку `supabase/functions/get-service-key/`

3. **Удалите секцию** из `supabase/config.toml`:
   ```toml
   [functions.get-service-key]
   verify_jwt = false
   ```

---

## ✅ Проверка результата

После применения миграции:

1. ✅ Игра должна запускаться без ошибки 500
2. ✅ Ошибки "mismatch" должны исчезнуть
3. ✅ Имя соперника должно отображаться
4. ✅ Уведомления должны работать (после перезагрузки страницы)


