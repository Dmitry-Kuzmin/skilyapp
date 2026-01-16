# 🔧 Исправление проблемы синхронизации с Google Sheets

## ❌ Проблема

Ошибка: "Edge Function returned a non-2xx status code" при попытке синхронизации базы тестов.

## 🔍 Причины

Edge Function `sync-google-sheets` может не работать по следующим причинам:

1. **Функция не задеплоена** - функция не развернута в Supabase
2. **Отсутствуют secrets** - не настроены переменные окружения
3. **Проблема с авторизацией** - пользователь не авторизован или нет роли admin
4. **Отсутствует GOOGLE_SHEETS_ID** - не указан ID таблицы Google Sheets

## ✅ Решение

### Шаг 1: Проверьте, задеплоена ли функция

1. Откройте Dashboard:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
   ```

2. Проверьте, есть ли функция `sync-google-sheets` в списке

3. Если функции нет, задеплойте её:

   **Вариант A: Через Supabase CLI (рекомендуется)**
   ```bash
   # Убедитесь, что вы в корне проекта
   cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
   
   # Логин в Supabase (если еще не залогинены)
   supabase login
   
   # Свяжите проект (если еще не связан)
   supabase link --project-ref yffjnqegeiorunyvcxkn
   
   # Задеплойте функцию
   supabase functions deploy sync-google-sheets
   ```

   **Вариант B: Через Supabase Dashboard**
   - Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
   - Нажмите "Create a new function"
   - Выберите "Deploy from local file"
   - Укажите путь: `supabase/functions/sync-google-sheets`

### Шаг 2: Настройте переменные окружения (Secrets)

1. Откройте настройки функции:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings
   ```

2. Добавьте следующие secrets:

   **Обязательные secrets:**
   - `SUPABASE_URL` = `https://yffjnqegeiorunyvcxkn.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw`
   - `GOOGLE_SHEETS_ID` = `ваш_id_таблицы_google_sheets`

   **Как получить GOOGLE_SHEETS_ID:**
   - Откройте вашу таблицу Google Sheets
   - Скопируйте ID из URL
   - Пример URL: `https://docs.google.com/spreadsheets/d/1ABC123XYZ456/edit`
   - ID: `1ABC123XYZ456`

3. Нажмите "Save" для сохранения secrets

### Шаг 3: Проверьте роль администратора

Убедитесь, что у пользователя есть роль `admin`:

```bash
# Проверьте роль пользователя
node scripts/grant-admin-role.js Kuzmin.public@gmail.com
```

Или проверьте вручную:
1. Откройте SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Выполните запрос:
   ```sql
   SELECT u.email, ur.role
   FROM auth.users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   WHERE u.email = 'Kuzmin.public@gmail.com';
   ```

### Шаг 4: Проверьте доступ к Google Sheets

1. Убедитесь, что таблица Google Sheets доступна:
   - Таблица должна быть **публичной** (Anyone with the link can view)
   - Или настроен доступ для сервисного аккаунта

2. Проверьте структуру таблицы:
   - Должны быть листы: `Topics` и `Questions`
   - Формат колонок должен соответствовать ожидаемому

### Шаг 5: Проверьте логи функции

1. Откройте логи:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs
   ```

2. Попробуйте синхронизировать снова и проверьте логи на наличие ошибок

## 🔧 Быстрая проверка

Запустите скрипт для проверки:

```bash
node scripts/check-sync-function.js
```

Этот скрипт проверит:
- Существование функции
- Наличие необходимых таблиц
- Роли администраторов
- Другие настройки

## 📋 Чеклист

- [ ] Функция `sync-google-sheets` задеплоена
- [ ] Настроены secrets:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `GOOGLE_SHEETS_ID`
- [ ] У пользователя есть роль `admin`
- [ ] Google Sheets таблица доступна публично
- [ ] Таблица имеет листы `Topics` и `Questions`
- [ ] Проверены логи функции

## 🚀 После настройки

1. **Выйдите и войдите снова** в приложение (чтобы обновить токен)
2. Попробуйте синхронизировать снова
3. Проверьте логи, если ошибка повторяется

## 📞 Если проблема не решена

1. Проверьте логи функции в Dashboard
2. Проверьте консоль браузера (F12) на наличие ошибок
3. Убедитесь, что все secrets настроены правильно
4. Проверьте, что Google Sheets таблица доступна

---

## 🔗 Полезные ссылки

- **Edge Functions:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
- **Secrets:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings
- **Логи:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs
- **SQL Editor:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

