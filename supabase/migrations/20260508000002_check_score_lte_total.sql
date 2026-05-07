-- Defensive constraint: future inserts can't recreate the percentage-as-count bug
-- that was fixed in client writers + backfilled in 20260508000000.
-- Apply only after writers are deployed and prod data is verified clean.
ALTER TABLE public.game_sessions
  ADD CONSTRAINT game_sessions_score_lte_total_questions
  CHECK (score <= total_questions) NOT VALID;

-- Validate separately (so the constraint is added immediately for new rows;
-- existing rows are validated next step). If any old row fails, fix it then run:
--   ALTER TABLE public.game_sessions VALIDATE CONSTRAINT game_sessions_score_lte_total_questions;
ALTER TABLE public.game_sessions
  VALIDATE CONSTRAINT game_sessions_score_lte_total_questions;
