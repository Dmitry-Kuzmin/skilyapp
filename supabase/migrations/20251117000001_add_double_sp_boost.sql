-- ============================================
-- Double SP Boost + Active Boosts System
-- ============================================

-- 1. Добавляем поля для временных бустов в boost_definitions
ALTER TABLE public.boost_definitions
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS effect_multiplier DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS effect_type TEXT DEFAULT NULL CHECK (effect_type IN ('sp_multiplier', 'xp_multiplier', 'coins_multiplier', 'instant'));

-- 2. Создаем таблицу активных бустов (временные эффекты)
CREATE TABLE IF NOT EXISTS public.active_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL,
  effect_multiplier DECIMAL(5,2) NOT NULL,
  effect_type TEXT NOT NULL CHECK (effect_type IN ('sp_multiplier', 'xp_multiplier', 'coins_multiplier', 'instant')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, boost_type)
);

-- Индексы для быстрого поиска активных бустов
-- Примечание: предикат WHERE expires_at > NOW() нельзя использовать в индексе,
-- так как NOW() не является IMMUTABLE функцией. Фильтрация выполняется в запросах.
CREATE INDEX IF NOT EXISTS idx_active_boosts_user_expires 
ON public.active_boosts(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_active_boosts_expires 
ON public.active_boosts(expires_at);

-- 3. Добавляем Double SP boost в boost_definitions
INSERT INTO public.boost_definitions (
  type,
  name_ru,
  name_es,
  description_ru,
  description_es,
  icon,
  cost_coins,
  is_premium,
  duration_minutes,
  effect_multiplier,
  effect_type
) VALUES (
  'double_sp',
  'Double SP',
  'Double SP',
  'Удваивает Season Points за дуэли на 1 час',
  'Duplica los Season Points por duelos durante 1 hora',
  '⚡',
  150,
  false,
  60, -- 1 час
  2.0, -- x2 множитель
  'sp_multiplier'
) ON CONFLICT (type) DO UPDATE SET
  duration_minutes = EXCLUDED.duration_minutes,
  effect_multiplier = EXCLUDED.effect_multiplier,
  effect_type = EXCLUDED.effect_type;

-- 4. Функция для активации временного буста
CREATE OR REPLACE FUNCTION activate_temporary_boost(
  p_user_id UUID,
  p_boost_type TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  expires_at TIMESTAMPTZ,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_boost_def RECORD;
  v_expires_at TIMESTAMPTZ;
  v_has_boost BOOLEAN;
BEGIN
  -- Проверяем наличие буста в инвентаре
  SELECT has_boost(p_user_id, p_boost_type) INTO v_has_boost;
  
  IF NOT v_has_boost THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Буст не найден в инвентаре'::TEXT;
    RETURN;
  END IF;
  
  -- Получаем определение буста
  SELECT * INTO v_boost_def
  FROM boost_definitions
  WHERE type = p_boost_type;
  
  IF NOT FOUND OR v_boost_def.duration_minutes IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Буст не поддерживает временную активацию'::TEXT;
    RETURN;
  END IF;
  
  -- Вычисляем время истечения
  v_expires_at := NOW() + (v_boost_def.duration_minutes || ' minutes')::INTERVAL;
  
  -- Активируем буст (или обновляем существующий)
  INSERT INTO active_boosts (
    user_id,
    boost_type,
    effect_multiplier,
    effect_type,
    expires_at
  )
  VALUES (
    p_user_id,
    p_boost_type,
    v_boost_def.effect_multiplier,
    v_boost_def.effect_type,
    v_expires_at
  )
  ON CONFLICT (user_id, boost_type)
  DO UPDATE SET
    activated_at = NOW(),
    expires_at = v_expires_at,
    effect_multiplier = EXCLUDED.effect_multiplier,
    effect_type = EXCLUDED.effect_type;
  
  -- Уменьшаем количество в инвентаре
  UPDATE boost_inventory
  SET quantity = quantity - 1
  WHERE user_id = p_user_id AND boost_type = p_boost_type;
  
  RETURN QUERY SELECT true, v_expires_at, 'Буст активирован'::TEXT;
END;
$$;

-- 5. Функция для получения активного множителя SP для пользователя
CREATE OR REPLACE FUNCTION get_sp_multiplier(p_user_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_multiplier DECIMAL(5,2) := 1.0;
BEGIN
  SELECT COALESCE(MAX(effect_multiplier), 1.0)
  INTO v_multiplier
  FROM active_boosts
  WHERE user_id = p_user_id
    AND effect_type = 'sp_multiplier'
    AND expires_at > NOW();
  
  RETURN v_multiplier;
END;
$$;

-- 6. Функция для очистки истекших бустов (можно вызывать периодически)
CREATE OR REPLACE FUNCTION cleanup_expired_boosts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM active_boosts
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- 7. Enable RLS для active_boosts
ALTER TABLE public.active_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active boosts"
  ON public.active_boosts FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can manage active boosts"
  ON public.active_boosts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Комментарии
COMMENT ON TABLE public.active_boosts IS 'Активные временные бусты пользователей (например, Double SP на 1 час)';
COMMENT ON FUNCTION activate_temporary_boost(UUID, TEXT) IS 'Активирует временный буст из инвентаря пользователя';
COMMENT ON FUNCTION get_sp_multiplier(UUID) IS 'Возвращает текущий множитель SP для пользователя (учитывает активные бусты)';
COMMENT ON FUNCTION cleanup_expired_boosts() IS 'Удаляет истекшие активные бусты (для периодической очистки)';

