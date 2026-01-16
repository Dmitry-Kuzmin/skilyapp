# 🔧 СРОЧНО: Исправление секретов GitHub

## ❌ Проблема

Ошибка в консоли: `VITE_SUPABASE_PUBLISHABLE_KEY is not set!`

Это означает, что секреты либо не настроены, либо имеют неправильные имена.

## ✅ Решение (пошагово)

### Шаг 1: Откройте настройки секретов

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
2. Войдите в GitHub, если потребуется

### Шаг 2: Проверьте существующие секреты

Убедитесь, что есть **ОБА** секрета:

- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY`

### Шаг 3: Если секретов нет или они неправильные

#### 3.1. Создайте/обновите `VITE_SUPABASE_URL`:

1. Нажмите **"New repository secret"** (если секрета нет)
2. Или нажмите на существующий секрет и выберите **"Update"**
3. **Name:** `VITE_SUPABASE_URL`
4. **Secret:** `https://yffjnqegeiorunyvcxkn.supabase.co`
5. Нажмите **"Add secret"** или **"Update secret"**

#### 3.2. Создайте/обновите `VITE_SUPABASE_PUBLISHABLE_KEY`:

1. **Получите правильный ключ:**
   - Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
   - Перейдите в **Settings** → **API**
   - Найдите секцию **"Project API keys"**
   - Найдите ключ с меткой **"anon" "public"** (НЕ service_role!)
   - Скопируйте весь ключ (он начинается с `eyJ`)

2. **Добавьте секрет:**
   - Нажмите **"New repository secret"**
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY` (ВАЖНО: именно это имя!)
   - **Secret:** вставьте скопированный ключ
   - Нажмите **"Add secret"**

### Шаг 4: Удалите старые секреты (если есть)

Если у вас есть секрет с именем `VITE_SUPABASE_ANON_KEY`:
1. Нажмите на него
2. Нажмите **"Delete"**
3. Подтвердите удаление

### Шаг 5: Перезапустите workflow

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. Найдите последний workflow **"Deploy to GitHub Pages"**
3. Нажмите на него
4. Нажмите **"Re-run all jobs"** (кнопка справа вверху)
5. Подтвердите перезапуск

### Шаг 6: Дождитесь завершения

1. Дождитесь завершения workflow (обычно 1-2 минуты)
2. Проверьте, что все шаги выполнены успешно (зеленые галочки)
3. Откройте сайт: https://dmitry-kuzmin.github.io/sdadim-dgt-prep/

## ✅ Проверка правильности секретов

### VITE_SUPABASE_URL должен быть:
```
https://yffjnqegeiorunyvcxkn.supabase.co
```

### VITE_SUPABASE_PUBLISHABLE_KEY должен:
- ✅ Начинаться с `eyJ` (JWT формат)
- ✅ Иметь длину 200-400 символов
- ✅ Быть "anon" "public" ключом (НЕ service_role!)
- ✅ Не содержать лишних пробелов или кавычек

## ⚠️ Частые ошибки

1. **Неправильное имя секрета:**
   - ❌ `VITE_SUPABASE_ANON_KEY` (старое имя)
   - ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` (правильное имя)

2. **Неправильный ключ:**
   - ❌ service_role ключ (секретный!)
   - ✅ anon/public ключ (публичный)

3. **Лишние символы:**
   - ❌ Ключ с пробелами в начале/конце
   - ❌ Ключ в кавычках
   - ✅ Чистый ключ без лишних символов

## 🔗 Полезные ссылки

- **GitHub Secrets**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- **API Settings**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- **Actions**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions

## 📋 Чеклист

После настройки секретов проверьте:

- [ ] Секрет `VITE_SUPABASE_URL` существует и правильный
- [ ] Секрет `VITE_SUPABASE_PUBLISHABLE_KEY` существует и правильный
- [ ] Ключ начинается с `eyJ`
- [ ] Ключ имеет правильную длину (200-400 символов)
- [ ] Workflow перезапущен
- [ ] Все шаги workflow выполнены успешно
- [ ] Сайт открывается без ошибок в консоли

