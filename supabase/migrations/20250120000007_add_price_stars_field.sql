-- Добавление поля price_stars для хранения цены в Telegram Stars
-- Цены в Stars рассчитываются на основе цен в евро, а не на основе количества монет

-- Добавляем поле price_stars
ALTER TABLE public.pricing_packages
ADD COLUMN IF NOT EXISTS price_stars INTEGER;

-- Обновляем цены в Stars на основе реальных цен в евро
-- Расчет: euros / 0.7 (комиссия 30%) / 0.02161 (цена 1 звезды) = stars

-- Пакеты монет
UPDATE public.pricing_packages
SET price_stars = CASE
  WHEN package_key = 'coins_100' THEN 198  -- €2.99 → €4.27 → 198 звёзд
  WHEN package_key = 'coins_500' THEN 660  -- €9.99 → €14.27 → 660 звёзд
  WHEN package_key = 'coins_1200' THEN 1321  -- €19.99 → €28.56 → 1321 звёзд
  WHEN package_key = 'coins_3000' THEN 2644  -- €39.99 → €57.13 → 2644 звёзд
  WHEN package_key = 'premium_monthly' THEN 660  -- €9.99 → €14.27 → 660 звёзд
  WHEN package_key = 'premium_yearly' THEN 3966  -- €59.99 → €85.70 → 3966 звёзд
  WHEN package_key = 'premium_forever' THEN 3966  -- €59.99 → €85.70 → 3966 звёзд
  ELSE price_stars
END
WHERE package_key IN ('coins_100', 'coins_500', 'coins_1200', 'coins_3000', 'premium_monthly', 'premium_yearly', 'premium_forever');

-- Комментарий к полю
COMMENT ON COLUMN public.pricing_packages.price_stars IS 'Цена в Telegram Stars, рассчитанная на основе цены в евро с учетом комиссии Telegram (30%)';

