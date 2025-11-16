-- Проверка что функция доступна и пакеты существуют
SELECT 
  package_key,
  price_coins,
  price_stars,
  is_active
FROM pricing_packages
WHERE package_key = 'coins_100';
