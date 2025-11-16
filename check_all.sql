-- Проверка всех цен и миграций
SELECT 
  package_key,
  package_type,
  price_coins,
  price_stars,
  coins_amount,
  premium_days,
  is_active,
  CASE 
    WHEN price_stars IS NULL THEN '❌ price_stars НЕ УСТАНОВЛЕНО'
    ELSE '✅ OK'
  END as status
FROM pricing_packages
WHERE package_key IN (
  'premium_monthly', 
  'premium_yearly', 
  'premium_forever', 
  'coins_100', 
  'coins_500', 
  'coins_1200', 
  'coins_3000'
)
ORDER BY package_key;
