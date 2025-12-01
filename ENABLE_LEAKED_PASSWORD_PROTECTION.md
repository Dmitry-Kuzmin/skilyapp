# Включение защиты от утечек паролей (Leaked Password Protection)

## Что это?

Supabase Auth может проверять пароли через HaveIBeenPwned.org API, чтобы блокировать использование скомпрометированных паролей. Это защищает пользователей от использования паролей, которые были утечены в результате взломов.

## Как включить

### Вариант 1: Через Supabase Dashboard (рекомендуется)

**Важно:** Настройка находится НЕ в разделе Policies (это для RLS). Нужно искать в других разделах:

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
2. Перейдите в раздел **Authentication** (левый сайдбар)
3. В разделе **CONFIGURATION** найдите и откройте **"Advanced"** (не Policies!)
4. В разделе **Advanced** найдите секцию **"Password Security"** или **"Password Strength"**
5. Включите опцию **"Leaked Password Protection"** или **"Check passwords against HaveIBeenPwned"**
6. Сохраните изменения

**Альтернативные места для поиска:**
- **Authentication** → **Configuration** → **URL Configuration** (может быть там)
- **Authentication** → **Configuration** → **Attack Protection** (может быть там)
- **Authentication** → **Settings** (если есть такой раздел)

**Если не нашли:**
- Возможно, эта функция доступна только на плане Pro и выше
- Проверьте ваш тарифный план: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/billing

### Вариант 2: Через Management API

Если у вас есть доступ к Management API, можно включить через API:

```bash
curl -X PATCH \
  'https://api.supabase.com/v1/projects/yffjnqegeiorunyvcxkn/auth/config' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "password": {
      "leaked_password_protection": true
    }
  }'
```

### Вариант 3: Через Supabase CLI (если поддерживается)

```bash
supabase auth settings update --leaked-password-protection=true
```

## Важные замечания

1. **Приватность**: HaveIBeenPwned использует k-анонимность (первые 5 символов SHA-1 хеша), полный пароль не отправляется
2. **Производительность**: Проверка добавляет ~100-200ms к процессу регистрации/смены пароля
3. **Офлайн режим**: Если API недоступен, регистрация может быть заблокирована (зависит от настроек)

## После включения

- Новые пользователи не смогут использовать скомпрометированные пароли
- При смене пароля также будет проверка
- Пользователи получат понятное сообщение об ошибке, если пароль скомпрометирован

## Ссылки

- Документация: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- HaveIBeenPwned API: https://haveibeenpwned.com/API/v3

