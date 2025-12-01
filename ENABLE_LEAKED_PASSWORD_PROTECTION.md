# Включение защиты от утечек паролей (Leaked Password Protection)

## Что это?

Supabase Auth может проверять пароли через HaveIBeenPwned.org API, чтобы блокировать использование скомпрометированных паролей. Это защищает пользователей от использования паролей, которые были утечены в результате взломов.

## Как включить

### Вариант 1: Через Supabase Dashboard (рекомендуется)

**Точный путь:**
1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
2. Перейдите в раздел **Authentication** (левый сайдбар)
3. Откройте вкладку **"Settings"** (Настройки) - это НЕ Policies!
4. Найдите раздел **"Password Strength"** (Сложность пароля)
5. Активируйте опцию **"Prevent the use of leaked passwords"** (Предотвращать использование скомпрометированных паролей)
6. Сохраните изменения

**Важно:**
- Эта функция доступна только на тарифном плане **Pro и выше**
- Если не видите эту опцию, проверьте тариф: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/billing
- Настройка находится в **Settings**, а не в **Policies** (Policies - это для RLS таблиц)

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

