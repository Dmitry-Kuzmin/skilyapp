-- Create help_feedback table for Help Center feedback
CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  section_id TEXT NOT NULL,
  subsection_id TEXT,
  helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_help_feedback_user_id ON help_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_help_feedback_section_id ON help_feedback(section_id);
CREATE INDEX IF NOT EXISTS idx_help_feedback_created_at ON help_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_feedback_helpful ON help_feedback(helpful);

-- Enable RLS
ALTER TABLE help_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON help_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON help_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON help_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update feedback (for replies)
CREATE POLICY "Admins can update feedback"
  ON help_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_help_feedback_updated_at
  BEFORE UPDATE ON help_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_help_feedback_updated_at();

-- Function to set profile_id from user_id
CREATE OR REPLACE FUNCTION set_help_feedback_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.profile_id
    FROM profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set profile_id
CREATE TRIGGER set_help_feedback_profile_id
  BEFORE INSERT ON help_feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_help_feedback_profile_id();

