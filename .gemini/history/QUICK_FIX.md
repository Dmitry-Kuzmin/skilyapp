# 🚀 Быстрое исправление: Миграции и перезапуск функции

## ⚡ Шаг 1: Применить миграцию (5 минут)

### Через Supabase Dashboard:

1. **Откройте Supabase Dashboard**: https://supabase.com/dashboard
2. **Выберите проект** (project_id: `ijijcrucqqnnjbkclqhb`)
3. Перейдите в **SQL Editor** (в левом меню, иконка "SQL Editor")
4. Нажмите **New Query**
5. **Скопируйте и вставьте** содержимое файла `APPLY_MIGRATIONS_NOW.sql`
6. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)
7. Дождитесь сообщения: `✅ Successfully ran query`

### Проверка результата:

После выполнения миграции вы должны увидеть в результатах:
- `✅ Table duel_notifications is in supabase_realtime publication`
- `✅ Profiles policy created successfully`
- `✅ Notifications policy created successfully`

---

## ⚡ Шаг 2: Перезапустить Edge Function (2 минуты)

### Через Supabase Dashboard (БЕЗ CLI):

1. В **Supabase Dashboard** найдите **Edge Functions** в левом меню
2. Найдите функцию **duel-manager**
3. Нажмите на **три точки** (⋮) рядом с функцией
4. Выберите **Redeploy** или **Deploy**
5. Или откройте функцию и нажмите кнопку **Deploy** в правом верхнем углу

### Альтернативный способ:

1. Откройте **Edge Functions** → **duel-manager**
2. Перейдите на вкладку **Code**
3. Нажмите кнопку **Deploy** (в правом верхнем углу)
4. Дождитесь завершения деплоя

---

## ✅ Шаг 3: Проверить результат

### Проверить логи:

1. В **Edge Functions** → **duel-manager** → **Logs**
2. Убедитесь, что нет ошибок при запуске функции

### Проверить в приложении:

1. **Откройте консоль браузера** (F12)
2. **Создайте дуэль** и присоединитесь к ней
3. **Проверьте логи в консоли:**
   - `[Notifications] ✅ Successfully subscribed to notifications`
   - `[Notifications] ✅ New notification received via Realtime`
4. **Проверьте, что имя соперника отображается** вместо "Соперник"

---

## 🐛 Если что-то не работает:

### Проверить политики:

Выполните в SQL Editor:

```sql
-- Проверить политики для profiles
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';

-- Проверить политики для duel_notifications
SELECT * FROM pg_policies 
WHERE tablename = 'duel_notifications';

-- Проверить Realtime publication
SELECT * FROM pg_publication_tables 
WHERE tablename = 'duel_notifications';
```

### Проверить логи Edge Function:

1. **Edge Functions** → **duel-manager** → **Logs**
2. Ищите ошибки при запуске дуэли
3. Проверьте, что `[create_notification] ✅ Notification created successfully`

---

## 📝 Файлы для применения:

- **`APPLY_MIGRATIONS_NOW.sql`** - применить в SQL Editor
- **`DEPLOY_INSTRUCTIONS.md`** - подробные инструкции
- **`QUICK_FIX.md`** - эта инструкция (быстрый старт)


