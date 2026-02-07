-- Исправляем триггер handle_new_user для заполнения ОБОИХ полей (user_id + telegram_id)
-- КРИТИЧНО: Это решает проблему "Player not found" в дуэлях для Telegram пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_telegram_id BIGINT;
BEGIN
  -- Извлекаем telegram_id из метаданных (если есть)
  v_telegram_id := CASE
    WHEN NEW.raw_user_meta_data->>'telegram_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'telegram_id')::BIGINT
    WHEN NEW.raw_user_meta_data->>'sub' IS NOT NULL 
      AND (NEW.raw_user_meta_data->>'sub')::TEXT ~ '^\d+$'
      THEN (NEW.raw_user_meta_data->>'sub')::BIGINT
    ELSE NULL
  END;

  -- Логируем для отладки
  RAISE NOTICE '[handle_new_user] Creating profile: user_id=%, telegram_id=%, metadata=%', 
    NEW.id, v_telegram_id, NEW.raw_user_meta_data;

  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    photo_url,
    settings,
    platform,
    telegram_id  -- КРИТИЧНО: заполняем для Telegram пользователей
  )
  VALUES (
    NEW.id,  -- auth.uid() — всегда заполняем для совместимости
    COALESCE(
      NEW.raw_user_meta_data->>'first_name', 
      NEW.raw_user_meta_data->>'given_name',  -- Google OAuth fallback
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name'  -- Google OAuth fallback
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',  -- Google OAuth
      NEW.raw_user_meta_data->>'photo_url'    -- Telegram
    ),
    '{\"theme\": \"light\", \"language\": \"ru\", \"notifications\": true}'::jsonb,
    CASE 
      WHEN v_telegram_id IS NOT NULL THEN 'telegram'
      ELSE 'web'
    END,
    v_telegram_id  -- NULL для email/password, значение для Telegram
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- На случай повторного вызова (не должно быть, но для безопасности)
    telegram_id = COALESCE(EXCLUDED.telegram_id, profiles.telegram_id),
    photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url);

  RETURN NEW;
END;
$function$;

-- Логируем изменение
COMMENT ON FUNCTION public.handle_new_user() IS 
'Триггер создания профиля при регистрации. КРИТИЧНО: заполняет ОБА поля (user_id + telegram_id) для предотвращения "Player not found" ошибок в дуэлях.';
