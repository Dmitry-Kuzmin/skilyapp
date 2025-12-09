-- ============================================================
-- Добавить partner_code в таблицу purchases
-- ============================================================
-- Для трекинга партнерских конверсий при покупках
-- ============================================================

-- Добавить поле partner_code в таблицу purchases
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS partner_code TEXT;

-- Индекс для быстрого поиска покупок по партнеру
CREATE INDEX IF NOT EXISTS idx_purchases_partner_code 
ON public.purchases(partner_code) 
WHERE partner_code IS NOT NULL;

-- Комментарий
COMMENT ON COLUMN public.purchases.partner_code IS 'Партнерский код, через который была совершена покупка (для начисления комиссии)';

