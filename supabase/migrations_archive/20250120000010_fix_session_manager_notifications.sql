-- Исправление функции create_or_update_session
-- Добавляем информацию о том, были ли закрыты сессии с того же устройства
-- Это нужно, чтобы не показывать уведомления при повторной инициализации на том же устройстве

-- Сначала удаляем старую функцию, так как меняется тип возврата
DROP FUNCTION IF EXISTS create_or_update_session(UUID, UUID, TEXT, INET, TEXT, INTEGER);

-- Создаем функцию заново с новым типом возврата
CREATE FUNCTION create_or_update_session(
  p_user_id UUID,
  p_device_id UUID,
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_max_sessions INTEGER DEFAULT 1 -- Только 1 активная сессия
)
RETURNS TABLE (
  session_id UUID,
  previous_sessions_closed INTEGER,
  closed_same_device BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_closed_count INTEGER := 0;
  v_closed_same_device_count INTEGER := 0;
  v_closed_same_device BOOLEAN := false;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Время истечения сессии: 30 дней
  v_expires_at := NOW() + INTERVAL '30 days';
  
  -- Сначала проверяем, сколько сессий с тем же устройством будет закрыто
  IF p_device_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_closed_same_device_count
    FROM user_sessions
    WHERE user_id = p_user_id 
      AND is_active = true
      AND session_token != p_session_token
      AND device_id = p_device_id;
    
    v_closed_same_device := v_closed_same_device_count > 0;
  END IF;
  
  -- Закрываем все предыдущие активные сессии (только 1 активная сессия)
  UPDATE user_sessions
  SET is_active = false
  WHERE user_id = p_user_id 
    AND is_active = true
    AND session_token != p_session_token;
  
  GET DIAGNOSTICS v_closed_count = ROW_COUNT;
  
  -- Проверяем, существует ли уже сессия с таким токеном
  SELECT id INTO v_session_id
  FROM user_sessions
  WHERE session_token = p_session_token;
  
  IF v_session_id IS NULL THEN
    -- Создаем новую сессию
    INSERT INTO user_sessions (
      user_id,
      device_id,
      session_token,
      ip_address,
      user_agent,
      is_active,
      expires_at,
      last_activity_at
    )
    VALUES (
      p_user_id,
      p_device_id,
      p_session_token,
      p_ip_address,
      p_user_agent,
      true,
      v_expires_at,
      NOW()
    )
    RETURNING id INTO v_session_id;
  ELSE
    -- Обновляем существующую сессию
    UPDATE user_sessions
    SET 
      is_active = true,
      last_activity_at = NOW(),
      expires_at = v_expires_at,
      device_id = COALESCE(p_device_id, device_id),
      ip_address = COALESCE(p_ip_address, ip_address),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = v_session_id;
  END IF;
  
  RETURN QUERY SELECT 
    v_session_id,
    v_closed_count,
    v_closed_same_device,
    CASE 
      WHEN v_closed_count > 0 THEN 
        format('Создана новая сессия. Закрыто предыдущих активных сессий: %s', v_closed_count)
      ELSE 
        'Сессия создана/обновлена'
    END::TEXT;
END;
$$;

COMMENT ON FUNCTION create_or_update_session(UUID, UUID, TEXT, INET, TEXT, INTEGER) IS 'Создает или обновляет сессию. Закрывает предыдущие активные сессии (только 1 активная). Возвращает информацию о том, были ли закрыты сессии с того же устройства.';

