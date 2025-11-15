-- ============================================
-- Telegram Stars Payment System
-- ============================================
-- Таблицы и функции для приема платежей через Telegram Stars
-- Курс: 1 Star = 100 coins (внутренняя валюта)

-- ============================================
-- 1. Таблица пакетов с ценами в coins
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key TEXT UNIQUE NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('premium', 'coins', 'duel_pass', 'boost')),
  
  -- Цена в внутренней валюте (coins)
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  
  -- Что получает пользователь
  premium_days INTEGER DEFAULT 0 CHECK (premium_days >= 0),
  coins_amount INTEGER DEFAULT 0 CHECK (coins_amount >= 0),
  duel_pass_season_id INTEGER,
  boost_type TEXT,
  
  -- Метаданные
  title_ru TEXT NOT NULL,
  description_ru TEXT,
  icon TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Таблица платежей через Telegram Stars
-- ============================================
CREATE TABLE IF NOT EXISTS public.stars_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID REFERENCES pricing_packages(id),
  
  -- Telegram данные
  invoice_payload TEXT NOT NULL UNIQUE, -- наш ID заказа для отслеживания
  telegram_payment_charge_id TEXT UNIQUE, -- ID платежа от Telegram (idempotency)
  telegram_user_id BIGINT NOT NULL,
  
  -- Сумма
  stars_amount INTEGER NOT NULL CHECK (stars_amount > 0),
  coins_equivalent INTEGER NOT NULL CHECK (coins_equivalent > 0),
  
  -- Статус платежа
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Статус начисления наград (soft-fail)
  rewards_status TEXT DEFAULT 'pending' CHECK (rewards_status IN ('pending', 'completed', 'failed', 'retrying', 'manual_review')),
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  rewards_errors JSONB DEFAULT '[]'::jsonb, -- Массив ошибок при начислении
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rewards_completed_at TIMESTAMPTZ
);

-- ============================================
-- 3. Индексы для производительности
-- ============================================
CREATE UNIQUE INDEX idx_stars_payments_charge_id ON stars_payments(telegram_payment_charge_id) 
  WHERE telegram_payment_charge_id IS NOT NULL;
CREATE UNIQUE INDEX idx_stars_payments_payload ON stars_payments(invoice_payload);
CREATE INDEX idx_stars_payments_user ON stars_payments(user_id);
CREATE INDEX idx_stars_payments_status ON stars_payments(status);
CREATE INDEX idx_stars_payments_rewards_status ON stars_payments(rewards_status) 
  WHERE rewards_status IN ('pending', 'failed', 'retrying');
CREATE INDEX idx_pricing_packages_active ON pricing_packages(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_packages_type ON pricing_packages(package_type);

-- ============================================
-- 4. RLS политики
-- ============================================
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stars_payments ENABLE ROW LEVEL SECURITY;

-- Все могут читать активные пакеты
CREATE POLICY "Anyone can view active pricing packages"
  ON public.pricing_packages FOR SELECT
  USING (is_active = true);

-- Пользователи видят только свои платежи
CREATE POLICY "Users can view own stars payments"
  ON public.stars_payments FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    OR user_id = auth.uid()
  ));

-- ============================================
-- 5. RPC функция для активации Premium
-- ============================================
CREATE OR REPLACE FUNCTION public.activate_premium(
  p_user_id UUID,
  p_days INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_expires_at TIMESTAMPTZ;
  v_current_expires_at TIMESTAMPTZ;
BEGIN
  -- Получить текущую дату истечения премиума
  SELECT premium_until INTO v_current_expires_at
  FROM profiles
  WHERE id = p_user_id;

  -- Если премиум уже активен и не истек, продлить от текущей даты
  -- Иначе начать от текущего момента
  IF v_current_expires_at IS NOT NULL AND v_current_expires_at > NOW() THEN
    v_new_expires_at := v_current_expires_at + (p_days || ' days')::INTERVAL;
  ELSE
    v_new_expires_at := NOW() + (p_days || ' days')::INTERVAL;
  END IF;

  -- Обновить премиум
  UPDATE profiles
  SET 
    premium_until = v_new_expires_at,
    is_premium = true,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Логируем активацию
  RAISE NOTICE 'Premium activated for user % until %', p_user_id, v_new_expires_at;
END;
$$;

-- ============================================
-- 6. RPC функция для начисления наград из платежа
-- ============================================
CREATE OR REPLACE FUNCTION public.process_stars_payment_rewards(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment stars_payments%ROWTYPE;
  v_package pricing_packages%ROWTYPE;
  v_errors TEXT[] := '{}';
  v_success BOOLEAN := true;
BEGIN
  -- Получить платеж и пакет
  SELECT * INTO v_payment
  FROM stars_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;

  -- Проверка: платеж должен быть completed
  IF v_payment.status != 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment is not completed'
    );
  END IF;

  -- Проверка: награды уже начислены
  IF v_payment.rewards_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Rewards already processed'
    );
  END IF;

  -- Получить пакет
  SELECT * INTO v_package
  FROM pricing_packages
  WHERE id = v_payment.package_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Package not found'
    );
  END IF;

  -- Начислить Premium
  IF v_package.premium_days > 0 THEN
    BEGIN
      PERFORM activate_premium(v_payment.user_id, v_package.premium_days);
    EXCEPTION WHEN OTHERS THEN
      v_success := false;
      v_errors := array_append(v_errors, 'Premium activation failed: ' || SQLERRM);
    END;
  END IF;

  -- Начислить монеты
  IF v_package.coins_amount > 0 THEN
    BEGIN
      PERFORM increment_profile_value(
        v_payment.user_id,
        'coins',
        v_package.coins_amount
      );
    EXCEPTION WHEN OTHERS THEN
      v_success := false;
      v_errors := array_append(v_errors, 'Coins addition failed: ' || SQLERRM);
    END;
  END IF;

  -- Обновить статус начисления
  IF v_success THEN
    UPDATE stars_payments
    SET 
      rewards_status = 'completed',
      rewards_completed_at = NOW(),
      rewards_errors = '[]'::jsonb
    WHERE id = p_payment_id;
  ELSE
    UPDATE stars_payments
    SET 
      rewards_status = 'failed',
      rewards_errors = to_jsonb(v_errors),
      retry_count = retry_count + 1
    WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', v_success,
    'errors', v_errors
  );
END;
$$;

-- ============================================
-- 7. Триггер для обновления updated_at
-- ============================================
CREATE TRIGGER update_pricing_packages_updated_at
  BEFORE UPDATE ON public.pricing_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Инициализация пакетов
-- ============================================
INSERT INTO public.pricing_packages (package_key, package_type, price_coins, premium_days, coins_amount, title_ru, description_ru, icon) VALUES
-- Premium пакеты (курс: 1 Star = 100 coins, округление Math.round)
('premium_monthly', 'premium', 30000, 30, 0, 'Premium на месяц', 'Полный доступ на 30 дней. Все курсы, тесты, +50% монет, без рекламы.', '👑'),
('premium_yearly', 'premium', 180000, 365, 0, 'Premium на год', 'Полный доступ на год. Сэкономь 50%! Все возможности Premium на целый год.', '👑'),

-- Пакеты монет
('coins_300', 'coins', 300, 0, 300, '300 монет', 'Пополнить баланс монет для покупки бустов и участия в дуэлях.', '🪙'),
('coins_700', 'coins', 700, 0, 700, '700 монет', 'Больше монет для игр и покупок в магазине.', '🪙'),
('coins_1500', 'coins', 1500, 0, 1500, '1500 монет', 'Лучшее предложение! Большой пакет монет с выгодой.', '🪙'),
('coins_5000', 'coins', 5000, 0, 5000, '5000 монет', 'Максимальная выгода! Огромный пакет монет для активных игроков.', '🪙')
ON CONFLICT (package_key) DO NOTHING;

-- ============================================
-- Комментарии
-- ============================================
COMMENT ON TABLE pricing_packages IS 'Пакеты для покупки через Telegram Stars. Цены в coins (внутренняя валюта).';
COMMENT ON TABLE stars_payments IS 'Платежи через Telegram Stars с отслеживанием статуса начисления наград.';
COMMENT ON COLUMN stars_payments.rewards_status IS 'Статус начисления наград: pending, completed, failed, retrying, manual_review';
COMMENT ON COLUMN stars_payments.retry_count IS 'Количество попыток автоматического начисления (макс 5)';
COMMENT ON COLUMN stars_payments.rewards_errors IS 'Массив ошибок при начислении наград (JSON)';

