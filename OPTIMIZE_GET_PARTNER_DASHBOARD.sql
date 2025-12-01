-- ============================================
-- ОПТИМИЗАЦИЯ: Функция get_partner_dashboard
-- ============================================
-- Проблема: Функция выполняется более 10 секунд
-- Решение: Оптимизировать запросы, добавить индексы, упростить логику

-- 1. Проверяем текущую функцию
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_partner_dashboard';

-- 2. Проверяем индексы для таблиц, используемых в функции
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('partners', 'premium_keys', 'partner_link_activations')
ORDER BY tablename, indexname;

-- 3. Оптимизированная версия функции
CREATE OR REPLACE FUNCTION get_partner_dashboard(p_user_id UUID)
RETURNS TABLE(
  partner_data JSONB,
  keys_data JSONB,
  stats JSONB
) AS $$
DECLARE
  v_partner JSONB;
  v_partner_id UUID;
  v_partner_code TEXT;
  v_keys JSONB;
  v_stats JSONB;
  v_link_stats RECORD;
  v_keys_count INTEGER := 0;
  v_keys_activated_count INTEGER := 0;
BEGIN
  -- ОПТИМИЗАЦИЯ: Получаем только необходимые поля партнера (явно указываем колонки)
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'email', p.email,
    'channel_name', p.channel_name,
    'channel_url', p.channel_url,
    'partner_type', p.partner_type,
    'status', p.status,
    'registration_status', p.registration_status,
    'total_keys_issued', p.total_keys_issued,
    'total_keys_activated', p.total_keys_activated,
    'total_link_activations', p.total_link_activations,
    'partner_code', p.partner_code,
    'accumulated_commission', p.accumulated_commission,
    'created_at', p.created_at
  ) INTO v_partner
  FROM public.partners p
  WHERE p.user_id = p_user_id
  LIMIT 1;
  
  IF v_partner IS NULL THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Извлечь partner_id и partner_code из JSONB
  v_partner_id := (v_partner->>'id')::UUID;
  v_partner_code := v_partner->>'partner_code';
  
  -- ОПТИМИЗАЦИЯ: Получаем ключи с ограничением (только последние 50 для UI)
  -- Используем подзапрос для оптимизации
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'key', sub.key,
        'status', sub.status,
        'issued_at', sub.issued_at,
        'activated_at', sub.activated_at
      )
    ), '[]'::JSONB),
    COUNT(*) FILTER (WHERE sub.status = 'activated')::INTEGER
  INTO v_keys, v_keys_activated_count
  FROM (
    SELECT key, status, issued_at, activated_at
    FROM public.premium_keys
    WHERE partner_id = v_partner_id
    ORDER BY issued_at DESC
    LIMIT 50
  ) sub;
  
  -- ОПТИМИЗАЦИЯ: Получаем статистику активаций по ссылкам только если есть partner_code
  -- Используем один запрос с агрегацией для оптимизации
  IF v_partner_code IS NOT NULL THEN
    SELECT 
      COUNT(*)::INTEGER as total_link_activations,
      COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('month', NOW()))::INTEGER as monthly_activations,
      COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('day', NOW()))::INTEGER as daily_activations
    INTO v_link_stats
    FROM public.partner_link_activations
    WHERE partner_id = v_partner_id;
    -- Если запрос вернул NULL (нет записей), инициализируем нулями
    IF v_link_stats IS NULL THEN
      v_link_stats := ROW(0, 0, 0)::RECORD;
    END IF;
  ELSE
    v_link_stats := ROW(0, 0, 0)::RECORD;
  END IF;
  
  -- ОПТИМИЗАЦИЯ: Получить общее количество ключей из партнера (уже есть в таблице)
  -- Используем данные из таблицы partners, а не пересчитываем
  v_keys_count := COALESCE((v_partner->>'total_keys_issued')::INTEGER, 0);
  IF v_keys_activated_count IS NULL THEN
    v_keys_activated_count := COALESCE((v_partner->>'total_keys_activated')::INTEGER, 0);
  END IF;
  
  -- ОПТИМИЗАЦИЯ: Получить статистику (используем уже вычисленные значения)
  SELECT jsonb_build_object(
    'total_keys_issued', v_keys_count,
    'total_keys_activated', v_keys_activated_count,
    'activation_rate', 
      CASE 
        WHEN v_keys_count > 0 
        THEN ROUND((v_keys_activated_count::DECIMAL / v_keys_count) * 100)
        ELSE 0
      END,
    'accumulated_commission', COALESCE((v_partner->>'accumulated_commission')::DECIMAL, 0),
    'total_link_activations', COALESCE(v_link_stats.total_link_activations, 0),
    'monthly_link_activations', COALESCE(v_link_stats.monthly_activations, 0),
    'daily_link_activations', COALESCE(v_link_stats.daily_activations, 0)
  ) INTO v_stats;
  
  RETURN QUERY SELECT v_partner, COALESCE(v_keys, '[]'::JSONB), v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Проверяем, что индексы существуют для оптимизации
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_keys_partner_id ON public.premium_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_premium_keys_status ON public.premium_keys(status) WHERE status = 'activated';
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_partner_id ON public.partner_link_activations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_activated_at ON public.partner_link_activations(activated_at);

COMMENT ON FUNCTION get_partner_dashboard IS 'Returns partner dashboard data including link activation statistics. Optimized for performance.';

