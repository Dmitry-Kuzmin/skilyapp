-- Исправление цен Premium пакетов для Telegram Stars
-- Рассчитано на основе официальных цен Telegram Stars (0.02161 € за звезду)
-- С учетом комиссии Telegram (30%)

-- Premium Monthly: €9.99 → €14.27 после комиссии → 660 звёзд → 330 coins
-- Premium Yearly: €59.99 → €85.70 после комиссии → 3966 звёзд → 1983 coins

UPDATE public.pricing_packages
SET 
  price_coins = CASE 
    WHEN package_key = 'premium_monthly' THEN 330
    WHEN package_key = 'premium_yearly' THEN 1983
    ELSE price_coins
  END,
  updated_at = NOW()
WHERE package_key IN ('premium_monthly', 'premium_yearly');

-- Если premium_forever не существует, создаем его (на основе premium_yearly)
INSERT INTO public.pricing_packages (package_key, package_type, price_coins, premium_days, coins_amount, title_ru, description_ru, icon, is_active)
VALUES 
  ('premium_forever', 'premium', 1983, 9999, 0, 'Premium Forever', 'Пожизненный доступ ко всем функциям. Duel Pass Premium автоматически открывается для каждого сезона.', '👑', true)
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = 1983,
  premium_days = 9999,
  title_ru = 'Premium Forever',
  description_ru = 'Пожизненный доступ ко всем функциям. Duel Pass Premium автоматически открывается для каждого сезона.',
  is_active = true,
  updated_at = NOW();

