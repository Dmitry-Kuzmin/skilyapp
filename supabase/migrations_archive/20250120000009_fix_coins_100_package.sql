-- Исправление: гарантируем что пакет coins_100 существует и активен
-- Эта миграция исправляет проблему "Package not found or inactive: coins_100"

-- Сначала убедимся что пакет существует
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
  198  -- €2.99 → €4.27 → 198 звёзд (с учетом комиссии Telegram 30%)
)
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = EXCLUDED.price_coins,
  price_stars = EXCLUDED.price_stars,
  coins_amount = EXCLUDED.coins_amount,
  title_ru = EXCLUDED.title_ru,
  description_ru = EXCLUDED.description_ru,
  is_active = true,  -- Гарантируем что пакет активен
  updated_at = NOW();

-- Также убедимся что все остальные пакеты монет активны и имеют price_stars
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

-- Проверка: убедимся что все пакеты активны
SELECT 
  package_key,
  is_active,
  price_coins,
  price_stars,
  coins_amount
FROM pricing_packages
WHERE package_type = 'coins'
ORDER BY package_key;
