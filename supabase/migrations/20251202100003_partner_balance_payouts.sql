-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 3: Баланс и Система Выплат
-- ============================================================
-- Цель: Партнер видит доступный баланс и может запросить вывод
-- Hold Period: 14 дней для защиты от возвратов платежей
-- ============================================================

-- 1. Расширить таблицу partners полями баланса
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS balance_available DECIMAL(10,2) DEFAULT 0.00 CHECK (balance_available >= 0),
ADD COLUMN IF NOT EXISTS balance_hold DECIMAL(10,2) DEFAULT 0.00 CHECK (balance_hold >= 0),
ADD COLUMN IF NOT EXISTS balance_paid DECIMAL(10,2) DEFAULT 0.00 CHECK (balance_paid >= 0),
ADD COLUMN IF NOT EXISTS hold_period_days INTEGER DEFAULT 14 CHECK (hold_period_days >= 0),
ADD COLUMN IF NOT EXISTS min_payout_amount DECIMAL(10,2) DEFAULT 50.00 CHECK (min_payout_amount >= 0);

-- Комментарии
COMMENT ON COLUMN public.partners.balance_available IS 'Доступно к выводу (прошел hold period)';
COMMENT ON COLUMN public.partners.balance_hold IS 'Заморожено на период hold_period_days (защита от возвратов)';
COMMENT ON COLUMN public.partners.balance_paid IS 'Всего выплачено партнеру за всё время';
COMMENT ON COLUMN public.partners.hold_period_days IS 'Период заморозки комиссии в днях (по умолчанию 14)';
COMMENT ON COLUMN public.partners.min_payout_amount IS 'Минимальная сумма для запроса выплаты (по умолчанию €50)';

-- 2. Таблица для хранения запросов на выплаты
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
  -- Payout info
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'EUR',
  
  -- Method
  payout_method TEXT NOT NULL CHECK (payout_method IN ('paypal', 'sepa', 'usdt', 'wise')),
  payout_details JSONB NOT NULL, -- {email: "partner@example.com"} or {iban: "ES...", name: "..."}
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ, -- Когда админ начал обработку
  completed_at TIMESTAMPTZ, -- Когда деньги отправлены
  
  -- Invoice (для Испании - self-billing)
  invoice_number TEXT,
  invoice_url TEXT, -- Ссылка на PDF счета
  
  -- Admin
  admin_notes TEXT,
  admin_user_id UUID REFERENCES auth.users(id), -- Кто обработал
  rejection_reason TEXT,
  
  -- Transaction ID (от PayPal/Bank/Crypto)
  transaction_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON public.partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON public.partner_payouts(status);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_requested_at ON public.partner_payouts(requested_at DESC);

-- Enable RLS
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners can view their payouts"
ON public.partner_payouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_payouts.partner_id
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can create payout requests"
ON public.partner_payouts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_payouts.partner_id
    AND partners.user_id = auth.uid()
    AND partners.registration_status = 'approved'
    AND partners.status = 'active'
  )
);

CREATE POLICY "Admins can manage all payouts"
ON public.partner_payouts
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. Функция для запроса выплаты партнером
CREATE OR REPLACE FUNCTION request_partner_payout(
  p_partner_id UUID,
  p_amount DECIMAL,
  p_payout_method TEXT,
  p_payout_details JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  payout_id UUID
) AS $$
DECLARE
  v_partner RECORD;
  v_payout_id UUID;
  v_pending_payouts_count INTEGER;
BEGIN
  -- Получить баланс партнера
  SELECT 
    balance_available, 
    min_payout_amount,
    status,
    registration_status
  INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Проверка статуса партнера
  IF v_partner.registration_status != 'approved' OR v_partner.status != 'active' THEN
    RETURN QUERY SELECT false, 'Partner is not active or approved'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Проверка минимальной суммы
  IF p_amount < v_partner.min_payout_amount THEN
    RETURN QUERY SELECT 
      false, 
      ('Minimum payout amount is €' || v_partner.min_payout_amount)::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- Проверка доступного баланса
  IF p_amount > v_partner.balance_available THEN
    RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Проверка на наличие других pending payouts
  SELECT COUNT(*) INTO v_pending_payouts_count
  FROM public.partner_payouts
  WHERE partner_id = p_partner_id
  AND status IN ('pending', 'processing');

  IF v_pending_payouts_count > 0 THEN
    RETURN QUERY SELECT 
      false, 
      'You have a pending payout request. Please wait for it to be processed.'::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- Создать запрос на выплату
  INSERT INTO public.partner_payouts (
    partner_id,
    amount,
    payout_method,
    payout_details,
    status
  ) VALUES (
    p_partner_id,
    p_amount,
    p_payout_method,
    p_payout_details,
    'pending'
  ) RETURNING id INTO v_payout_id;

  -- Заморозить сумму (вычесть из available)
  UPDATE public.partners
  SET 
    balance_available = balance_available - p_amount,
    updated_at = NOW()
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Payout request created successfully'::TEXT, v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция для отмены запроса выплаты (партнером, только pending)
CREATE OR REPLACE FUNCTION cancel_partner_payout(
  p_payout_id UUID,
  p_partner_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_payout RECORD;
BEGIN
  -- Получить информацию о выплате
  SELECT * INTO v_payout
  FROM public.partner_payouts
  WHERE id = p_payout_id
  AND partner_id = p_partner_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payout not found or cannot be cancelled'::TEXT;
    RETURN;
  END IF;

  -- Отменить выплату
  UPDATE public.partner_payouts
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_payout_id;

  -- Вернуть деньги в available
  UPDATE public.partners
  SET 
    balance_available = balance_available + v_payout.amount,
    updated_at = NOW()
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Payout cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для обработки выплаты админом (approve/reject)
CREATE OR REPLACE FUNCTION process_partner_payout(
  p_payout_id UUID,
  p_action TEXT, -- 'approve', 'reject'
  p_admin_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_payout RECORD;
BEGIN
  -- Проверка прав админа
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN QUERY SELECT false, 'Only admins can process payouts'::TEXT;
    RETURN;
  END IF;

  -- Получить информацию о выплате
  SELECT * INTO v_payout
  FROM public.partner_payouts
  WHERE id = p_payout_id
  AND status IN ('pending', 'processing');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payout not found or already processed'::TEXT;
    RETURN;
  END IF;

  -- Обработка в зависимости от действия
  IF p_action = 'approve' THEN
    -- Одобрить выплату
    UPDATE public.partner_payouts
    SET 
      status = 'completed',
      completed_at = NOW(),
      processed_at = NOW(),
      admin_user_id = auth.uid(),
      admin_notes = p_admin_notes,
      transaction_id = p_transaction_id,
      updated_at = NOW()
    WHERE id = p_payout_id;

    -- Обновить balance_paid партнера
    UPDATE public.partners
    SET 
      balance_paid = balance_paid + v_payout.amount,
      updated_at = NOW()
    WHERE id = v_payout.partner_id;

    RETURN QUERY SELECT true, 'Payout approved and completed'::TEXT;

  ELSIF p_action = 'reject' THEN
    -- Отклонить выплату
    UPDATE public.partner_payouts
    SET 
      status = 'rejected',
      processed_at = NOW(),
      admin_user_id = auth.uid(),
      admin_notes = p_admin_notes,
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
    WHERE id = p_payout_id;

    -- Вернуть деньги в available
    UPDATE public.partners
    SET 
      balance_available = balance_available + v_payout.amount,
      updated_at = NOW()
    WHERE id = v_payout.partner_id;

    RETURN QUERY SELECT true, 'Payout rejected, balance returned'::TEXT;

  ELSE
    RETURN QUERY SELECT false, 'Invalid action. Use "approve" or "reject"'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для добавления комиссии в hold (вызывается при покупке)
CREATE OR REPLACE FUNCTION add_partner_commission_to_hold(
  p_partner_id UUID,
  p_amount DECIMAL,
  p_purchase_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Добавить комиссию в hold
  UPDATE public.partners
  SET 
    balance_hold = balance_hold + p_amount,
    accumulated_commission = accumulated_commission + p_amount,
    updated_at = NOW()
  WHERE id = p_partner_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для перевода комиссии из hold в available (cron job)
-- Вызывается каждый день, переводит комиссии старше hold_period_days
CREATE OR REPLACE FUNCTION release_partner_commissions_from_hold()
RETURNS TABLE(
  partner_id UUID,
  amount_released DECIMAL,
  purchases_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH commissions_to_release AS (
    -- Найти все покупки, у которых прошел hold period
    SELECT 
      pc.partner_id,
      SUM(pc.commission_amount) as total_commission,
      COUNT(*) as purchases_count
    FROM public.partner_conversions pc
    JOIN public.partners p ON pc.partner_id = p.id
    WHERE pc.event_type = 'purchase'
    AND pc.commission_amount > 0
    AND pc.created_at <= NOW() - (p.hold_period_days || ' days')::INTERVAL
    -- Только те, которые еще не были переведены
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_commission_releases pcr
      WHERE pcr.conversion_id = pc.id
    )
    GROUP BY pc.partner_id
  )
  SELECT 
    ctr.partner_id,
    ctr.total_commission as amount_released,
    ctr.purchases_count
  FROM commissions_to_release ctr;

  -- Обновить балансы партнеров
  UPDATE public.partners p
  SET 
    balance_available = balance_available + ctr.total_commission,
    balance_hold = GREATEST(balance_hold - ctr.total_commission, 0),
    updated_at = NOW()
  FROM commissions_to_release ctr
  WHERE p.id = ctr.partner_id;

  -- Записать, что комиссии переведены (чтобы не переводить дважды)
  INSERT INTO public.partner_commission_releases (conversion_id, partner_id, amount, released_at)
  SELECT 
    pc.id,
    pc.partner_id,
    pc.commission_amount,
    NOW()
  FROM public.partner_conversions pc
  JOIN public.partners p ON pc.partner_id = p.id
  WHERE pc.event_type = 'purchase'
  AND pc.commission_amount > 0
  AND pc.created_at <= NOW() - (p.hold_period_days || ' days')::INTERVAL
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_commission_releases pcr
    WHERE pcr.conversion_id = pc.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Таблица для отслеживания переведенных комиссий (чтобы не переводить дважды)
CREATE TABLE IF NOT EXISTS public.partner_commission_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID NOT NULL REFERENCES public.partner_conversions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(conversion_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_commission_releases_partner_id ON public.partner_commission_releases(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commission_releases_released_at ON public.partner_commission_releases(released_at DESC);

-- Enable RLS
ALTER TABLE public.partner_commission_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view commission releases"
ON public.partner_commission_releases
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 9. Функция для получения истории выплат партнера
CREATE OR REPLACE FUNCTION get_partner_payout_history(
  p_partner_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  payout_id UUID,
  amount DECIMAL,
  currency TEXT,
  payout_method TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id as payout_id,
    pp.amount,
    pp.currency,
    pp.payout_method,
    pp.status,
    pp.requested_at,
    pp.completed_at,
    pp.rejection_reason
  FROM public.partner_payouts pp
  WHERE pp.partner_id = p_partner_id
  ORDER BY pp.requested_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии для документации
COMMENT ON TABLE public.partner_payouts IS 'Запросы партнеров на вывод средств';
COMMENT ON TABLE public.partner_commission_releases IS 'Отслеживание переведенных комиссий из hold в available';

COMMENT ON FUNCTION request_partner_payout IS 'Создает запрос партнера на вывод средств (проверяет минимум и баланс)';
COMMENT ON FUNCTION cancel_partner_payout IS 'Отменяет pending запрос на выплату (только партнером)';
COMMENT ON FUNCTION process_partner_payout IS 'Обрабатывает запрос на выплату админом (approve/reject)';
COMMENT ON FUNCTION add_partner_commission_to_hold IS 'Добавляет комиссию партнера в hold при покупке';
COMMENT ON FUNCTION release_partner_commissions_from_hold IS 'Cron job: переводит комиссии из hold в available после истечения hold_period';
COMMENT ON FUNCTION get_partner_payout_history IS 'Возвращает историю выплат партнера';
















