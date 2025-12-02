-- ============================================
-- ПРИМЕНИТЬ МИГРАЦИЮ: Обновление функции get_partner_dashboard
-- ============================================
-- Этот файл обновляет функцию get_partner_dashboard для поддержки статистики по ссылкам
-- Скопируйте и выполните в Supabase SQL Editor ПОСЛЕ применения APPLY_PARTNER_LINKS_MIGRATION.sql
--
-- ВАЖНО: Этот скрипт использует CREATE OR REPLACE, поэтому безопасен для повторного запуска

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
BEGIN
  -- Получить данные партнера как JSONB
  SELECT row_to_json(p.*)::JSONB INTO v_partner
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
  
  -- Получить данные ключей
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', pk.key,
      'status', pk.status,
      'issued_at', pk.issued_at,
      'activated_at', pk.activated_at
    )
  ) INTO v_keys
  FROM public.premium_keys pk
  WHERE pk.partner_id = v_partner_id;
  
  -- Получить статистику активаций по ссылкам, если у партнера есть partner_code
  IF v_partner_code IS NOT NULL THEN
    SELECT 
      COUNT(*)::INTEGER as total_link_activations,
      COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('month', NOW()))::INTEGER as monthly_activations,
      COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('day', NOW()))::INTEGER as daily_activations
    INTO v_link_stats
    FROM public.partner_link_activations
    WHERE partner_id = v_partner_id;
  ELSE
    -- Инициализировать пустую статистику, если нет partner_code
    v_link_stats := ROW(0, 0, 0)::RECORD;
  END IF;
  
  -- Получить статистику (включая и ключи, и активации по ссылкам)
  SELECT jsonb_build_object(
    'total_keys_issued', COALESCE((v_partner->>'total_keys_issued')::INTEGER, 0),
    'total_keys_activated', COALESCE((v_partner->>'total_keys_activated')::INTEGER, 0),
    'activation_rate', 
      CASE 
        WHEN COALESCE((v_partner->>'total_keys_issued')::INTEGER, 0) > 0 
        THEN ROUND(
          (COALESCE((v_partner->>'total_keys_activated')::INTEGER, 0)::DECIMAL / 
           COALESCE((v_partner->>'total_keys_issued')::INTEGER, 1)) * 100
        )
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

COMMENT ON FUNCTION get_partner_dashboard IS 'Returns partner dashboard data including link activation statistics';



