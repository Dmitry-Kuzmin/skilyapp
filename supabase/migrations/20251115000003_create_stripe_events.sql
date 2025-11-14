-- Create stripe_events table for webhook logging
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed) WHERE processed = false;

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to stripe_events"
  ON public.stripe_events
  USING (true)
  WITH CHECK (true);


