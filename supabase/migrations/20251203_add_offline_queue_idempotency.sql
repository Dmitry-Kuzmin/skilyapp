-- ============================================
-- Offline Queue Idempotency Support
-- ============================================
-- Добавляет client_action_id для предотвращения дублирования
-- offline действий при синхронизации.
-- ============================================

-- 1. Добавляем client_action_id в transactions (для coin-spend)
-- ВАЖНО: transactions уже может иметь client_action_id в metadata,
-- но мы добавляем отдельную колонку для лучшей индексации

DO $$ 
BEGIN
  -- Проверяем, есть ли уже client_action_id в transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'client_action_id'
  ) THEN
    ALTER TABLE public.transactions 
    ADD COLUMN client_action_id TEXT;
    
    -- Индекс для быстрой проверки дублей
    CREATE INDEX IF NOT EXISTS idx_transactions_client_action_id 
    ON public.transactions(client_action_id) 
    WHERE client_action_id IS NOT NULL;
    
    COMMENT ON COLUMN public.transactions.client_action_id IS 
    'Unique ID from client for offline sync idempotency';
    
    RAISE NOTICE 'Added client_action_id to transactions table';
  ELSE
    RAISE NOTICE 'client_action_id already exists in transactions table';
  END IF;
END $$;

-- 2. test_results уже имеет session_id с UNIQUE constraint
-- Это наш idempotency key! Проверим что он правильно настроен

DO $$
BEGIN
  -- Проверяем UNIQUE constraint на session_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'test_results_session_id_key'
    AND contype = 'u'
  ) THEN
    -- Добавляем UNIQUE constraint если его нет
    ALTER TABLE public.test_results 
    ADD CONSTRAINT test_results_session_id_key UNIQUE (session_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on test_results.session_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on test_results.session_id already exists';
  END IF;
END $$;

-- 3. Комментарии для документации

COMMENT ON COLUMN public.test_results.session_id IS 
'Unique session ID from client for test idempotency. Used to prevent duplicate test submissions.';

-- 4. Функция для проверки существования offline action (helper для Edge Functions)

CREATE OR REPLACE FUNCTION public.check_offline_action_processed(
  p_action_id TEXT,
  p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  CASE p_action_type
    WHEN 'test-result' THEN
      -- Для test-result проверяем session_id в test_results
      SELECT EXISTS(
        SELECT 1 FROM public.test_results 
        WHERE session_id = p_action_id
      ) INTO v_exists;
      
    WHEN 'coin-spend' THEN
      -- Для coin-spend проверяем client_action_id в transactions
      SELECT EXISTS(
        SELECT 1 FROM public.transactions 
        WHERE client_action_id = p_action_id 
        OR metadata->>'client_action_id' = p_action_id
      ) INTO v_exists;
      
    ELSE
      -- Для остальных типов по умолчанию false
      v_exists := FALSE;
  END CASE;
  
  RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION public.check_offline_action_processed IS 
'Checks if an offline action has already been processed (idempotency check)';

-- 5. Индексы для производительности

-- Индекс на test_results.session_id для быстрой проверки (если нет)
CREATE INDEX IF NOT EXISTS idx_test_results_session_id 
ON public.test_results(session_id);

-- Индекс на transactions для metadata->>'client_action_id' (для legacy проверки)
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_client_action_id 
ON public.transactions USING gin(metadata) 
WHERE metadata ? 'client_action_id';

-- 6. RLS Policies для sync-offline-actions function

-- ВАЖНО: Edge Functions используют Service Role Key, поэтому RLS bypassed
-- Но на всякий случай создадим политику для app role (если используется)

-- Для transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow service role insert transactions with client_action_id'
    AND tablename = 'transactions'
  ) THEN
    -- Эта политика не нужна для Service Role, но полезна для debug
    NULL;
  END IF;
END $$;

-- 7. Мониторинг offline sync (опционально)

-- Таблица для логирования offline sync операций (опционально, для analytics)
CREATE TABLE IF NOT EXISTS public.offline_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actions_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  errors JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT check_counts CHECK (success_count + failed_count = actions_count)
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_log_profile_id 
ON public.offline_sync_log(profile_id);

CREATE INDEX IF NOT EXISTS idx_offline_sync_log_synced_at 
ON public.offline_sync_log(synced_at DESC);

COMMENT ON TABLE public.offline_sync_log IS 
'Log of offline sync operations for monitoring and analytics';

-- RLS для offline_sync_log
ALTER TABLE public.offline_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can view own sync log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'offline_sync_log' 
    AND policyname = 'Users can view own sync log'
  ) THEN
    CREATE POLICY "Users can view own sync log"
    ON public.offline_sync_log
    FOR SELECT
    USING (auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = profile_id
    ));
    
    RAISE NOTICE 'Created policy: Users can view own sync log';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view own sync log';
  END IF;
END $$;

-- Service role может insert (Edge Function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'offline_sync_log' 
    AND policyname = 'Service role can insert sync log'
  ) THEN
    CREATE POLICY "Service role can insert sync log"
    ON public.offline_sync_log
    FOR INSERT
    WITH CHECK (true);
    
    RAISE NOTICE 'Created policy: Service role can insert sync log';
  ELSE
    RAISE NOTICE 'Policy already exists: Service role can insert sync log';
  END IF;
END $$;

-- 8. Helper функция для Edge Function логирования

CREATE OR REPLACE FUNCTION public.log_offline_sync(
  p_profile_id UUID,
  p_action_type TEXT,
  p_actions_count INTEGER,
  p_success_count INTEGER,
  p_failed_count INTEGER,
  p_errors JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.offline_sync_log (
    profile_id,
    action_type,
    actions_count,
    success_count,
    failed_count,
    errors
  ) VALUES (
    p_profile_id,
    p_action_type,
    p_actions_count,
    p_success_count,
    p_failed_count,
    p_errors
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_offline_sync IS 
'Logs an offline sync operation for monitoring';

-- ============================================
-- Migration Complete
-- ============================================

-- Проверка успешности миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Offline queue idempotency migration completed successfully';
  RAISE NOTICE '📊 Added: client_action_id to transactions';
  RAISE NOTICE '📊 Verified: session_id UNIQUE constraint in test_results';
  RAISE NOTICE '📊 Created: check_offline_action_processed() function';
  RAISE NOTICE '📊 Created: offline_sync_log table (optional analytics)';
  RAISE NOTICE '📊 Created: log_offline_sync() helper function';
END $$;

