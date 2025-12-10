# 🚀 Деплой Edge Function claim-daily-bonus

## Проблема

Edge Function `claim-daily-bonus` возвращает **503 Service Unavailable**. Это означает, что функция либо не задеплоена, либо упала.

## Решение

### Вариант 1: Через Supabase CLI (рекомендуется)

```bash
# Убедитесь, что вы в корне проекта
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# Проверьте, что Supabase CLI установлен
supabase --version

# Если не установлен, установите:
# brew install supabase/tap/supabase

# Логиньтесь в Supabase (если еще не залогинены)
supabase login

# Свяжите проект с вашим Supabase проектом
supabase link --project-ref yffjnqegeiorunyvcxkn

# Задеплойте функцию
supabase functions deploy claim-daily-bonus
```

### Вариант 2: Через Supabase Dashboard

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите проект **sdadim-dgt-prep**
3. Перейдите в **Edge Functions**
4. Нажмите **Deploy a new function**
5. Выберите **Upload from file** или **Deploy from GitHub**
6. Загрузите файл `supabase/functions/claim-daily-bonus/index.ts`

### Вариант 3: Через GitHub Actions (если настроен CI/CD)

Если у вас настроен автоматический деплой через GitHub Actions, просто запушьте изменения:

```bash
git push
```

## Проверка после деплоя

1. Откройте Supabase Dashboard → Edge Functions → claim-daily-bonus
2. Проверьте статус функции (должна быть "Active")
3. Проверьте логи: Edge Functions → claim-daily-bonus → Logs
4. Попробуйте забрать ежедневный бонус в приложении

## Проверка переменных окружения

Убедитесь, что в Edge Function настроены переменные окружения:

1. Supabase Dashboard → Edge Functions → claim-daily-bonus → Settings
2. Проверьте наличие:
   - `SUPABASE_URL` - должен быть установлен автоматически
   - `SUPABASE_SERVICE_ROLE_KEY` - должен быть установлен автоматически

Если переменных нет, добавьте их вручную.

## Если функция все еще не работает

1. Проверьте логи Edge Function в Supabase Dashboard
2. Проверьте, что функция использует правильный Deno runtime
3. Убедитесь, что все зависимости доступны (в коде используются только стандартные библиотеки)

## Быстрая проверка через curl

После деплоя можно проверить функцию через curl:

```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/claim-daily-bonus \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "YOUR_USER_ID"}'
```

Замените `YOUR_ANON_KEY` и `YOUR_USER_ID` на реальные значения.
