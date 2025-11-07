# 🔍 Проверка GitHub Secrets

## Как проверить правильность VITE_SUPABASE_ANON_KEY

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. **Откройте Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
   ```

2. **Перейдите в Settings → API:**
   - В левом меню выберите **Settings** (⚙️)
   - Затем выберите **API**

3. **Найдите секцию "Project API keys":**
   - Найдите ключ с меткой **"anon" "public"**
   - Это тот ключ, который должен быть в `VITE_SUPABASE_ANON_KEY`
   - ⚠️ **НЕ используйте** ключ с меткой **"service_role"** (это секретный ключ!)

4. **Скопируйте ключ:**
   - Ключ должен начинаться с `eyJ` (это JWT токен)
   - Длина обычно 200-400 символов

### Вариант 2: Проверка через скрипт

1. **Установите переменные окружения:**
   ```bash
   export VITE_SUPABASE_URL="https://yffjnqegeiorunyvcxkn.supabase.co"
   export VITE_SUPABASE_ANON_KEY="ваш_ключ_здесь"
   ```

2. **Запустите скрипт проверки:**
   ```bash
   node scripts/check-github-secrets.js
   ```

### Вариант 3: Проверка в GitHub

1. **Откройте настройки секретов:**
   ```
   https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
   ```

2. **Проверьте секреты:**
   - `VITE_SUPABASE_URL` должен быть: `https://yffjnqegeiorunyvcxkn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` должен начинаться с `eyJ` и быть длиной 200-400 символов

3. **Если нужно изменить:**
   - Нажмите на секрет
   - Выберите "Update"
   - Вставьте правильное значение
   - Сохраните

## ✅ Правильные значения

### VITE_SUPABASE_URL
```
https://yffjnqegeiorunyvcxkn.supabase.co
```

### VITE_SUPABASE_ANON_KEY
- **Формат:** JWT токен (начинается с `eyJ`)
- **Длина:** 200-400 символов
- **Тип:** "anon" "public" ключ (НЕ service_role!)
- **Где найти:** Supabase Dashboard → Settings → API → "anon" "public"

## ⚠️ Важные замечания

1. **НЕ используйте service_role ключ** — это секретный ключ с полным доступом!
2. **Используйте только anon/public ключ** — это безопасный публичный ключ
3. **Ключ должен начинаться с `eyJ`** — это признак JWT токена
4. **Длина ключа** обычно 200-400 символов

## 🔗 Полезные ссылки

- **Supabase Dashboard:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- **API Settings:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- **GitHub Secrets:** https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions

## 🐛 Если ключ неправильный

1. **Проверьте в Supabase Dashboard:**
   - Убедитесь, что используете правильный проект (`yffjnqegeiorunyvcxkn`)
   - Скопируйте ключ заново из Settings → API

2. **Обновите в GitHub:**
   - Откройте секреты
   - Обновите `VITE_SUPABASE_ANON_KEY`
   - Сохраните изменения

3. **Перезапустите workflow:**
   - Откройте Actions
   - Запустите workflow вручную или сделайте новый push

