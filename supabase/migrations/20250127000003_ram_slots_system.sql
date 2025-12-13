-- ============================================
-- Фаза 4: Skily O.S. - RAM Slots & Loadouts
-- ============================================

-- 1. Добавляем количество открытых слотов в профиль
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ram_slots_unlocked INTEGER DEFAULT 1 CHECK (ram_slots_unlocked >= 1 AND ram_slots_unlocked <= 3);

-- 2. Таблица для хранения текущего выбора игрока (Loadout)
-- У каждого игрока только ОДНА запись (его текущий набор)
CREATE TABLE IF NOT EXISTS public.user_loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Три слота памяти. В них храним 'type' буста (например, 'screen_injector')
  slot_1_boost_type TEXT REFERENCES boost_definitions(type),
  slot_2_boost_type TEXT REFERENCES boost_definitions(type),
  slot_3_boost_type TEXT REFERENCES boost_definitions(type),
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Гарантируем, что у юзера только один Loadout
  CONSTRAINT uq_user_loadouts_user_id UNIQUE (user_id)
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_loadouts_user_id ON public.user_loadouts(user_id);

-- 3. Политики безопасности (RLS)
ALTER TABLE public.user_loadouts ENABLE ROW LEVEL SECURITY;

-- Юзер видит и правит только свой Loadout
CREATE POLICY "Users can manage their own loadout"
ON public.user_loadouts
FOR ALL
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
       OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
       OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- 4. Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_loadouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_loadouts_updated_at
  BEFORE UPDATE ON public.user_loadouts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_loadouts_updated_at();

-- 5. Добавляем тип транзакции для покупки слота
-- Сначала проверяем и исправляем существующие записи с невалидными типами
DO $$
DECLARE
  invalid_type TEXT;
BEGIN
  -- Находим невалидные типы транзакций (если есть)
  FOR invalid_type IN 
    SELECT DISTINCT transaction_type 
    FROM public.transactions 
    WHERE transaction_type NOT IN (
      'coins_purchase_paddle',
      'coins_purchase_cryptomus',
      'coins_purchase_telegram_stars',
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad',
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
      'coins_spent_slot_unlock' -- НОВЫЙ: покупка слота памяти
    )
  LOOP
    RAISE WARNING 'Found invalid transaction type: %. Converting to admin_adjust.', invalid_type;
    -- Конвертируем невалидные типы в admin_adjust для сохранения данных
    UPDATE public.transactions 
    SET transaction_type = 'admin_adjust',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_type', invalid_type, 'migrated_at', NOW())
    WHERE transaction_type = invalid_type;
  END LOOP;
END $$;

-- Теперь безопасно обновляем constraint
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'coins_purchase_paddle',
      'coins_purchase_cryptomus',
      'coins_purchase_telegram_stars',
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad',
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
      'coins_spent_slot_unlock' -- НОВЫЙ: покупка слота памяти
    )
  );

-- Комментарии для документации
COMMENT ON TABLE public.user_loadouts IS 'Текущий выбор бустов игрока (Loadout) для дуэлей. Максимум 3 слота.';
COMMENT ON COLUMN public.user_loadouts.slot_1_boost_type IS 'Слот 1 (базовый, открыт у всех)';
COMMENT ON COLUMN public.user_loadouts.slot_2_boost_type IS 'Слот 2 (нужно купить за 500 монет)';
COMMENT ON COLUMN public.user_loadouts.slot_3_boost_type IS 'Слот 3 (только для Premium подписчиков)';
COMMENT ON COLUMN public.profiles.ram_slots_unlocked IS 'Количество открытых RAM слотов (1-3)';

-- 6. Backfill: Создаем пустые Loadout для всех существующих пользователей
-- Чтобы фронтенд сразу получал данные, а не null
INSERT INTO public.user_loadouts (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

