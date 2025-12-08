-- ============================================
-- Проверка и заполнение price_stars в pricing_packages
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- 1. ПРОВЕРКА: Смотрим текущее состояние
-- ============================================
SELECT 
  id,
  package_key,
  title_ru,
  price_coins,
  price_stars,
  premium_days,
  coins_amount,
  is_active
FROM pricing_packages
WHERE is_active = true
ORDER BY package_key;

-- 2. ПРОВЕРКА: Есть ли NULL значения в price_stars
-- ============================================
SELECT 
  COUNT(*) as total_packages,
  COUNT(price_stars) as packages_with_stars_price,
  COUNT(*) - COUNT(price_stars) as packages_without_stars_price
FROM pricing_packages
WHERE is_active = true;

-- 3. ЗАПОЛНЕНИЕ: Обновляем price_stars для всех активных пакетов
-- ============================================
-- Формула: Цена в Stars рассчитывается на основе цены в EUR с учетом комиссии Telegram (30%)
-- Расчет: euros / 0.7 (комиссия 30%) / 0.02161 (цена 1 звезды) = stars
-- 
-- Примеры расчетов:
-- €2.99 → €4.27 → 198 звёзд
-- €9.99 → €14.27 → 660 звёзд
-- €19.99 → €28.56 → 1321 звёзд
-- €39.99 → €57.13 → 2644 звёзд
-- €59.99 → €85.70 → 3966 звёзд

UPDATE pricing_packages
SET price_stars = CASE
  -- Пакеты монет
  WHEN package_key = 'coins_100' THEN 198  -- €2.99 → €4.27 → 198 звёзд
  WHEN package_key = 'coins_500' THEN 660  -- €9.99 → €14.27 → 660 звёзд
  WHEN package_key = 'coins_1200' THEN 1321  -- €19.99 → €28.56 → 1321 звёзд
  WHEN package_key = 'coins_3000' THEN 2644  -- €39.99 → €57.13 → 2644 звёзд
  
  -- Premium пакеты
  WHEN package_key = 'premium_monthly' THEN 660  -- €9.99 → €14.27 → 660 звёзд
  WHEN package_key = 'premium_yearly' THEN 3966  -- €59.99 → €85.70 → 3966 звёзд
  WHEN package_key = 'premium_forever' THEN 3966  -- €59.99 → €85.70 → 3966 звёзд
  
  -- Если price_stars уже заполнено - не трогаем
  ELSE price_stars
END,
updated_at = NOW()
WHERE is_active = true
  AND (
    price_stars IS NULL 
    OR package_key IN ('coins_100', 'coins_500', 'coins_1200', 'coins_3000', 'premium_monthly', 'premium_yearly', 'premium_forever')
  );

-- 4. ПРОВЕРКА: Убеждаемся, что все заполнено
-- ============================================
SELECT 
  package_key,
  title_ru,
  price_coins,
  price_stars,
  CASE 
    WHEN price_stars IS NULL THEN '❌ НЕ ЗАПОЛНЕНО'
    ELSE '✅ OK'
  END as status
FROM pricing_packages
WHERE is_active = true
ORDER BY package_key;

-- 5. ВАЛИДАЦИЯ: Проверяем, что нет NULL для активных пакетов
-- ============================================
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM pricing_packages
  WHERE is_active = true AND price_stars IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING '⚠️ Найдено % пакетов без price_stars!', null_count;
  ELSE
    RAISE NOTICE '✅ Все активные пакеты имеют price_stars';
  END IF;
END $$;

