-- Course payments table for tracking all payment attempts (Stars, manual, etc.)
CREATE TABLE IF NOT EXISTS public.course_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  telegram_id bigint NOT NULL,
  tariff_id   text NOT NULL,
  tariff_label text NOT NULL,
  stream_id   text,
  stream_label text,
  eur_amount  numeric NOT NULL,
  payment_method text NOT NULL, -- 'stars' | 'usdt' | 'ton' | 'rub' | 'bizum' | 'paddle'
  status      text NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'failed'
  stars_amount int,
  payload     text UNIQUE, -- Telegram invoice payload (for stars)
  metadata    jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.course_payments ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write
CREATE POLICY "service_only" ON public.course_payments
  USING (false);
