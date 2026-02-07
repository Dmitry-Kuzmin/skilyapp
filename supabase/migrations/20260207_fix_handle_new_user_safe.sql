-- Исправляем триггер handle_new_user: БЕЗОПАСНАЯ ВЕРСИЯ
-- Добавляем проверки на NULL и безопасное приведение типов, чтобы Google Auth не падал

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
    v_telegram_id := NULL; -- Если ошибка преобразования, просто оставляем NULL
  END;

  -- 2. Извлекаем имя (с фоллбэком на email)
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'given_name', 
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- 3. Извлекаем фамилию
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name',
    ''
  );

  -- 4. Извлекаем фото
  v_photo_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'photo_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- Логируем (чтобы видеть в Dashboard -> Postgres Logs)
  RAISE NOTICE '[handle_new_user] Creating profile: user_id=%, tg=%, name=%', NEW.id, v_telegram_id, v_first_name;

  -- 5. Вставляем профиль с обработкой конфликтов
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
    '{\"theme\": \"light\", \"language\": \"ru\", \"notifications\": true}'::jsonb,
    CASE 
      WHEN v_telegram_id IS NOT NULL THEN 'telegram'
      ELSE 'web'
    END,
    v_telegram_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    telegram_id = COALESCE(EXCLUDED.telegram_id, profiles.telegram_id),
    photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- ВАЖНО: Если триггер упадет, Auth будет заблокирован. 
  -- Логируем ошибку, но не блокируем создание пользователя (хотя профиль не создастся)
  -- Но лучше позволить создать профиль-заглушку, чем блокировать вход.
  RAISE WARNING '[handle_new_user] ERROR: %', SQLERRM;
  RETURN NEW;
END;
$function$;
