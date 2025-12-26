-- ========================================
-- Migration: Create PDD Ticket Progress Table
-- ========================================
-- Separate table for PDD ticket progress (uses text IDs like 'pdd-ticket-1')
-- This is isolated from the main test_progress table which uses UUIDs

CREATE TABLE IF NOT EXISTS public.user_pdd_ticket_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL, -- Format: 'pdd-ticket-1', 'pdd-ticket-2', etc.
  country TEXT NOT NULL DEFAULT 'ru', -- 'ru', 'es', etc.
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'passed', 'failed')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 20,
  time_spent_seconds INTEGER DEFAULT 0,
  attempts_count INTEGER DEFAULT 1,
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0 AND best_score <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticket_id, country)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_pdd_ticket_progress_user_id ON public.user_pdd_ticket_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pdd_ticket_progress_ticket_country ON public.user_pdd_ticket_progress(user_id, country);
CREATE INDEX IF NOT EXISTS idx_user_pdd_ticket_progress_status ON public.user_pdd_ticket_progress(user_id, status);

-- RLS
ALTER TABLE public.user_pdd_ticket_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PDD ticket progress"
  ON public.user_pdd_ticket_progress FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can insert their own PDD ticket progress"
  ON public.user_pdd_ticket_progress FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can update their own PDD ticket progress"
  ON public.user_pdd_ticket_progress FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

-- Trigger for updated_at
CREATE TRIGGER update_user_pdd_ticket_progress_updated_at
  BEFORE UPDATE ON public.user_pdd_ticket_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_pdd_ticket_progress IS 'User progress for PDD tickets (isolated from other test modes)';
COMMENT ON COLUMN public.user_pdd_ticket_progress.ticket_id IS 'Ticket ID in format pdd-ticket-N where N is ticket number';
COMMENT ON COLUMN public.user_pdd_ticket_progress.country IS 'Country code: ru for Russia, es for Spain';
COMMENT ON COLUMN public.user_pdd_ticket_progress.best_score IS 'Best score achieved across all attempts for this ticket';
