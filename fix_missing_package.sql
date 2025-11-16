-- Исправление: убедимся что пакет coins_100 существует и активен
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
  198  -- €2.99 → €4.27 → 198 звёзд
)
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = EXCLUDED.price_coins,
  price_stars = EXCLUDED.price_stars,
  coins_amount = EXCLUDED.coins_amount,
  is_active = true,
  updated_at = NOW();

-- Проверка после вставки
SELECT 
  package_key,
  is_active,
  price_coins,
  price_stars,
  coins_amount
FROM pricing_packages
WHERE package_key = 'coins_100';
