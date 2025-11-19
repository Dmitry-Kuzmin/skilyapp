-- Allow anonymous feedback by making user_id nullable
ALTER TABLE help_feedback 
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own feedback" ON help_feedback;

-- Policy: Anyone can insert feedback (authenticated or anonymous)
-- If user_id is provided, it must match auth.uid()
-- If user_id is NULL, it's anonymous feedback
CREATE POLICY "Anyone can insert feedback"
  ON help_feedback
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id IS NULL) OR 
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

-- Update index to handle NULL values
DROP INDEX IF EXISTS idx_help_feedback_user_id;
CREATE INDEX IF NOT EXISTS idx_help_feedback_user_id ON help_feedback(user_id) WHERE user_id IS NOT NULL;

