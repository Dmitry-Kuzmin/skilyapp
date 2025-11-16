-- ============================================
-- ПРИМЕНИТЬ ЭТИ МИГРАЦИИ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql/new
-- ============================================

-- Migration 1: Create help_feedback table
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

-- Policy: Users can view their own feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON help_feedback;
CREATE POLICY "Users can view their own feedback"
  ON help_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON help_feedback;
CREATE POLICY "Admins can view all feedback"
  ON help_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update feedback (for replies)
DROP POLICY IF EXISTS "Admins can update feedback" ON help_feedback;
CREATE POLICY "Admins can update feedback"
  ON help_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
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
DROP TRIGGER IF EXISTS update_help_feedback_updated_at ON help_feedback;
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
DROP TRIGGER IF EXISTS set_help_feedback_profile_id ON help_feedback;
CREATE TRIGGER set_help_feedback_profile_id
  BEFORE INSERT ON help_feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_help_feedback_profile_id();

-- Migration 2: Allow anonymous feedback
-- Allow anonymous feedback by making user_id nullable
ALTER TABLE help_feedback 
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing insert policy if exists
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

-- Migration 3: Add notification type for help feedback replies
-- Add 'help_feedback_reply' notification type for help center feedback replies
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'help_feedback_reply'));

