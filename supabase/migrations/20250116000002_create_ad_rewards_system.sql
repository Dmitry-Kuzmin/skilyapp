-- Create ad_rewards table for tracking rewarded ad limits and cooldowns
-- This prevents abuse and ensures fair distribution of free coins

CREATE TABLE IF NOT EXISTS public.ad_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('coins', 'restore_streak', 'test_attempt', 'extra_slot')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_count INTEGER NOT NULL DEFAULT 0 CHECK (daily_count >= 0),
  last_watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reward_type, date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_type_date 
  ON public.ad_rewards(user_id, reward_type, date);

CREATE INDEX IF NOT EXISTS idx_ad_rewards_last_watched 
  ON public.ad_rewards(user_id, reward_type, last_watched_at) 
  WHERE last_watched_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.ad_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Упрощенная политика: проверяем через profiles напрямую
-- Используем DROP POLICY IF EXISTS для безопасного повторного применения миграции
DROP POLICY IF EXISTS "Users can view their own ad rewards" ON public.ad_rewards;
CREATE POLICY "Users can view their own ad rewards"
  ON public.ad_rewards
  FOR SELECT
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR user_id = (SELECT id FROM profiles WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint) LIMIT 1)
  );

DROP POLICY IF EXISTS "Users can insert their own ad rewards" ON public.ad_rewards;
CREATE POLICY "Users can insert their own ad rewards"
  ON public.ad_rewards
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR user_id = (SELECT id FROM profiles WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint) LIMIT 1)
  );

DROP POLICY IF EXISTS "Users can update their own ad rewards" ON public.ad_rewards;
CREATE POLICY "Users can update their own ad rewards"
  ON public.ad_rewards
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR user_id = (SELECT id FROM profiles WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint) LIMIT 1)
  );

DROP POLICY IF EXISTS "Service role can manage ad rewards" ON public.ad_rewards;
CREATE POLICY "Service role can manage ad rewards"
  ON public.ad_rewards
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to check ad reward status
-- Лимиты вынесены в параметры для гибкости (можно менять без миграции)
-- Оптимизировано: без блокировки (FOR UPDATE) - блокировка будет в claim_ad_reward
CREATE OR REPLACE FUNCTION check_ad_reward_status(
  p_user_id UUID,
  p_reward_type TEXT,
  p_daily_limit INTEGER DEFAULT 5,    -- Лимит: 5 раз в день (по умолчанию)
  p_cooldown_minutes INTEGER DEFAULT 60 -- Кулдаун: 1 час между просмотрами (по умолчанию)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_can_watch BOOLEAN := true;
  v_next_available_at TIMESTAMPTZ;
  v_daily_count INTEGER := 0;
BEGIN
  -- Получаем запись (без блокировки - блокировка будет в claim_ad_reward)
  SELECT * INTO v_record
  FROM ad_rewards
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE;

  -- Если записи нет, считаем count = 0 (не создаем запись здесь)
  IF FOUND THEN
    v_daily_count := v_record.daily_count;
  ELSE
    v_daily_count := 0;
  END IF;

  -- 1. Проверка лимита (используем переданный аргумент p_daily_limit)
  IF v_daily_count >= p_daily_limit THEN
    v_can_watch := false;
    v_next_available_at := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  END IF;

  -- 2. Проверка кулдауна (используем переданный аргумент p_cooldown_minutes)
  IF v_can_watch AND FOUND AND v_record.last_watched_at IS NOT NULL THEN
    DECLARE
      v_seconds_since_last INTEGER;
    BEGIN
      v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_record.last_watched_at))::INTEGER;
      
      IF v_seconds_since_last < (p_cooldown_minutes * 60) THEN
        v_can_watch := false;
        v_next_available_at := v_record.last_watched_at + (p_cooldown_minutes || ' minutes')::INTERVAL;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'can_watch', v_can_watch,
    'next_available_at', v_next_available_at,
    'daily_count', v_daily_count,
    'daily_limit', p_daily_limit,
    'cooldown_minutes', p_cooldown_minutes
  );
END;
$$;

-- Function to claim ad reward (with validation)
-- Лимиты передаются в check_ad_reward_status для консистентности
CREATE OR REPLACE FUNCTION claim_ad_reward(
  p_user_id UUID,
  p_reward_type TEXT,
  p_reward_amount INTEGER DEFAULT 50,
  p_daily_limit INTEGER DEFAULT 5,    -- Лимит: 5 раз в день (по умолчанию)
  p_cooldown_minutes INTEGER DEFAULT 60 -- Кулдаун: 1 час между просмотрами (по умолчанию)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status JSONB;
  v_record RECORD;
BEGIN
  -- Проверяем статус с теми же лимитами
  v_status := check_ad_reward_status(p_user_id, p_reward_type, p_daily_limit, p_cooldown_minutes);
  
  IF NOT (v_status->>'can_watch')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ad reward not available',
      'reason', 'cooldown_or_limit',
      'next_available_at', v_status->>'next_available_at'
    );
  END IF;

  -- Получаем запись для обновления
  SELECT * INTO v_record
  FROM ad_rewards
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE
  FOR UPDATE;

  -- Обновляем счетчик и время последнего просмотра
  UPDATE ad_rewards
  SET daily_count = daily_count + 1,
      last_watched_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE;

  -- Начисляем награду (только для coins)
  IF p_reward_type = 'coins' AND p_reward_amount > 0 THEN
    -- Начисляем монеты
    PERFORM increment_profile_value(p_user_id, 'coins', p_reward_amount);
    
    -- Создаем транзакцию
    INSERT INTO transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'coins_earned_ad',
      p_reward_amount,
      jsonb_build_object(
        'reward_type', p_reward_type,
        'source', 'crypto_miner',
        'daily_count', (v_status->>'daily_count')::INTEGER + 1
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', p_reward_amount,
    'daily_count', (v_status->>'daily_count')::INTEGER + 1,
    'daily_limit', (v_status->>'daily_limit')::INTEGER
  );
END;
$$;

COMMENT ON TABLE public.ad_rewards IS 'Tracks rewarded ad watches with daily limits and cooldowns to prevent abuse';
COMMENT ON FUNCTION check_ad_reward_status IS 'Checks if user can watch rewarded ad. Parameters: p_daily_limit (default 5), p_cooldown_minutes (default 60). Returns JSONB with can_watch, next_available_at, daily_count, daily_limit, cooldown_minutes';
COMMENT ON FUNCTION claim_ad_reward IS 'Claims ad reward after successful ad watch. Validates limits (p_daily_limit, p_cooldown_minutes) and awards coins. Parameters match check_ad_reward_status for consistency';

