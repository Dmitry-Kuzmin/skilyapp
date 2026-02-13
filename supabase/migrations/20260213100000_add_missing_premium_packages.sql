
-- Добавление недостающих пакетов Premium для Telegram Stars
INSERT INTO public.pricing_packages (package_key, package_type, price_coins, price_stars, premium_days, coins_amount, title_ru, description_ru, icon, is_active) VALUES
('premium_quarterly', 'premium', 165000, 1650, 90, 0, 'Premium на 3 месяца', 'Полный доступ на 90 дней. Хватит на всю теорию! Все функции Premium.', '👑', true),
('premium_biannual', 'premium', 265000, 2650, 180, 0, 'Premium на 6 месяцев', 'Самый популярный выбор! Полный доступ на 180 дней. Все функции Premium.', '👑', true)
ON CONFLICT (package_key) DO UPDATE SET
  price_stars = EXCLUDED.price_stars,
  price_coins = EXCLUDED.price_coins,
  premium_days = EXCLUDED.premium_days,
  title_ru = EXCLUDED.title_ru,
  description_ru = EXCLUDED.description_ru,
  is_active = true,
  updated_at = NOW();

-- Обновим также существующие для соответствия
UPDATE public.pricing_packages SET price_stars = 660, price_coins = 66000 WHERE package_key = 'premium_monthly';
UPDATE public.pricing_packages SET price_stars = 3990, price_coins = 399000 WHERE package_key = 'premium_yearly';
