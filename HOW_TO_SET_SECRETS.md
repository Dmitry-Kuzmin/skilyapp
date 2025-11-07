# 🔐 Как создать секреты (Secrets) для Edge Functions

## 📍 Где создать секреты

### Вариант 1: Через настройки конкретной функции (рекомендуется)

1. **Откройте Edge Functions:**
   - В левом меню нажмите на **"Edge Functions"**
   - Или перейдите по прямой ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
     ```

2. **Выберите функцию `sync-google-sheets`:**
   - Найдите функцию в списке
   - Нажмите на неё

3. **Откройте настройки:**
   - В верхней части страницы функции найдите вкладку **"Settings"** или **"Secrets"**
   - Или перейдите по прямой ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings
     ```

4. **Добавьте секреты:**
   - Найдите раздел **"Secrets"** или **"Environment Variables"**
   - Нажмите **"Add Secret"** или **"New Secret"**
   - Добавьте каждый секрет по очереди:
     - **Name:** `SUPABASE_URL`
     - **Value:** `https://yffjnqegeiorunyvcxkn.supabase.co`
     - Нажмите **"Save"** или **"Add"**
   
   Повторите для остальных:
     - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
     - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw`
   
     - **Name:** `GOOGLE_SHEETS_ID`
     - **Value:** `ваш_id_таблицы_google_sheets` (замените на реальный ID)

### Вариант 2: Через Project Settings (общие секреты)

1. **Откройте Project Settings:**
   - В левом меню внизу нажмите на **"Project Settings"**
   - Или перейдите по прямой ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/general
     ```

2. **Перейдите в раздел Edge Functions:**
   - В меню слева выберите **"Edge Functions"** или **"Functions"**
   - Или перейдите по прямой ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
     ```

3. **Добавьте секреты:**
   - Найдите раздел **"Secrets"** или **"Environment Variables"**
   - Нажмите **"Add Secret"** или **"New Secret"**
   - Добавьте секреты (как в Варианте 1)

## 📋 Необходимые секреты

Для функции `sync-google-sheets` нужны следующие секреты:

### 1. SUPABASE_URL
- **Name:** `SUPABASE_URL`
- **Value:** `https://yffjnqegeiorunyvcxkn.supabase.co`

### 2. SUPABASE_SERVICE_ROLE_KEY
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw`

### 3. GOOGLE_SHEETS_ID
- **Name:** `GOOGLE_SHEETS_ID`
- **Value:** `ваш_id_таблицы_google_sheets`

**Как получить GOOGLE_SHEETS_ID:**
1. Откройте вашу таблицу Google Sheets
2. Посмотрите на URL в адресной строке
3. Найдите ID в URL:
   - Пример URL: `https://docs.google.com/spreadsheets/d/1ABC123XYZ456/edit`
   - ID: `1ABC123XYZ456` (часть между `/d/` и `/edit`)

## 🔗 Прямые ссылки

### Для функции sync-google-sheets:
- **Функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
- **Настройки функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings
- **Логи функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs

### Общие настройки:
- **Project Settings:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/general
- **Edge Functions Settings:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions

## ✅ После добавления секретов

1. **Сохраните изменения** (если нужно нажать кнопку "Save")
2. **Проверьте, что секреты добавлены** (они должны появиться в списке)
3. **Попробуйте синхронизировать снова** в приложении
4. **Проверьте логи**, если ошибка повторяется:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs
   ```

## ⚠️ Важные замечания

1. **Секреты чувствительны к регистру** - используйте точные имена: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SHEETS_ID`
2. **Не добавляйте пробелы** в начале или конце значений
3. **После добавления секретов** может потребоваться перезапуск функции (обычно происходит автоматически)
4. **Проверьте логи** после добавления секретов, чтобы убедиться, что они правильно загружены

## 🆘 Если не можете найти секреты

1. Убедитесь, что вы находитесь в правильном проекте: `yffjnqegeiorunyvcxkn`
2. Проверьте, что функция `sync-google-sheets` существует и задеплоена
3. Попробуйте обновить страницу (F5)
4. Проверьте, что у вас есть права администратора проекта

