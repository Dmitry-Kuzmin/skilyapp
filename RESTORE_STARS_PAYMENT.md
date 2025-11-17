# Восстановление системы оплаты Telegram Stars после отката

## Шаг 1: Применить миграции базы данных

Откройте Supabase Dashboard:
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

Скопируйте и выполните содержимое файла `APPLY_MIGRATIONS_IN_ORDER.sql`

Это добавит:
- Поле `price_stars` в таблицу `pricing_packages`
- Правильные цены в Stars для всех пакетов
- Исправит RLS политики
- Гарантирует наличие всех пакетов монет

## Шаг 2: Проверить Edge Function

Убедитесь, что Edge Function `telegram-stars-payment` задеплоена:

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase functions deploy telegram-stars-payment
```

## Шаг 3: Проверить переменные окружения

В Supabase Dashboard → Edge Functions → Settings убедитесь, что есть:
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота

## Шаг 4: Проверить код компонентов

Убедитесь, что все компоненты используют правильные расчеты:
- ✅ `StarsPaymentButton.tsx` - использует `price_stars` из БД
- ✅ `telegram-stars-payment/index.ts` - использует `price_stars` из БД
- ✅ `PaywallModal.tsx` - показывает кнопку Stars в Telegram

## Проверка результата

После применения миграций выполните в SQL Editor:

```sql
SELECT 
  package_key,
  is_active,
  price_coins,
  price_stars,
  coins_amount,
  title_ru
FROM pricing_packages
WHERE package_type = 'coins' OR package_key LIKE 'premium%'
ORDER BY package_key;
```

Должны быть видны:
- coins_100: price_stars = 198
- coins_500: price_stars = 660
- coins_1200: price_stars = 1321
- coins_3000: price_stars = 2644
- premium_monthly: price_stars = 660
- premium_forever: price_stars = 3966
