-- =====================================================
-- Fix Telegram Link Collision
-- =====================================================
-- Обновляем функцию link_telegram_user, чтобы она корректно обрабатывала ситуации,
-- когда бот уже создал "пустой" профиль для пользователя Telegram.

CREATE OR REPLACE FUNCTION public.link_telegram_user(p_token UUID, p_telegram_id BIGINT, p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_existing_profile_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Проверяем токен
  SELECT profile_id INTO v_profile_id
  FROM public.telegram_link_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Link token is invalid or expired';
  END IF;

  -- 2. Проверяем, не привязан ли этот telegram_id уже к кому-то другому
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  -- 3. КРИТИЧНО: Если telegram_id привязан к другому профилю, проверяем, что это за профиль
  IF v_existing_profile_id IS NOT NULL AND v_existing_profile_id <> v_profile_id THEN
    -- Если это "заглушка" (профиль без user_id, созданный ботом), 
    -- мы просто отвязываем от него telegram_id, чтобы привязать к основному профилю
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_existing_profile_id AND user_id IS NULL) THEN
        UPDATE public.profiles
        SET telegram_id = NULL,
            updated_at = now()
        WHERE id = v_existing_profile_id;
        
        INSERT INTO public.telegram_link_history (profile_id, telegram_id, action, metadata)
        VALUES (v_existing_profile_id, p_telegram_id, 'unlinked', jsonb_build_object('reason', 'reassigned_during_linking'));
    ELSE
        -- Если профиль имеет привязанный user_id, значит это другой реальный пользователь
        RAISE EXCEPTION 'Telegram account already linked to another real profile';
    END IF;
  END IF;

  -- 4. Привязываем к нашему целевому профилю
  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      username = COALESCE(p_username, username),
      updated_at = now()
  WHERE id = v_profile_id;

  -- 5. Помечаем токен как использованный
  UPDATE public.telegram_link_tokens
  SET used_at = now()
  WHERE token = p_token;

  -- 6. Логируем успех
  INSERT INTO public.telegram_link_history (profile_id, telegram_id, action, metadata)
  VALUES (v_profile_id, p_telegram_id, 'linked', jsonb_build_object('username', p_username));

  v_result = jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'telegram_id', p_telegram_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_telegram_user(UUID, BIGINT, TEXT) TO service_role;
