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
BEGIN
  -- Получаем текущее значение
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1',
    p_column
  ) INTO v_current_value USING p_profile_id;

  -- Проверяем, что значение не станет отрицательным (для coins)
  IF p_column = 'coins' AND (v_current_value + p_amount) < 0 THEN
    RAISE EXCEPTION 'Недостаточно монет. Текущий баланс: %, требуется: %', v_current_value, ABS(p_amount);
  END IF;

  -- Обновляем значение
  EXECUTE format(
    'UPDATE profiles SET %I = GREATEST(0, COALESCE(%I, 0) + $1), updated_at = NOW() WHERE id = $2',
    p_column, p_column
  )
  USING p_amount, p_profile_id;
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
  v_current_quantity INTEGER := 0;
BEGIN
  -- Получаем текущее количество
  SELECT COALESCE(quantity, 0) INTO v_current_quantity
  FROM boost_inventory
  WHERE user_id = p_user_id 
    AND boost_type = p_boost_type;

  -- Если записи нет и мы добавляем (p_change > 0), создаем новую
  IF v_current_quantity = 0 AND p_change > 0 THEN
    INSERT INTO boost_inventory (user_id, boost_type, quantity, updated_at)
    VALUES (p_user_id, p_boost_type, p_change, NOW())
    ON CONFLICT (user_id, boost_type) 
    DO UPDATE SET 
      quantity = GREATEST(0, boost_inventory.quantity + p_change),
      updated_at = NOW();
  -- Если запись существует, обновляем
  ELSIF v_current_quantity > 0 THEN
    UPDATE boost_inventory
    SET 
      quantity = GREATEST(0, quantity + p_change),
      updated_at = NOW()
    WHERE user_id = p_user_id 
      AND boost_type = p_boost_type;
  END IF;
END;
$$;

