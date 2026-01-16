# Исправление ошибки оплаты через Telegram Stars

## Проблема
Ошибка 404 при попытке оплаты через Telegram Stars. URL в ошибке: `yffingegeiorunyvcxkn` (неправильный)

## Решение

### 1. Примените миграцию RLS политик
Выполните в Supabase Dashboard -> SQL Editor:
```sql
-- Исправление RLS политик для pricing_packages
DROP POLICY IF EXISTS "Anyone can view active pricing packages" ON public.pricing_packages;

CREATE POLICY "Anyone can view active pricing packages"
  ON public.pricing_packages FOR SELECT
  USING (is_active = true);

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
```

### 2. Перезапустите dev сервер с очисткой кэша
```bash
# Остановите текущий сервер (Ctrl+C)
# Удалите кэш Vite
rm -rf node_modules/.vite
# Запустите заново
npm run dev
```

### 3. Очистите кэш браузера
- Откройте DevTools (F12)
- Правой кнопкой на кнопку обновления -> "Очистить кэш и жесткая перезагрузка"
- Или Ctrl+Shift+R (Cmd+Shift+R на Mac)

### 4. Проверьте переменные окружения
В консоли браузера (F12) должно быть:
```
🔧 Supabase Configuration: {
  url: "https://yffjnqegeiorunyvcxkn.supabase.co"
}
```

Если URL неправильный - перезапустите dev сервер.

### 5. Проверьте логи Edge Function
Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/telegram-stars-payment/logs

Ищите ошибки при вызове функции.

## Если проблема сохраняется

1. Проверьте, что миграция `20250120000007_add_price_stars_field.sql` применена
2. Проверьте, что все Edge Functions задеплоены:
   - telegram-stars-payment ✅
   - manage-session ✅
   - register-device ✅
3. Проверьте секреты Edge Function:
   - TELEGRAM_BOT_TOKEN
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
