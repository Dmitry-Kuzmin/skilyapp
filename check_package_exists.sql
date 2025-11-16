-- Проверка существования пакета coins_100
SELECT 
  id,
  package_key,
  package_type,
  price_coins,
  price_stars,
  coins_amount,
  is_active,
  created_at,
  updated_at
FROM pricing_packages
WHERE package_key = 'coins_100';

-- Проверка всех пакетов монет
SELECT 
  package_key,
  is_active,
  price_coins,
  price_stars,
  coins_amount
FROM pricing_packages
WHERE package_type = 'coins'
ORDER BY package_key;
