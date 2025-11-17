-- ============================================
-- ПОЛНОЕ ВОССТАНОВЛЕНИЕ СИСТЕМЫ ОПЛАТЫ TELEGRAM STARS
-- Применяйте этот файл в Supabase Dashboard → SQL Editor
-- ============================================

-- ШАГ 1: Добавить поле price_stars (если еще не применено)
ALTER TABLE public.pricing_packages
ADD COLUMN IF NOT EXISTS price_stars INTEGER;

-- ШАГ 2: Обновить цены в Stars на основе реальных цен в евро
-- Расчет: euros / 0.7 (комиссия 30%) / 0.02161 (цена 1 звезды) = stars
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

-- ШАГ 3: Исправить RLS политики
DROP POLICY IF EXISTS "Anyone can view active pricing packages" ON public.pricing_packages;

CREATE POLICY "Anyone can view active pricing packages"
  ON public.pricing_packages FOR SELECT
  USING (is_active = true);

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;

-- ШАГ 4: Гарантировать что все пакеты существуют и активны
INSERT INTO public.pricing_packages (
  package_key,
  package_type,
  price_coins,
  premium_days,
  coins_amount,
  title_ru,
  description_ru,
  icon,
  is_active,
  price_stars
) VALUES (
  'coins_100',
  'coins',
  100,
  0,
  100,
  '100 монет',
  'Пополнить баланс монет для покупки бустов и участия в дуэлях.',
  '🪙',
  true,
  198
)
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = EXCLUDED.price_coins,
  price_stars = EXCLUDED.price_stars,
  coins_amount = EXCLUDED.coins_amount,
  title_ru = EXCLUDED.title_ru,
  description_ru = EXCLUDED.description_ru,
  is_active = true,
  updated_at = NOW();

INSERT INTO public.pricing_packages (
  package_key,
  package_type,
  price_coins,
  premium_days,
  coins_amount,
  title_ru,
  description_ru,
  icon,
  is_active,
  price_stars
) VALUES
  ('coins_500', 'coins', 550, 0, 550, '500 монет + 50 бонус', 'Больше монет для игр и покупок в магазине. Включает бонус!', '🪙', true, 660),
  ('coins_1200', 'coins', 1400, 0, 1400, '1200 монет + 200 бонус', 'Лучшее предложение! Большой пакет монет с выгодой. Включает бонус!', '🪙', true, 1321),
  ('coins_3000', 'coins', 3500, 0, 3500, '3000 монет + 500 бонус', 'Максимальная выгода! Огромный пакет монет для активных игроков. Включает бонус!', '🪙', true, 2644)
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = EXCLUDED.price_coins,
  price_stars = EXCLUDED.price_stars,
  coins_amount = EXCLUDED.coins_amount,
  is_active = true,
  updated_at = NOW();

-- ШАГ 5: Проверка результата
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

-- Ожидаемый результат:
-- coins_100: price_stars = 198 ✅
-- coins_500: price_stars = 660 ✅
-- coins_1200: price_stars = 1321 ✅
-- coins_3000: price_stars = 2644 ✅
-- premium_monthly: price_stars = 660 ✅
-- premium_forever: price_stars = 3966 ✅

