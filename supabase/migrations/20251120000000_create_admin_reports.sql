-- Таблица для админских отчетов о проблемах с наградами
CREATE TABLE IF NOT EXISTS public.admin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('reward_penalty', 'reward_missing', 'reward_incorrect', 'other')),
  session_id TEXT, -- session_id из test_results для связи
  test_result_id UUID REFERENCES test_results(id) ON DELETE SET NULL,
  
  -- Полный контекст расчета наград
  reward_calculation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Сообщение пользователя
  user_message TEXT,
  
  -- Статус обработки
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_admin_reports_user_id ON admin_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_reports_status ON admin_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_reports_created_at ON admin_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_reports_session_id ON admin_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_reports_test_result_id ON admin_reports(test_result_id);

-- RLS политики
ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;

-- Пользователи могут создавать отчеты
CREATE POLICY "Users can create reports"
  ON admin_reports FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Пользователи могут читать свои отчеты
CREATE POLICY "Users can view their own reports"
  ON admin_reports FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Система (Edge Functions) может читать и обновлять все отчеты
CREATE POLICY "System can manage all reports"
  ON admin_reports FOR ALL
  USING (true);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_admin_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_reports_updated_at
  BEFORE UPDATE ON admin_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_reports_updated_at();

COMMENT ON TABLE admin_reports IS 'Отчеты пользователей о проблемах с наградами для админки';

