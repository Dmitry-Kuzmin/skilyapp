# Инструкция: Создание bucket для обложек тестов

## Способ 1: Через Supabase Dashboard (SQL Editor) - Рекомендуется

### Шаг 1: Откройте SQL Editor
1. Зайдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. В левом меню найдите **"SQL Editor"** (или перейдите по прямой ссылке: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`)

### Шаг 2: Скопируйте и выполните SQL
Скопируйте весь код из файла `CREATE_TEST_COVERS_BUCKET.sql` и вставьте в SQL Editor, затем нажмите **"Run"** (или `Ctrl+Enter` / `Cmd+Enter`)

### Шаг 3: Проверка
1. Перейдите в **Storage** → **Buckets**
2. Убедитесь, что bucket `test-covers` создан
3. Проверьте, что он публичный (Public = true)

---

## Способ 2: Через Supabase Dashboard (Storage UI) - Альтернатива

### Шаг 1: Откройте Storage
1. Зайдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. В левом меню найдите **"Storage"** → **"Buckets"**

### Шаг 2: Создайте новый bucket
1. Нажмите кнопку **"New bucket"**
2. Заполните форму:
   - **Name:** `test-covers`
   - **Public bucket:** ✅ Включите (галочка должна быть установлена)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** `image/jpeg, image/jpg, image/png, image/webp`
3. Нажмите **"Create bucket"**

### Шаг 3: Настройте RLS политики (через SQL Editor)
После создания bucket через UI, выполните в SQL Editor только политики из файла `CREATE_TEST_COVERS_BUCKET.sql` (часть с `CREATE POLICY`)

---

## Что делает этот SQL?

1. **Создает bucket `test-covers`:**
   - Публичный доступ (любой может просматривать)
   - Лимит размера файла: 5MB
   - Разрешенные форматы: JPG, PNG, WEBP

2. **Создает RLS политики:**
   - Просмотр: доступно всем (публичный bucket)
   - Загрузка/обновление/удаление: только аутентифицированным пользователям

---

## После создания bucket

После успешного создания bucket:
1. Обновите страницу `/admin/test-covers`
2. Попробуйте загрузить обложку для любой темы
3. Если всё работает — bucket создан правильно!

---

## Если возникли проблемы

**Ошибка "Bucket already exists":**
- Bucket уже создан, можно пропустить этот шаг

**Ошибка "Permission denied":**
- Убедитесь, что вы вошли как владелец проекта или имеете права администратора

**Ошибка при загрузке файла:**
- Проверьте, что bucket публичный (Public = true)
- Проверьте, что RLS политики созданы правильно
- Проверьте размер файла (не должен превышать 5MB)

