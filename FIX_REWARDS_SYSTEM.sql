-- ============================================
-- ИСПРАВЛЕНИЕ СИСТЕМЫ НАГРАД
-- ============================================
-- Применить в SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- 1. Добавляем RLS политики для test_results (если их нет)
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, если существуют
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
DROP POLICY IF EXISTS "Service role has full access to test results" ON public.test_results;

-- Пользователи могут видеть свои результаты
CREATE POLICY "Users can view own test results"
ON public.test_results FOR SELECT
TO authenticated
USING (auth.uid() IN (
  SELECT user_id FROM profiles WHERE id = test_results.user_id
));

-- Service role может все
CREATE POLICY "Service role has full access to test results"
ON public.test_results FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Добавляем RLS политики для reward_config
ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, если существуют
DROP POLICY IF EXISTS "Everyone can read reward config" ON public.reward_config;
DROP POLICY IF EXISTS "Service role can manage reward config" ON public.reward_config;

-- Все могут читать конфигурацию наград
CREATE POLICY "Everyone can read reward config"
ON public.reward_config FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Только service role может изменять
CREATE POLICY "Service role can manage reward config"
ON public.reward_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Проверяем и исправляем функцию get_active_reward_config
CREATE OR REPLACE FUNCTION public.get_active_reward_config(
  p_key TEXT,
  p_season_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Пытаемся получить конфигурацию для сезона
  IF p_season_id IS NOT NULL THEN
    SELECT value INTO v_config
    FROM public.reward_config
    WHERE key = p_key
      AND season_id = p_season_id
      AND is_active = true
    ORDER BY revision DESC
    LIMIT 1;
    
    IF v_config IS NOT NULL THEN
      RETURN v_config;
    END IF;
  END IF;
  
  -- Если не найдено для сезона или season_id = NULL, берем глобальную
  SELECT value INTO v_config
  FROM public.reward_config
  WHERE key = p_key
    AND season_id IS NULL
    AND is_active = true
  ORDER BY revision DESC
  LIMIT 1;
  
  RETURN v_config;
END;
$$;

COMMENT ON FUNCTION public.get_active_reward_config IS 'Получить активную конфигурацию наград (с приоритетом сезона)';

-- 4. Проверяем наличие данных в reward_config
DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count
  FROM public.reward_config
  WHERE key = 'test_rewards' AND is_active = true;
  
  -- Если нет конфигурации, создаем дефолтную
  IF config_count = 0 THEN
    INSERT INTO public.reward_config (key, value, revision, is_active, season_id)
    VALUES (
      'test_rewards',
      jsonb_build_object(
        'baseCoins', 10,
        'baseSP', 5,
        'questionsReference', 10,
        'maxQuestionsMultiplierCap', 2.0,
        'premiumCoinsMultiplier', 1.5,
        'premiumSPMultiplier', 1.5,
        'maxCoinsPerTest', 200,
        'maxSPPerTest', 100,
        'minCoinsPerTest', 2,
        'minTestDurationBase', 10,
        'minTestDurationPerQuestion', 3,
        'abuseDetection', jsonb_build_object(
          'enabled', true,
          'minAnswerSpeedSeconds', 2,
          'suspiciousPatternThreshold', 5,
          'minPenalty', 0.5
        ),
        'diminishingReturns', jsonb_build_object(
          'enabled', true,
          'threshold', 5,
          'reductionPerTest', 0.05,
          'maxReduction', 0.2
        )
      ),
      1,
      true,
      NULL
    )
    ON CONFLICT (key, season_id, revision) DO NOTHING;
    
    RAISE NOTICE 'Создана дефолтная конфигурация test_rewards';
  ELSE
    RAISE NOTICE 'Конфигурация test_rewards уже существует (% записей)', config_count;
  END IF;
END $$;

-- 5. Проверяем функцию increment_profile_value
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Валидация входных данных
  IF p_column NOT IN ('coins', 'xp', 'duel_pass_sp') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column;
  END IF;
  
  -- Обновляем значение
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  ) USING p_amount, p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;
END;
$$;

-- 6. Проверяем что таблица test_results существует и имеет правильную структуру
DO $$
BEGIN
  -- Проверяем существование таблицы
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'test_results'
  ) THEN
    RAISE EXCEPTION 'Table test_results does not exist! Run migration 20251119000000_create_test_rewards_system.sql first';
  END IF;
  
  RAISE NOTICE 'Таблица test_results существует';
END $$;

-- 7. Проверяем финальный результат
SELECT 
  'Конфигурация наград:' as check_type,
  COUNT(*) as count,
  jsonb_pretty(value) as config
FROM public.reward_config
WHERE key = 'test_rewards' AND is_active = true
GROUP BY value;

SELECT 
  'RLS политики test_results:' as check_type,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'test_results';

SELECT 
  'RLS политики reward_config:' as check_type,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'reward_config';

-- Тест функции get_active_reward_config
SELECT 
  'Тест get_active_reward_config' as test_name,
  CASE 
    WHEN public.get_active_reward_config('test_rewards', NULL) IS NOT NULL 
    THEN '✅ РАБОТАЕТ'
    ELSE '❌ НЕ РАБОТАЕТ'
  END as status,
  public.get_active_reward_config('test_rewards', NULL) as config;

