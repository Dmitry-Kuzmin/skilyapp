# 🔍 Проверка логов Edge Function claim-daily-bonus

## Проблема

Edge Function возвращает `BOOT_ERROR: Function failed to start (please check logs)`.

## Решение

### Шаг 1: Проверьте логи в Supabase Dashboard

1. Откройте https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
2. Найдите функцию `claim-daily-bonus`
3. Нажмите на неё
4. Перейдите на вкладку **Logs**
5. Посмотрите последние логи - там должна быть информация об ошибке

### Шаг 2: Возможные причины BOOT_ERROR

1. **Синтаксическая ошибка** - проверьте логи на наличие ошибок компиляции
2. **Проблема с импортами** - возможно, версия библиотеки несовместима
3. **Проблема с переменными окружения** - проверьте, что `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` установлены

### Шаг 3: Проверка переменных окружения

```bash
supabase secrets list | grep -E "SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY"
```

Должны быть установлены:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Шаг 4: Альтернативное решение

Если проблема сохраняется, попробуйте:

1. Удалить функцию и создать заново:
```bash
supabase functions delete claim-daily-bonus
supabase functions deploy claim-daily-bonus --no-verify-jwt
```

2. Или проверить, что файл `supabase/functions/claim-daily-bonus/index.ts` не содержит синтаксических ошибок

### Шаг 5: Проверка через Dashboard

1. Откройте Supabase Dashboard → Edge Functions → claim-daily-bonus
2. Проверьте статус функции (должна быть "Active")
3. Проверьте версию функции (должна быть последняя)
4. Посмотрите логи - там должна быть детальная информация об ошибке

## Что делать дальше

После проверки логов:
1. Скопируйте ошибку из логов
2. Исправьте проблему в коде
3. Задеплойте функцию снова

Если проблема не решается, пришлите логи из Supabase Dashboard.

