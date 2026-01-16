# 🚀 Миграция на собственный Supabase проект

## ✅ Что уже сделано

1. ✅ Обновлен `supabase/config.toml` с новым project_id: `yffjnqegeiorunyvcxkn`
2. ✅ Обновлены все скрипты с новым project_id
3. ✅ Создан `.env.local` с новыми ключами
4. ✅ Обновлены все URL в скриптах

## 📋 Следующие шаги

### Шаг 1: Связать проект с Supabase CLI

```bash
# Авторизуйтесь в Supabase (если еще не авторизованы)
supabase login

# Свяжите проект
supabase link --project-ref yffjnqegeiorunyvcxkn
```

Или используйте автоматическую настройку:
```bash
npm run supabase:setup
```

### Шаг 2: Применить все миграции

В новом проекте нужно применить все 53 миграции из папки `supabase/migrations/`:

**Вариант 1: Через Supabase CLI (рекомендуется)**
```bash
supabase db push
```

**Вариант 2: Через скрипт**
```bash
npm run supabase:apply-migrations
```

**Вариант 3: Вручную через SQL Editor**
1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Примените каждую миграцию по порядку (по дате в имени файла)

### Шаг 3: Задеплоить Edge Functions

Задеплойте все Edge Functions в новый проект:

```bash
# Деплой всех функций
npm run supabase:deploy ai-chat
npm run supabase:deploy sync-google-sheets
npm run supabase:deploy duel-manager
npm run supabase:deploy telegram-auth
npm run supabase:deploy apply-sql
npm run supabase:deploy execute-sql
```

Или через Supabase CLI:
```bash
supabase functions deploy ai-chat
supabase functions deploy sync-google-sheets
supabase functions deploy duel-manager
supabase functions deploy telegram-auth
supabase functions deploy apply-sql
supabase functions deploy execute-sql
```

### Шаг 4: Настроить Secrets для Edge Functions

В Supabase Dashboard → Settings → Edge Functions → Secrets добавьте:

1. **SUPABASE_URL**: `https://yffjnqegeiorunyvcxkn.supabase.co`
2. **SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA`
3. **SUPABASE_SERVICE_ROLE_KEY**: Получите из Settings → API → service_role key (секретный!)
4. **LOVABLE_API_KEY**: Если используется (получите из Lovable Dashboard)

### Шаг 5: Получить Service Role Key и Database URL

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
2. Скопируйте **service_role** key (секретный!)
3. Добавьте в `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/database
5. Скопируйте **Connection string** (URI mode)
6. Добавьте в `.env.local`:
   ```env
   SUPABASE_DB_URL=postgres://postgres:password@db.yffjnqegeiorunyvcxkn.supabase.co:5432/postgres?sslmode=prefer
   ```

### Шаг 6: Экспорт и импорт данных (если нужно)

Если у вас есть данные в старом проекте, которые нужно перенести:

1. **Экспорт из старого проекта:**
   - В Supabase Dashboard старого проекта: Database → Backups → Create backup
   - Или экспортируйте данные через SQL Editor

2. **Импорт в новый проект:**
   - Через SQL Editor в новом проекте
   - Или через Supabase CLI: `supabase db restore <backup-file>`

### Шаг 7: Проверить работу

1. Запустите проект:
   ```bash
   npm run dev
   ```

2. Проверьте подключение к базе данных
3. Проверьте работу Edge Functions
4. Проверьте аутентификацию

## 🔗 Полезные ссылки

- **Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- **SQL Editor**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
- **API Settings**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- **Database Settings**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/database

## ⚠️ Важно

1. **Service Role Key** - это секретный ключ! Никогда не коммитьте его в Git
2. **Database URL** содержит пароль - также секретный
3. Файл `.env.local` уже в `.gitignore` и не будет закоммичен
4. После миграции можно удалить старый проект Lovable Cloud (если не нужен)

## ✅ Проверочный список

- [ ] Связан проект с Supabase CLI
- [ ] Применены все миграции
- [ ] Задеплоены все Edge Functions
- [ ] Настроены Secrets для Edge Functions
- [ ] Добавлен Service Role Key в `.env.local`
- [ ] Добавлен Database URL в `.env.local`
- [ ] Протестирована работа приложения
- [ ] Экспортированы данные из старого проекта (если нужно)
- [ ] Импортированы данные в новый проект (если нужно)

## 🆘 Если что-то пошло не так

1. Проверьте, что все переменные окружения установлены правильно
2. Проверьте логи Edge Functions в Dashboard
3. Проверьте логи миграций
4. Убедитесь, что все миграции применены в правильном порядке
5. Проверьте RLS политики в Database → Policies

---

**Готово!** Теперь у вас есть полный контроль над вашей базой данных Supabase! 🎉

