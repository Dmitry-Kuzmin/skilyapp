# ⚠️ ВАЖНО: Переместите секреты в Repository secrets!

## ❌ Проблема

Секреты находятся в **"Environment secrets"** для окружения `github-pages`, но они нужны в **"Repository secrets"**!

В workflow секреты используются на этапе **build**, который выполняется ДО deploy, поэтому они должны быть доступны на уровне репозитория.

## ✅ Решение

### Шаг 1: Создайте секреты в Repository secrets

1. На странице секретов найдите раздел **"Repository secrets"**
2. Нажмите кнопку **"New repository secret"**

### Шаг 2: Создайте секрет `VITE_SUPABASE_URL`

1. **Name:** `VITE_SUPABASE_URL`
2. **Secret:** `https://yffjnqegeiorunyvcxkn.supabase.co`
3. Нажмите **"Add secret"**

### Шаг 3: Создайте секрет `VITE_SUPABASE_PUBLISHABLE_KEY`

1. **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`
2. **Secret:** скопируйте значение из Environment secret (или получите заново из Supabase)
3. Нажмите **"Add secret"**

### Шаг 4: Удалите старые Environment secrets (опционально)

После создания Repository secrets можно удалить Environment secrets:

1. В разделе **"Environment secrets"** нажмите на секрет
2. Нажмите **"Delete"**
3. Подтвердите удаление

**Или оставьте их** — они не помешают, просто не будут использоваться.

### Шаг 5: Перезапустите workflow

**ОБЯЗАТЕЛЬНО** перезапустите workflow после создания Repository secrets:

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. Найдите последний workflow "Deploy to GitHub Pages"
3. Нажмите **"Re-run all jobs"**
4. Дождитесь завершения

## 📋 Итоговый результат

После выполнения всех шагов у вас должно быть:

### Repository secrets (должны быть):
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY`

### Environment secrets (можно оставить или удалить):
- `VITE_SUPABASE_URL` (в окружении github-pages)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (в окружении github-pages)

## 🔍 Почему это важно?

- **Repository secrets** доступны на всех этапах workflow (включая build)
- **Environment secrets** доступны только в шагах с указанным environment
- В нашем workflow секреты нужны на этапе **build**, который выполняется БЕЗ environment
- Поэтому они должны быть в **Repository secrets**

## ✅ Проверка

После создания Repository secrets и перезапуска workflow:

1. Откройте последний workflow
2. Откройте job **"build"**
3. Найдите шаг **"Verify secrets are set"**
4. Проверьте вывод:
   - ✅ Должно быть: "✅ VITE_SUPABASE_URL is set"
   - ✅ Должно быть: "✅ VITE_SUPABASE_PUBLISHABLE_KEY is set"
   - ✅ Должно быть: "✅ All secrets are configured correctly!"

Если видите ошибки — секреты все еще не в Repository secrets.

