# 🚀 БЫСТРЫЕ ШАГИ - Применить сейчас!

## ✅ Service Role Key получен!

Теперь нужно:

---

## 📋 Шаг 1: Применить миграцию (2 минуты)

1. **Откройте SQL Editor**:
   ```
   https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
   ```

2. **Скопируйте ВСЁ содержимое** файла `APPLY_NOW.sql` (или `URGENT_FIX.sql`)

3. **Вставьте** в SQL Editor

4. **Нажмите Run** (или `Ctrl+Enter` / `Cmd+Enter`)

5. **Проверьте**: должно появиться "Success" ✅

---

## 📋 Шаг 2: Удалить функцию get-service-key (1 минута)

1. **Откройте Edge Functions**:
   ```
   https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
   ```

2. **Найдите** функцию `get-service-key`

3. **Нажмите три точки** (⋮) → **Delete**

4. **Подтвердите** удаление

---

## 📋 Шаг 3: Сохранить Service Role Key (30 секунд)

Создайте или отредактируйте `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWpjcnVjcXFubmpia2NscWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxMTU2MSwiZXhwIjoyMDc2OTg3NTYxfQ.lvySjbh9dH89sgx0LxIF0PeBPRQse27jZwuXFqVzCeM
```

⚠️ **НЕ коммитьте** `.env.local` в Git!

---

## 📋 Шаг 4: Перезагрузить страницу

1. **Перезагрузите** страницу в браузере (F5)
2. **Проверьте**, что игра запускается без ошибок
3. **Проверьте** консоль - ошибки должны исчезнуть

---

## ✅ Проверка результата

После применения миграции:

- ✅ Игра запускается без ошибки 500
- ✅ Ошибки "mismatch" исчезли
- ✅ Имя соперника отображается
- ✅ Уведомления работают

---

## 🔗 Прямые ссылки

- **SQL Editor**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions


