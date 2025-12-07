# 🔍 Инструкция по отладке OAuth

## Шаг 1: Проверка токенов в hash

После редиректа с Google, открой консоль браузера и выполни:

```javascript
console.log('Hash:', window.location.hash);
console.log('Has access_token:', window.location.hash.includes('access_token'));
```

**Что должно быть:**
- Если есть токены - hash должен содержать `access_token=...&refresh_token=...`
- Если нет токенов - hash пустой или содержит что-то другое

## Шаг 2: Проверка логов OAuthCallbackHandler

После редиректа проверь консоль на наличие логов:
- `[OAuthCallbackHandler] Component mounted/updated, checking for OAuth tokens...`
- `[OAuthCallbackHandler] Checking hash: ...`

**Если логов нет:**
- Компонент не монтируется
- Или токены уже очищены до обработки

## Шаг 3: Проверка сессии в localStorage

Выполни в консоли:

```javascript
// Проверка ключа Supabase сессии
const keys = Object.keys(localStorage).filter(k => k.includes('auth'));
console.log('Auth keys in localStorage:', keys);

// Проверка конкретного ключа
const sessionKey = 'sb-yffjnqegeiorunyvcxkn-auth-token';
const session = localStorage.getItem(sessionKey);
console.log('Session in localStorage:', session ? 'EXISTS' : 'NOT FOUND');
if (session) {
  try {
    const parsed = JSON.parse(session);
    console.log('Session user:', parsed.user?.email);
    console.log('Session expires_at:', new Date(parsed.expires_at * 1000));
  } catch (e) {
    console.error('Error parsing session:', e);
  }
}
```

## Шаг 4: Проверка сессии через Supabase

Выполни:

```javascript
import { supabase } from '@/integrations/supabase/client';
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session from Supabase:', data.session?.user?.email || 'NO SESSION');
  console.log('Error:', error);
});
```

## Что делать дальше

Пришли результаты всех проверок - это поможет найти проблему!

