-- Restrict content modification to admins only
-- Keep SELECT policies public so users can read content

-- Questions table
DROP POLICY IF EXISTS "Authenticated users can manage questions" ON public.questions_new;
CREATE POLICY "Admins can manage questions" ON public.questions_new
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Answer options table
DROP POLICY IF EXISTS "Authenticated users can manage answers" ON public.answer_options;
CREATE POLICY "Admins can manage answers" ON public.answer_options
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Topics table
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tags table
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Language terms table
DROP POLICY IF EXISTS "Authenticated users can insert language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can update language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can delete language terms" ON public.language_terms;
CREATE POLICY "Admins can manage language terms" ON public.language_terms
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Road signs table
DROP POLICY IF EXISTS "Authenticated users can insert road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can update road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can delete road signs" ON public.road_signs;
CREATE POLICY "Admins can manage road signs" ON public.road_signs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add database-level constraints for input validation
ALTER TABLE user_progress 
  DROP CONSTRAINT IF EXISTS attempts_positive,
  DROP CONSTRAINT IF EXISTS time_positive,
  ADD CONSTRAINT attempts_positive CHECK (attempts > 0 AND attempts <= 10),
  ADD CONSTRAINT time_positive CHECK (time_spent_seconds >= 0 AND time_spent_seconds <= 7200);

ALTER TABLE game_sessions 
  DROP CONSTRAINT IF EXISTS score_range,
  DROP CONSTRAINT IF EXISTS duration_positive,
  DROP CONSTRAINT IF EXISTS total_questions_range,
  ADD CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
  ADD CONSTRAINT duration_positive CHECK (duration_seconds >= 0 AND duration_seconds <= 7200),
  ADD CONSTRAINT total_questions_range CHECK (total_questions > 0 AND total_questions <= 100);

ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS boosts_range,
  DROP CONSTRAINT IF EXISTS xp_positive,
  DROP CONSTRAINT IF EXISTS coins_positive,
  DROP CONSTRAINT IF EXISTS streak_positive,
  ADD CONSTRAINT boosts_range CHECK (boosts >= 0 AND boosts <= 100),
  ADD CONSTRAINT xp_positive CHECK (xp >= 0),
  ADD CONSTRAINT coins_positive CHECK (coins >= 0),
  ADD CONSTRAINT streak_positive CHECK (streak_days >= 0 AND streak_days <= 365);