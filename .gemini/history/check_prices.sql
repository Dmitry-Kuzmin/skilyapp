-- Проверка цен в pricing_packages
SELECT 
  package_key,
  package_type,
  price_coins,
  premium_days,
  coins_amount,
  title_ru,
  -- Расчет количества звезд (курс: 1 Star = 0.5 coins)
  ROUND(price_coins / 0.5) as stars_amount,
  is_active
FROM pricing_packages
WHERE package_key IN ('premium_monthly', 'premium_yearly', 'premium_forever', 'coins_100', 'coins_500', 'coins_1200', 'coins_3000')
ORDER BY package_key;
