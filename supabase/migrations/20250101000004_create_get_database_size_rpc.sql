-- ============================================
-- RPC функция для получения размера базы данных
-- Используется для мониторинга Free Tier (лимит 500 MB)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_database_size(current_database());
$$;

-- Комментарий
COMMENT ON FUNCTION public.get_database_size IS 'Возвращает размер текущей базы данных в байтах. Используется для мониторинга Free Tier (лимит 500 MB)';

