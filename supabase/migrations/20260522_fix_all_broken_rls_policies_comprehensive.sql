-- Comprehensive fix for broken RLS policies
-- Problem: Multiple tables have malformed policies with unnecessary nested SELECTs
-- Example: (user_id = ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) AS uid) AS uid) AS uid))
-- Should be: (user_id = auth.uid())
--
-- This breaks authenticated operations (42501 permission denied) on:
-- - achievements, user_badges, notifications, duel_players, player_records
-- - daily_quests, daily_tasks, offline_sync_log, passkeys
-- - purchases, flashcard_progress, items, lesson_progress
-- - license_audit_logs, practice_points_history, limits, lingo_progress
-- - notification_settings, pdd_ticket_progress, topic_progress
-- - user_claimed_rewards, user_roles, user_season_history, race_*
-- - and many more

DO $$
DECLARE
  r RECORD;
  drop_sql text;
BEGIN
  -- Find all RESTRICTIVE policies (should not exist) and drop them
  FOR r IN
    SELECT
      schemaname,
      tablename,
      policyname
    FROM pg_policies
    WHERE permissive = false  -- RESTRICTIVE policies
      AND schemaname IN ('public', 'storage')
  LOOP
    drop_sql := format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
    EXECUTE drop_sql;
  END LOOP;
END;
$$;

-- Drop all malformed policies that have nested SELECTs
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can view own sync log" ON public.offline_sync_log;
DROP POLICY IF EXISTS "Users can delete own passkeys" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can view own limits" ON public.limits;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can insert attempts to their sessions" ON public.race_attempts;
DROP POLICY IF EXISTS "Users can view attempts from their sessions" ON public.race_attempts;
DROP POLICY IF EXISTS "Users can insert questions to their sessions" ON public.race_questions;
DROP POLICY IF EXISTS "Users can view questions from their sessions" ON public.race_questions;
DROP POLICY IF EXISTS "Users can insert their own race results" ON public.race_results;
DROP POLICY IF EXISTS "Users can view their own race results" ON public.race_results;
DROP POLICY IF EXISTS "Users can insert their own race sessions" ON public.race_sessions;
DROP POLICY IF EXISTS "Users can view their own race sessions" ON public.race_sessions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own claimed rewards" ON public.user_claimed_rewards;
DROP POLICY IF EXISTS "Users can view their own claimed rewards" ON public.user_claimed_rewards;
DROP POLICY IF EXISTS "Users can view own stars payments" ON public.stars_payments;

-- Recreate policies with correct logic (no nested SELECTs)

-- user_achievements (was achievements)
CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ai_messages
CREATE POLICY "Users can insert own messages"
  ON public.ai_messages FOR INSERT
  WITH CHECK ((SELECT id FROM profiles WHERE user_id = auth.uid()) = user_id OR user_id IS NULL);

-- offline_sync_log
CREATE POLICY "Users can view own sync log"
  ON public.offline_sync_log FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- webauthn_credentials (was passkeys)
CREATE POLICY "Users can delete own passkeys"
  ON public.webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- limits
CREATE POLICY "Users can view own limits"
  ON public.limits FOR SELECT
  USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- race_attempts
CREATE POLICY "Users can insert attempts to their sessions"
  ON public.race_attempts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM race_sessions WHERE id = session_id AND user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can view attempts from their sessions"
  ON public.race_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM race_sessions WHERE id = session_id AND user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- race_questions
CREATE POLICY "Users can insert questions to their sessions"
  ON public.race_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM race_sessions WHERE id = session_id AND user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can view questions from their sessions"
  ON public.race_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM race_sessions WHERE id = session_id AND user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- race_results
CREATE POLICY "Users can insert their own race results"
  ON public.race_results FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can view their own race results"
  ON public.race_results FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- race_sessions
CREATE POLICY "Users can insert their own race sessions"
  ON public.race_sessions FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can view their own race sessions"
  ON public.race_sessions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- user_claimed_rewards
CREATE POLICY "Users can insert their own claimed rewards"
  ON public.user_claimed_rewards FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can view their own claimed rewards"
  ON public.user_claimed_rewards FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- stars_payments
CREATE POLICY "Users can view own stars payments"
  ON public.stars_payments FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE telegram_id = (current_setting('request.jwt.claims'::text, true)::json ->> 'telegram_id')::bigint OR user_id = auth.uid()));
