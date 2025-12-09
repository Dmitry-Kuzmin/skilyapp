-- Шаг 1: Проверка price_stars для Telegram Stars
-- Запусти этот SQL в Supabase Dashboard → SQL Editor

SELECT 
  package_key, 
  title_ru,
  price_coins,
  price_stars,
  CASE 
    WHEN price_stars IS NULL THEN '❌ MISSING'
    WHEN price_stars < 1 THEN '❌ TOO LOW (< 1)'
    WHEN price_stars > 10000 THEN '❌ TOO HIGH (> 10000)'
    ELSE '✅ OK'
  END as status,
  CASE
    WHEN price_stars IS NULL THEN 'Нужно заполнить price_stars'
    WHEN price_stars < 1 THEN 'Минимум 1 Star'
    WHEN price_stars > 10000 THEN 'Максимум 10000 Stars'
    ELSE 'Готово к тестированию'
  END as recommendation
FROM pricing_packages
WHERE is_active = true
ORDER BY 
  CASE 
    WHEN price_stars IS NULL THEN 1
    WHEN price_stars < 1 THEN 2
    WHEN price_stars > 10000 THEN 3
    ELSE 4
  END,
  package_key;

