# 🔧 Настройка OAuth Redirect URL в Supabase

## ❌ Проблема

В логах Supabase видно, что редирект идет на главную страницу (`https://skilyapp.com/`), а не на `/dashboard`, хотя в коде указан `redirectTo: /dashboard`.

## ✅ Решение

Нужно добавить правильные Redirect URLs в настройках Google OAuth провайдера в Supabase.

### Шаг 1: Откройте настройки Auth провайдеров

Перейдите по ссылке:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/auth/providers
```

Или:
1. Откройте Supabase Dashboard
2. Перейдите в **Authentication** → **Providers**
3. Найдите **Google** провайдер
4. Нажмите на него для редактирования

### Шаг 2: Добавьте Redirect URLs

В разделе **Redirect URLs** добавьте следующие URL:

```
https://skilyapp.com/dashboard
https://skilyapp.com/
https://skilyapp.com
```

**ВАЖНО:** 
- Все три URL должны быть добавлены
- `/dashboard` - для правильного редиректа после OAuth
- `/` и без слеша - для совместимости

### Шаг 3: Проверьте Site URL

В настройках проекта (Settings → API) убедитесь, что:
- **Site URL** = `https://skilyapp.com`
- **Redirect URLs** содержат все необходимые пути

### Шаг 4: Сохраните изменения

Нажмите **Save** или **Update** для сохранения настроек.

## 🔍 Проверка

После настройки:

1. Попробуйте войти через Google
2. Проверьте логи Supabase - `referer` должен быть `https://skilyapp.com/dashboard`
3. После входа вы должны попасть на `/dashboard`, а не на `/`

## 📝 Примечание

Supabase может игнорировать `redirectTo` из кода, если в настройках провайдера указаны другие URL. Поэтому важно настроить правильные Redirect URLs в Dashboard.

