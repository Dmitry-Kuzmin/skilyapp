-- ============================================
-- Streak Freeze System (как в Duolingo)
-- Защита streak от потери при пропуске дня
-- ============================================

-- ✅ 1. Добавляем поля в user_daily_bonus
ALTER TABLE public.user_daily_bonus
ADD COLUMN IF NOT EXISTS streak_freeze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_freeze_last_used DATE;

-- ✅ 2. Создаем таблицу user_items для инвентаря
CREATE TABLE IF NOT EXISTS public.user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,  -- 'streak_freeze', 'boost_ticket', 'mystery_box', etc
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type)
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_items_user_type ON public.user_items(user_id, item_type);

-- RLS для user_items
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
  ON public.user_items FOR SELECT
  USING (public.can_access_daily_bonus(user_id));

CREATE POLICY "Users can insert their own items"
  ON public.user_items FOR INSERT
  WITH CHECK (public.can_access_daily_bonus(user_id));

-- UPDATE только через функции
CREATE POLICY "System can update items"
  ON public.user_items FOR UPDATE
  USING (current_setting('role', true) = 'service_role');

-- Trigger для updated_at
CREATE TRIGGER update_user_items_updated_at
  BEFORE UPDATE ON public.user_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ✅ 3. Функция использования Streak Freeze
-- ============================================

CREATE OR REPLACE FUNCTION public.use_streak_freeze(
  p_user_id UUID,
  p_server_today DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_freeze_count INTEGER;
  v_bonus_record RECORD;
BEGIN
  -- Проверяем наличие freeze в инвентаре
  SELECT quantity INTO v_freeze_count
  FROM public.user_items
  WHERE user_id = p_user_id 
    AND item_type = 'streak_freeze'
  FOR UPDATE;
  
  IF v_freeze_count IS NULL OR v_freeze_count <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_freeze_available',
      'message', 'У вас нет заморозки streak'
    );
  END IF;

  -- Получаем текущий bonus record
  SELECT * INTO v_bonus_record
  FROM public.user_daily_bonus
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_bonus_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_bonus_record',
      'message', 'Запись daily bonus не найдена'
    );
  END IF;

  -- Проверяем, нужна ли заморозка
  IF v_bonus_record.last_claimed_date = p_server_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_claimed_today',
      'message', 'Вы уже получили бонус сегодня, заморозка не нужна'
    );
  END IF;

  -- Используем одну заморозку
  UPDATE public.user_items
  SET 
    quantity = quantity - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND item_type = 'streak_freeze';

  -- Обновляем user_daily_bonus - "спасаем" streak
  UPDATE public.user_daily_bonus
  SET 
    streak_freeze_count = COALESCE(streak_freeze_count, 0) + 1,
    streak_freeze_last_used = p_server_today,
    last_claimed_date = p_server_today,  -- Обновляем дату
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Логируем транзакцию
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'streak_freeze_used',
    0,
    jsonb_build_object(
      'streak_saved', v_bonus_record.current_streak,
      'freeze_count_total', COALESCE(v_bonus_record.streak_freeze_count, 0) + 1,
      'server_date', p_server_today
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Streak спасен! ❄️',
    'streak_saved', v_bonus_record.current_streak,
    'freezes_remaining', v_freeze_count - 1
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ 4. Функция покупки Streak Freeze
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_streak_freeze(
  p_user_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_cost INTEGER := p_quantity * 50;  -- 50 монет за штуку
  v_current_coins INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Валидация
  IF p_quantity <= 0 OR p_quantity > 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_quantity',
      'message', 'Можно купить от 1 до 10 за раз'
    );
  END IF;

  -- Проверяем баланс и блокируем профиль
  SELECT coins INTO v_current_coins
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'profile_not_found',
      'message', 'Профиль не найден'
    );
  END IF;

  IF v_current_coins < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_coins',
      'message', 'Недостаточно монет. Нужно: ' || v_cost || ', есть: ' || v_current_coins
    );
  END IF;
  
  -- Списываем монеты
  UPDATE public.profiles
  SET 
    coins = coins - v_cost,
    updated_at = NOW()
  WHERE id = p_user_id;

  v_new_balance := v_current_coins - v_cost;
  
  -- Добавляем freeze в инвентарь
  INSERT INTO public.user_items (user_id, item_type, quantity)
  VALUES (p_user_id, 'streak_freeze', p_quantity)
  ON CONFLICT (user_id, item_type)
  DO UPDATE SET 
    quantity = user_items.quantity + p_quantity,
    updated_at = NOW();
  
  -- Транзакция
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'purchase_streak_freeze',
    -v_cost,
    jsonb_build_object(
      'quantity', p_quantity, 
      'unit_cost', 50,
      'total_cost', v_cost
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'quantity_added', p_quantity,
    'new_balance', v_new_balance,
    'message', 'Куплено ' || p_quantity || ' заморозок!'
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Права доступа
-- ============================================

GRANT EXECUTE ON FUNCTION public.use_streak_freeze TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.buy_streak_freeze TO authenticated;

-- ============================================
-- Комментарии
-- ============================================

COMMENT ON FUNCTION public.use_streak_freeze IS 
  'Использует streak freeze для защиты серии от потери при пропуске дня';

COMMENT ON FUNCTION public.buy_streak_freeze IS 
  'Покупка streak freeze за монеты (50 монет за штуку)';

COMMENT ON TABLE public.user_items IS 
  'Инвентарь пользователя: streak_freeze, boost_tickets, mystery_boxes и другие предметы';



