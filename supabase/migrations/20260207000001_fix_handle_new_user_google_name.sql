-- Исправляем триггер handle_new_user: поддержка Google OAuth "name" поля
-- Google отправляет только "name" (не first_name/last_name), нужно разбить его

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_telegram_id BIGINT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_photo_url TEXT;
  v_full_name TEXT;
BEGIN
  -- 1. Безопасно извлекаем telegram_id
  BEGIN
    v_telegram_id := CASE
      WHEN NEW.raw_user_meta_data->>'telegram_id' IS NOT NULL AND (NEW.raw_user_meta_data->>'telegram_id')::TEXT ~ '^\d+$'
        THEN (NEW.raw_user_meta_data->>'telegram_id')::BIGINT
      WHEN NEW.raw_user_meta_data->>'sub' IS NOT NULL AND (NEW.raw_user_meta_data->>'sub')::TEXT ~ '^\d+$'
        THEN (NEW.raw_user_meta_data->>'sub')::BIGINT
      ELSE NULL
    END;
  EXCEPTION WHEN OTHERS THEN
    v_telegram_id := NULL;
  END;

  -- 2. Извлекаем полное имя (Google OAuth часто даёт только "name")
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'name',      -- Google: "Es Emigration"
    NEW.raw_user_meta_data->>'full_name',
    ''
  );

  -- 3. Извлекаем имя (с разбивкой "name" если нет first_name)
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',  -- Telegram
    NEW.raw_user_meta_data->>'given_name',  -- OAuth стандарт
    -- Если есть только "name", берём первое слово
    CASE 
      WHEN v_full_name != '' THEN split_part(v_full_name, ' ', 1)
      ELSE NULL
    END,
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- 4. Извлекаем фамилию
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name',
    -- Если есть только "name", берём остальные слова после первого
    CASE 
      WHEN v_full_name != '' AND array_length(string_to_array(v_full_name, ' '), 1) > 1 
        THEN substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 2)
      ELSE NULL
    END
  );

  -- 5. Извлекаем фото (Google даёт "picture" и "avatar_url")
  v_photo_url := COALESCE(
    NEW.raw_user_meta_data->>'picture',     -- Google OAuth (ПРИОРИТЕТ!)
    NEW.raw_user_meta_data->>'avatar_url',  -- Другие провайдеры
    NEW.raw_user_meta_data->>'photo_url',   -- Telegram
    NULL
  );

  -- Логируем для отладки
  RAISE NOTICE '[handle_new_user] Creating profile: user_id=%, tg=%, name="% %", photo=%', 
    NEW.id, v_telegram_id, v_first_name, v_last_name, v_photo_url;

  -- 6. Вставляем профиль
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    photo_url,
    settings,
    platform,
    telegram_id
  )
  VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    v_photo_url,
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    CASE 
      WHEN v_telegram_id IS NOT NULL THEN 'telegram'
      ELSE 'web'
    END,
    v_telegram_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    telegram_id = COALESCE(EXCLUDED.telegram_id, profiles.telegram_id),
    photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] ERROR: %', SQLERRM;
  RETURN NEW;
END;
$function$;
