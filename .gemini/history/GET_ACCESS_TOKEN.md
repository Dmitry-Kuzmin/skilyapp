# 🔑 Как получить Access Token для Supabase CLI

## Способ 1: Через Supabase CLI (рекомендуется)

1. Откройте терминал и выполните:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   supabase login
   ```

2. Откроется браузер для авторизации
3. После авторизации в терминале появится сообщение об успехе
4. Access Token будет сохранен автоматически

## Способ 2: Через Supabase Dashboard

1. Откройте: https://supabase.com/dashboard/account/tokens
2. Нажмите "Generate new token"
3. Скопируйте токен (он показывается только один раз!)

## Способ 3: Из конфига Supabase CLI

После `supabase login` токен сохраняется в:
- macOS/Linux: `~/.supabase/access-token`
- Windows: `%APPDATA%\supabase\access-token`

Можно скопировать токен оттуда.

---

# 🔐 Как получить Service Role Key

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
2. Найдите раздел "Project API keys"
3. Скопируйте "service_role" key (секретный!)
4. ⚠️ **ВНИМАНИЕ**: Этот ключ дает полный доступ к базе данных. Не делитесь им публично!

---

# 📋 Что делать дальше

После получения токена/ключа:

1. **Если у вас Access Token:**
   ```bash
   export SUPABASE_ACCESS_TOKEN="ваш-токен"
   ```

2. **Если у вас Service Role Key:**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ"
   ```

3. Сообщите мне, и я продолжу автоматически!

