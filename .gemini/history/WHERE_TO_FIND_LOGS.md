# Где найти логи Supabase Edge Function

## Способ 1: Через Dashboard (рекомендуется)

1. Откройте Supabase Dashboard:
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn

2. Перейдите в раздел **Functions** (в левом меню)

3. Найдите функцию **telegram-stars-payment** и нажмите на неё

4. Перейдите на вкладку **Logs**

5. Вы увидите все логи вызовов функции в реальном времени

## Способ 2: Прямая ссылка

Откройте напрямую:
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/telegram-stars-payment/logs

## Что искать в логах:

1. **Ошибки при вызове функции:**
   - Ищите записи с красным цветом или статусом "error"
   - Проверьте сообщения об ошибках

2. **Параметры запроса:**
   - `action: 'create_invoice'`
   - `user_id`, `package_key`, `telegram_user_id`

3. **Ошибки доступа к БД:**
   - "Package not found"
   - "RLS policy violation"
   - "Permission denied"

4. **Ошибки Telegram API:**
   - "Telegram API error"
   - "CURRENCY_TOTAL_AMOUNT_INVALID"
   - "Bad Request"

## Как скопировать логи:

1. Выделите нужные строки логов
2. Скопируйте (Ctrl+C / Cmd+C)
3. Вставьте сюда в чат

## Альтернатива: Проверка через CLI

Если у вас установлен Supabase CLI:
```bash
npx supabase functions logs telegram-stars-payment --project-ref yffjnqegeiorunyvcxkn
```

## Важно:

- Логи показывают только последние вызовы (обычно последние 100-1000 записей)
- Для более старых логов может потребоваться экспорт
- Логи обновляются в реальном времени при новых вызовах функции
