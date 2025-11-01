-- Fix RLS policies to avoid infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
DROP POLICY IF EXISTS "Users can join duels as players" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player status" ON public.duel_players;

DROP POLICY IF EXISTS "Users can view duels they participate in" ON public.duels;
DROP POLICY IF EXISTS "Users can create duels" ON public.duels;
DROP POLICY IF EXISTS "Host can update their duels" ON public.duels;

DROP POLICY IF EXISTS "Users can view questions in their duels" ON public.duel_questions;
DROP POLICY IF EXISTS "Users can view answers in their duels" ON public.duel_answers;
DROP POLICY IF EXISTS "Users can insert their own answers" ON public.duel_answers;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.duel_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.duel_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.duel_stats;

DROP POLICY IF EXISTS "Users can view their own limits" ON public.daily_duel_limits;
DROP POLICY IF EXISTS "Users can insert their own limits" ON public.daily_duel_limits;
DROP POLICY IF EXISTS "Users can update their own limits" ON public.daily_duel_limits;

-- Create simpler, non-recursive policies for duels
CREATE POLICY "Anyone authenticated can view waiting duels"
ON public.duels FOR SELECT
USING (status = 'waiting' OR host_user = auth.uid());

CREATE POLICY "Authenticated users can create duels"
ON public.duels FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update duels"
ON public.duels FOR UPDATE
USING (host_user = auth.uid());

-- Create simpler policies for duel_players
CREATE POLICY "Anyone can view duel players"
ON public.duel_players FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join duels"
ON public.duel_players FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their player records"
ON public.duel_players FOR UPDATE
USING (user_id = auth.uid() OR is_bot = true);

-- Create simpler policies for duel_questions
CREATE POLICY "Anyone can view duel questions"
ON public.duel_questions FOR SELECT
USING (true);

CREATE POLICY "System can insert duel questions"
ON public.duel_questions FOR INSERT
WITH CHECK (true);

-- Create simpler policies for duel_answers
CREATE POLICY "Anyone can view duel answers"
ON public.duel_answers FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert answers"
ON public.duel_answers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for duel_stats
CREATE POLICY "Users can view all stats"
ON public.duel_stats FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage stats"
ON public.duel_stats FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for daily_duel_limits
CREATE POLICY "Users can view all limits"
ON public.daily_duel_limits FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage limits"
ON public.daily_duel_limits FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);