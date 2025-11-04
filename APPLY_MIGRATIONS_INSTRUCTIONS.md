# Инструкция по применению миграций и деплою

## 📋 Применение миграций базы данных

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. **Откройте SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
   ```

2. **Скопируйте содержимое файла `APPLY_MIGRATIONS.sql`** и вставьте в SQL Editor

3. **Нажмите "Run"** или `Ctrl+Enter` для выполнения

### Вариант 2: Через Supabase CLI (если установлен)

```bash
# Установите Supabase CLI (если еще не установлен)
npm install -g supabase

# Логин в Supabase
supabase login

# Свяжите проект
supabase link --project-ref ijijcrucqqnnjbkclqhb

# Примените миграции
supabase db push
```

## 🔄 Передеплой Edge Functions

### Вариант 1: Через Supabase Dashboard

1. **Откройте Edge Functions:**
   ```
   https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
   ```

2. **Найдите функцию `duel-manager`**

3. **Нажмите "Redeploy"** или обновите код через редактор

### Вариант 2: Через Supabase CLI

```bash
# Передеплой функции duel-manager
supabase functions deploy duel-manager
```

## ✅ Проверка после применения

1. **Проверьте миграции:**
   - Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/database/migrations
   - Убедитесь, что миграции применены

2. **Проверьте Edge Functions:**
   - Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions/duel-manager
   - Убедитесь, что функция обновлена

3. **Проверьте логи:**
   - Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions/duel-manager/logs
   - Проверьте, что нет ошибок


