-- Create enum for report types
CREATE TYPE public.report_type AS ENUM ('wrong_translation', 'wrong_answer', 'wrong_image', 'unclear_question', 'other');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'in_progress', 'resolved', 'dismissed');

-- Create question_reports table
CREATE TABLE public.question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions_new(id) ON DELETE CASCADE NOT NULL,
  report_type report_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_question_reports_user_id ON question_reports(user_id);
CREATE INDEX idx_question_reports_question_id ON question_reports(question_id);
CREATE INDEX idx_question_reports_status ON question_reports(status);
CREATE INDEX idx_question_reports_created_at ON question_reports(created_at DESC);
CREATE INDEX idx_question_reports_admin_id ON question_reports(admin_id);

-- Enable RLS
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON question_reports
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON question_reports
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON question_reports
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all reports
CREATE POLICY "Admins can update all reports"
  ON question_reports
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_question_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on update
CREATE TRIGGER update_question_reports_updated_at
  BEFORE UPDATE ON question_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_question_reports_updated_at();

-- Function to set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION set_question_report_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status != 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set resolved_at
CREATE TRIGGER set_question_report_resolved_at
  BEFORE UPDATE ON question_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_question_report_resolved_at();

