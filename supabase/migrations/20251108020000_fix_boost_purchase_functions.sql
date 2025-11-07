-- Улучшить функцию increment_profile_value для поддержки отрицательных значений
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
DECLARE
  v_current_value INTEGER;
  v_new_value INTEGER;
  v_profile_exists BOOLEAN;
  v_rows_updated INTEGER;
BEGIN
  -- Проверяем, существует ли профиль
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Профиль с id % не найден', p_profile_id;
  END IF;

  -- Получаем текущее значение
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1',
    p_column
  ) INTO STRICT v_current_value USING p_profile_id;

  -- Вычисляем новое значение
  v_new_value := v_current_value + p_amount;

  -- Проверяем, что значение не станет отрицательным (для coins)
  IF p_column = 'coins' AND v_new_value < 0 THEN
    RAISE EXCEPTION 'Недостаточно монет. Текущий баланс: %, требуется: %', v_current_value, ABS(p_amount);
  END IF;

  -- Обновляем значение
  EXECUTE format(
    'UPDATE profiles SET %I = $1, updated_at = NOW() WHERE id = $2',
    p_column
  )
  USING v_new_value, p_profile_id;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Проверяем, что обновление произошло
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Не удалось обновить профиль с id %', p_profile_id;
  END IF;
END;
$$;

-- Улучшить функцию modify_boost_inventory для более надежной работы
CREATE OR REPLACE FUNCTION public.modify_boost_inventory(
  p_user_id UUID,
  p_boost_type TEXT,
  p_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_quantity INTEGER;
  v_record_exists BOOLEAN;
BEGIN
  -- Проверяем, существует ли запись
  SELECT EXISTS(
    SELECT 1 FROM boost_inventory
    WHERE user_id = p_user_id 
      AND boost_type = p_boost_type
  ) INTO v_record_exists;

  -- Если записи нет, создаем новую
  IF NOT v_record_exists THEN
    INSERT INTO boost_inventory (user_id, boost_type, quantity, updated_at)
    VALUES (p_user_id, p_boost_type, GREATEST(0, p_change), NOW());
  ELSE
    -- Если запись существует, обновляем
    UPDATE boost_inventory
    SET 
      quantity = GREATEST(0, COALESCE(quantity, 0) + p_change),
      updated_at = NOW()
    WHERE user_id = p_user_id 
      AND boost_type = p_boost_type;
  END IF;
END;
$$;

