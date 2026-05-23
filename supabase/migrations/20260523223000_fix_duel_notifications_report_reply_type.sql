-- Fix 1: Add 'question_report_reply' to the type CHECK constraint on duel_notifications.
-- The admin panel inserts notifications with this type when responding to question reports,
-- but the constraint didn't include it, causing 400 errors.

ALTER TABLE public.duel_notifications
  DROP CONSTRAINT duel_notifications_type_check;

ALTER TABLE public.duel_notifications
  ADD CONSTRAINT duel_notifications_type_check CHECK (
    type = ANY (ARRAY[
      'start'::text,
      'progress'::text,
      'boost'::text,
      'finish'::text,
      'timeout'::text,
      'opponent_ahead'::text,
      'opponent_behind'::text,
      'reminder'::text,
      'referral_joined'::text,
      'referral_earned'::text,
      'answer'::text,
      'test_result'::text,
      'streak_lost'::text,
      'daily_reward'::text,
      'achievement'::text,
      'system'::text,
      'help_requested'::text,
      'help_received'::text,
      'question_report_reply'::text  -- admin response to user's question report
    ])
  );

-- Fix 2: Allow admins to SELECT all notifications (needed to avoid 403 in admin panel).
CREATE POLICY "Admins can select all notifications"
  ON public.duel_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
