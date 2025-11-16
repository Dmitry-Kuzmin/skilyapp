-- Добавляем пакеты монет для Telegram Stars покупок
-- Соответствуют пакетам из Stripe: coins_pack_100, coins_pack_500, coins_pack_1200, coins_pack_3000

INSERT INTO public.pricing_packages (package_key, package_type, price_coins, premium_days, coins_amount, title_ru, description_ru, icon) VALUES
-- Пакеты монет для Stars (соответствуют Stripe пакетам)
('coins_100', 'coins', 100, 0, 100, '100 монет', 'Пополнить баланс монет для покупки бустов и участия в дуэлях.', '🪙'),
('coins_500', 'coins', 550, 0, 550, '500 монет + 50 бонус', 'Больше монет для игр и покупок в магазине. Включает бонус!', '🪙'),
('coins_1200', 'coins', 1400, 0, 1400, '1200 монет + 200 бонус', 'Лучшее предложение! Большой пакет монет с выгодой. Включает бонус!', '🪙'),
('coins_3000', 'coins', 3500, 0, 3500, '3000 монет + 500 бонус', 'Максимальная выгода! Огромный пакет монет для активных игроков. Включает бонус!', '🪙')
ON CONFLICT (package_key) DO UPDATE SET
  price_coins = EXCLUDED.price_coins,
  coins_amount = EXCLUDED.coins_amount,
  title_ru = EXCLUDED.title_ru,
  description_ru = EXCLUDED.description_ru,
  is_active = true,
  updated_at = NOW();

