-- ============================================
-- ИСПРАВЛЕНИЕ: СОЗДАНИЕ ТРАНЗАКЦИЙ ЧЕРЕЗ RPC ФУНКЦИЮ
-- ============================================
-- Проблема: RLS политика не работает для Telegram пользователей
-- Решение: Используем RPC функцию с SECURITY DEFINER (обходит RLS)
-- ============================================

-- Создаем RPC функцию для создания транзакций
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Validate transaction type
  IF p_transaction_type NOT IN (
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
    'refund'
  ) THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert transaction
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO anon;

-- ============================================
-- СОЗДАНИЕ RPC ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ТРАНЗАКЦИЙ
-- ============================================
-- Проблема: RLS политика для SELECT не работает для Telegram пользователей
-- Решение: Используем RPC функцию с SECURITY DEFINER (обходит RLS)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  transaction_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return transactions for the user
  -- Используем явные имена таблиц и алиасы для избежания конфликтов
  RETURN QUERY
  SELECT 
    transactions.id,
    transactions.amount,
    transactions.transaction_type,
    transactions.metadata,
    transactions.created_at
  FROM public.transactions
  WHERE transactions.user_id = get_user_transactions.p_user_id
  ORDER BY transactions.created_at DESC
  LIMIT get_user_transactions.p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO anon;

-- ============================================
-- СОЗДАНИЕ RPC ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ИНВЕНТАРЯ БУСТОВ
-- ============================================
-- Проблема: RLS политика для SELECT не работает для Telegram пользователей
-- Решение: Используем RPC функцию с SECURITY DEFINER (обходит RLS)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_boost_inventory(
  p_user_id UUID
)
RETURNS TABLE (
  boost_type TEXT,
  quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return inventory for the user
  RETURN QUERY
  SELECT 
    boost_inventory.boost_type,
    boost_inventory.quantity
  FROM public.boost_inventory
  WHERE boost_inventory.user_id = get_user_boost_inventory.p_user_id
  ORDER BY boost_inventory.boost_type ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_boost_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_boost_inventory(UUID) TO anon;

-- ============================================
-- СОЗДАНИЕ RPC ФУНКЦИЙ ДЛЯ ПОЛУЧЕНИЯ КОСМЕТИКИ
-- ============================================
-- Проблема: RLS политика для SELECT не работает для Telegram пользователей
-- Решение: Используем RPC функции с SECURITY DEFINER (обходит RLS)
-- ============================================

-- Function to get user skins
CREATE OR REPLACE FUNCTION public.get_user_skins(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  skin_id TEXT,
  is_active BOOLEAN,
  obtained_at TIMESTAMPTZ,
  skin_definitions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return skins for the user with definitions
  RETURN QUERY
  SELECT 
    user_skins.id,
    user_skins.skin_id,
    user_skins.is_active,
    user_skins.obtained_at,
    row_to_json(skin_definitions.*)::jsonb as skin_definitions
  FROM public.user_skins
  JOIN public.skin_definitions ON user_skins.skin_id = skin_definitions.id
  WHERE user_skins.user_id = get_user_skins.p_user_id
  ORDER BY user_skins.obtained_at DESC;
END;
$$;

-- Function to get user badges
CREATE OR REPLACE FUNCTION public.get_user_badges(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  badge_id TEXT,
  is_displayed BOOLEAN,
  display_order INTEGER,
  obtained_at TIMESTAMPTZ,
  badge_definitions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return badges for the user with definitions
  RETURN QUERY
  SELECT 
    user_badges.id,
    user_badges.badge_id,
    user_badges.is_displayed,
    user_badges.display_order,
    user_badges.obtained_at,
    row_to_json(badge_definitions.*)::jsonb as badge_definitions
  FROM public.user_badges
  JOIN public.badge_definitions ON user_badges.badge_id = badge_definitions.id
  WHERE user_badges.user_id = get_user_badges.p_user_id
  ORDER BY user_badges.obtained_at DESC;
END;
$$;

-- Function to get user stickers
CREATE OR REPLACE FUNCTION public.get_user_stickers(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  sticker_id TEXT,
  quantity INTEGER,
  obtained_at TIMESTAMPTZ,
  sticker_definitions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return stickers for the user with definitions
  RETURN QUERY
  SELECT 
    user_stickers.id,
    user_stickers.sticker_id,
    user_stickers.quantity,
    user_stickers.obtained_at,
    row_to_json(sticker_definitions.*)::jsonb as sticker_definitions
  FROM public.user_stickers
  JOIN public.sticker_definitions ON user_stickers.sticker_id = sticker_definitions.id
  WHERE user_stickers.user_id = get_user_stickers.p_user_id
  ORDER BY user_stickers.obtained_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_skins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_skins(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badges(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_stickers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stickers(UUID) TO anon;

-- ============================================
-- ГОТОВО! Теперь транзакции, инвентарь бустов и косметика работают через RPC функции
-- ============================================
