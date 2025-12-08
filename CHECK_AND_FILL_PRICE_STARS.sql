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
-- Примеры расчетов (известные цены):
-- €2.99 → €4.27 → 198 звёзд (округляем до 200)
-- €9.99 → €14.27 → 660 звёзд
-- €19.99 → €28.56 → 1321 звёзд (округляем до 1350)
-- €39.99 → €57.13 → 2644 звёзд (округляем до 2650)
-- €59.99 → €85.70 → 3966 звёзд (округляем до 3990)
-- €99.99 → €142.84 → 6600 звёзд (округляем до 6500)
--
-- 🔥 КРИТИЧНО: Forever должен быть дороже Yearly (обычно 1.5-2x)
-- Если Yearly = €59.99, то Forever должен быть ~€99.99 (примерно 1.67x)
--
-- Примечание: 
-- - Цены округлены до "красивых" чисел для лучшего UX
-- - Для пакетов coins_300, coins_700, coins_1500, coins_5000 используются примерные расчеты
--
-- ВАЖНО: Убрано условие "AND price_stars IS NULL" для возможности перезаписи при исправлении ошибок

UPDATE pricing_packages
SET price_stars = CASE
  -- Пакеты монет (Округлено до красивых значений)
  WHEN package_key = 'coins_100' THEN 200    -- €2.99 → €4.27 → 198 (округляем до 200)
  WHEN package_key = 'coins_300' THEN 400    -- ~€5.99 → ~€8.56 → 396 (округляем до 400)
  WHEN package_key = 'coins_500' THEN 660    -- €9.99 → €14.27 → 660 (ок)
  WHEN package_key = 'coins_700' THEN 950    -- ~€13.99 → ~€19.99 → 924 (округляем до 950)
  WHEN package_key = 'coins_1200' THEN 1350  -- €19.99 → €28.56 → 1321 (округляем до 1350)
  WHEN package_key = 'coins_1500' THEN 1650  -- ~€24.99 → ~€35.70 → 1650 (ок)
  WHEN package_key = 'coins_3000' THEN 2650   -- €39.99 → €57.13 → 2644 (округляем до 2650)
  WHEN package_key = 'coins_5000' THEN 4500  -- ~€66.99 → ~€95.70 → 4408 (округляем до 4500)
  
  -- Premium пакеты
  WHEN package_key = 'premium_monthly' THEN 660   -- €9.99 → €14.27 → 660 (ок)
  WHEN package_key = 'premium_yearly' THEN 3990   -- €59.99 → €85.70 → 3966 (округляем до 3990)
  
  -- 🔥 FIX: Forever должен быть дороже Yearly (обычно 1.5-2x цены Yearly)
  -- Если Yearly = €59.99, то Forever должен быть ~€99.99 (примерно 1.67x)
  WHEN package_key = 'premium_forever' THEN 6500  -- ~€99.99 → ~€142.84 → 6600 (округляем до 6500)
  
  -- Для неизвестных пакетов оставляем как есть
  ELSE price_stars
END,
updated_at = NOW()
WHERE is_active = true;
-- Убрано "AND price_stars IS NULL" для возможности принудительного обновления при исправлении ошибок

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

