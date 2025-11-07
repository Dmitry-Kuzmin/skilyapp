# ✅ Проверка секретов GitHub

## 🔍 Как проверить, что секреты настроены правильно

### Шаг 1: Откройте настройки секретов

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
2. Войдите в GitHub, если потребуется

### Шаг 2: Проверьте список секретов

Вы должны увидеть **ДВА** секрета:

1. ✅ `VITE_SUPABASE_URL`
2. ✅ `VITE_SUPABASE_PUBLISHABLE_KEY`

### Шаг 3: Проверьте значения секретов

#### Для `VITE_SUPABASE_URL`:
1. Нажмите на секрет `VITE_SUPABASE_URL`
2. Нажмите **"Update"** (чтобы увидеть текущее значение)
3. Значение должно быть: `https://yffjnqegeiorunyvcxkn.supabase.co`
4. Если неправильно — обновите и сохраните

#### Для `VITE_SUPABASE_PUBLISHABLE_KEY`:
1. Нажмите на секрет `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Нажмите **"Update"** (чтобы увидеть текущее значение)
3. Значение должно:
   - ✅ Начинаться с `eyJ`
   - ✅ Иметь длину 200-400 символов
   - ✅ Не содержать лишних пробелов или кавычек
4. Если неправильно — обновите и сохраните

### Шаг 4: Если секрета `VITE_SUPABASE_PUBLISHABLE_KEY` нет

1. **Получите правильный ключ:**
   - Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
   - Перейдите в **Settings** → **API**
   - Найдите секцию **"Project API keys"**
   - Найдите ключ с меткой **"anon" "public"** (НЕ service_role!)
   - Скопируйте весь ключ

2. **Создайте секрет:**
   - Нажмите **"New repository secret"**
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY` (точно так!)
   - **Secret:** вставьте скопированный ключ
   - Нажмите **"Add secret"**

### Шаг 5: Удалите старые секреты (если есть)

Если у вас есть секрет с именем:
- ❌ `VITE_SUPABASE_ANON_KEY` (старое имя)
- ❌ `SUPABASE_ANON_KEY`
- ❌ Любое другое имя, кроме `VITE_SUPABASE_PUBLISHABLE_KEY`

**Удалите их:**
1. Нажмите на секрет
2. Нажмите **"Delete"**
3. Подтвердите удаление

### Шаг 6: Перезапустите workflow

**ВАЖНО:** После добавления/обновления секретов **ОБЯЗАТЕЛЬНО** перезапустите workflow!

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. Найдите последний workflow **"Deploy to GitHub Pages"**
3. Нажмите на него
4. Нажмите **"Re-run all jobs"** (кнопка справа вверху)
5. Подтвердите перезапуск
6. Дождитесь завершения (1-2 минуты)

### Шаг 7: Проверьте логи

После перезапуска проверьте логи:

1. Откройте последний workflow
2. Откройте job **"build"**
3. Найдите шаг **"Verify secrets are set"**
4. Проверьте вывод:
   - ✅ Должно быть: "✅ VITE_SUPABASE_URL is set"
   - ✅ Должно быть: "✅ VITE_SUPABASE_PUBLISHABLE_KEY is set"
   - ✅ Должно быть: "✅ All secrets are configured correctly!"

Если видите ошибки:
- ❌ "ERROR: VITE_SUPABASE_URL secret is not set!" — секрет не настроен
- ❌ "ERROR: VITE_SUPABASE_PUBLISHABLE_KEY secret is not set!" — секрет не настроен

### Шаг 8: Проверьте сайт

После успешного деплоя:
1. Откройте: https://dmitry-kuzmin.github.io/sdadim-dgt-prep/
2. Откройте консоль браузера (F12)
3. Проверьте, что нет ошибок о `VITE_SUPABASE_PUBLISHABLE_KEY`

## ⚠️ Частые ошибки

### Ошибка 1: Секрет не перезапущен после добавления
**Решение:** Обязательно перезапустите workflow после добавления секретов!

### Ошибка 2: Неправильное имя секрета
**Правильно:** `VITE_SUPABASE_PUBLISHABLE_KEY`
**Неправильно:** `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, и т.д.

### Ошибка 3: Неправильный ключ
**Правильно:** "anon" "public" ключ из Supabase Dashboard
**Неправильно:** service_role ключ (секретный!)

### Ошибка 4: Лишние символы
**Правильно:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**Неправильно:** `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."` (с кавычками)
**Неправильно:** ` eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... ` (с пробелами)

## 📋 Чеклист

- [ ] Секрет `VITE_SUPABASE_URL` существует
- [ ] Секрет `VITE_SUPABASE_PUBLISHABLE_KEY` существует
- [ ] Значение `VITE_SUPABASE_URL` правильное
- [ ] Значение `VITE_SUPABASE_PUBLISHABLE_KEY` правильное (начинается с `eyJ`)
- [ ] Старые секреты удалены
- [ ] Workflow перезапущен после добавления секретов
- [ ] В логах workflow нет ошибок о секретах
- [ ] Сайт открывается без ошибок в консоли

## 🔗 Полезные ссылки

- **GitHub Secrets**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- **API Settings**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- **Actions**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions

