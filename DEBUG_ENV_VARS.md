# 🔍 Отладка переменных окружения

## Проблема: "supabaseUrl is required"

Эта ошибка означает, что переменные окружения не передаются в собранное приложение.

## ✅ Решение

### 1. Проверьте секреты в GitHub

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
2. Убедитесь, что есть оба секрета:
   - `VITE_SUPABASE_URL` = `https://yffjnqegeiorunyvcxkn.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = ваш anon key (начинается с `eyJ`)

### 2. Проверьте правильность значений

**VITE_SUPABASE_URL:**
```
https://yffjnqegeiorunyvcxkn.supabase.co
```

**VITE_SUPABASE_PUBLISHABLE_KEY:**
- Должен начинаться с `eyJ`
- Длина обычно 200-400 символов
- Это "anon" "public" ключ из Supabase Dashboard

### 3. Как получить правильный ключ

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
2. Перейдите в **Settings** → **API**
3. Найдите секцию **"Project API keys"**
4. Скопируйте ключ с меткой **"anon" "public"** (НЕ service_role!)
5. Добавьте его в GitHub Secrets как `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Перезапустите workflow

После обновления секретов:

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. Найдите последний workflow "Deploy to GitHub Pages"
3. Нажмите **"Re-run all jobs"** или сделайте новый push

### 5. Проверьте логи сборки

В логах GitHub Actions проверьте:

1. Откройте последний workflow
2. Откройте job **"build"**
3. Проверьте шаг **"Build"**
4. Убедитесь, что нет ошибок о переменных окружения

## 🐛 Если проблема сохраняется

### Вариант 1: Проверьте формат секретов

Убедитесь, что в секретах нет:
- Лишних пробелов в начале или конце
- Переносов строк
- Кавычек (если они не нужны)

### Вариант 2: Пересоздайте секреты

1. Удалите старые секреты
2. Создайте новые с правильными именами:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Вставьте правильные значения
4. Сохраните

### Вариант 3: Проверьте workflow файл

Убедитесь, что в `.github/workflows/deploy.yml` используется правильное имя:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
```

## 📋 Чеклист

- [ ] Секрет `VITE_SUPABASE_URL` существует и правильный
- [ ] Секрет `VITE_SUPABASE_PUBLISHABLE_KEY` существует и правильный
- [ ] Ключ начинается с `eyJ` (JWT формат)
- [ ] Ключ имеет правильную длину (200-400 символов)
- [ ] Workflow перезапущен после обновления секретов
- [ ] В логах нет ошибок о переменных окружения

## 🔗 Полезные ссылки

- **GitHub Secrets**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- **API Settings**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- **Actions**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions

