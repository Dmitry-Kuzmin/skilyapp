# Инструкции по применению миграций и перезапуску Edge Function

## Шаг 1: Применить миграции в Supabase

### Вариант А: Через Supabase Dashboard (рекомендуется)

1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в левом меню)
4. Создайте новый запрос
5. Скопируйте содержимое файла `APPLY_MIGRATIONS_NOW.sql`
6. Вставьте в SQL Editor
7. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)
8. Убедитесь, что нет ошибок

### Вариант Б: Проверить текущие миграции

Если нужно проверить, какие миграции уже применены:

```sql
-- Проверить политики для profiles
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Проверить политики для duel_notifications
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications';

-- Проверить, что таблица в Realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'duel_notifications';
```

## Шаг 2: Перезапустить Edge Function

### Вариант А: Через Supabase Dashboard (без CLI)

1. В **Supabase Dashboard** перейдите в **Edge Functions** (в левом меню)
2. Найдите функцию **duel-manager**
3. Нажмите на три точки (⋮) рядом с функцией
4. Выберите **Redeploy** или **Deploy**
5. Или откройте функцию и нажмите кнопку **Deploy**

### Вариант Б: Через CLI (если установлен)

```bash
# Установить Supabase CLI (если еще не установлен)
# macOS:
brew install supabase/tap/supabase

# Или через npm:
npm install -g supabase

# Авторизоваться
supabase login

# Привязать проект
supabase link --project-ref ijijcrucqqnnjbkclqhb

# Задеплоить функцию
supabase functions deploy duel-manager
```

## Шаг 3: Проверить результат

### Проверить логи Edge Function:

1. В **Supabase Dashboard** → **Edge Functions** → **duel-manager**
2. Перейдите на вкладку **Logs**
3. Проверьте, что нет ошибок при запуске

### Проверить уведомления:

1. Откройте консоль браузера (F12)
2. Создайте дуэль и присоединитесь к ней
3. Проверьте логи:
   - `[Notifications] ✅ Successfully subscribed to notifications`
   - `[Notifications] ✅ New notification received via Realtime`

### Проверить отображение имени соперника:

1. Создайте дуэль с двумя игроками
2. Убедитесь, что имя соперника отображается вместо "Соперник"

## Возможные проблемы:

### Если миграция не применяется:

1. Проверьте, что вы используете правильный проект
2. Убедитесь, что нет синтаксических ошибок
3. Проверьте логи в Supabase Dashboard → Logs

### Если функция не деплоится:

1. Проверьте, что файл `supabase/functions/duel-manager/index.ts` существует
2. Убедитесь, что нет синтаксических ошибок в коде
3. Проверьте логи деплоя в Supabase Dashboard

### Если уведомления все еще не работают:

1. Проверьте RLS политики:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'duel_notifications';
   ```

2. Проверьте Realtime publication:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE tablename = 'duel_notifications';
   ```

3. Проверьте логи в консоли браузера на наличие ошибок


