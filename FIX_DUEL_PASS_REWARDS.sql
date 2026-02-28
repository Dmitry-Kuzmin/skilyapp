-- 1. Исправляем ограничение уровней в user_claimed_rewards
ALTER TABLE public.user_claimed_rewards 
  DROP CONSTRAINT IF EXISTS user_claimed_rewards_level_check;

ALTER TABLE public.user_claimed_rewards 
  ADD CONSTRAINT user_claimed_rewards_level_check 
  CHECK (level BETWEEN 1 AND 100);

-- 2. Добавляем новый тип транзакции в таблицу transactions
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IN (
    'coins_purchase_stripe',
    'coins_earned_test',
    'coins_earned_duel',
    'coins_earned_daily',
    'coins_earned_premium_bonus',
    'coins_spent_boost',
    'coins_spent_skin',
    'coins_spent_duel_entry',
    'premium_purchase_monthly',
    'premium_purchase_yearly',
    'premium_trial_started',
    'premium_trial_expired',
    'duel_pass_purchase',
    'admin_adjust',
    'refund',
    'item_received' -- Добавлено для наград Duel Pass
  ));

-- 3. Гарантируем наличие определений скинов для 5 уровня
INSERT INTO public.skin_definitions (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, metadata) VALUES
('frame_novice', 'Frame Novice', 'Frame Novato', 'Новый образ профиля', 'Nueva apariencia de perfil', 'common', false, '{"color": "#10b981", "effect": "shine"}'),
('frame_season_1_premium', 'Frame Season 1 Premium', 'Frame Temporada 1 Premium', 'Новый образ профиля', 'Nueva apariencia de perfil', 'epic', true, '{"color": "#fbbf24", "effect": "sparkle", "animated": true}')
ON CONFLICT (id) DO UPDATE SET 
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  rarity = EXCLUDED.rarity,
  is_premium = EXCLUDED.is_premium;

-- 4. Добавляем индекс если его нет
CREATE INDEX IF NOT EXISTS idx_user_skins_skin_id ON public.user_skins(skin_id);
