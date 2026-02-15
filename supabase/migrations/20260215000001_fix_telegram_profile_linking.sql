
-- Исправленная функция handle_new_user для корректной обработки аватарок из Telegram
-- Она также обеспечивает умную привязку telegram_id и объединение дубликатов
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_telegram_id BIGINT;
  v_profile_exists BOOLEAN;
  v_existing_profile_id UUID;
BEGIN
  -- Извлекаем telegram_id из метаданных
  v_telegram_id := CASE
    WHEN NEW.raw_user_meta_data->>'telegram_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'telegram_id')::BIGINT
    WHEN NEW.raw_user_meta_data->>'sub' IS NOT NULL 
      AND (NEW.raw_user_meta_data->>'sub')::TEXT ~ '^\d+$'
      THEN (NEW.raw_user_meta_data->>'sub')::BIGINT
    ELSE NULL
  END;

  -- Логируем
  RAISE NOTICE '[handle_new_user] Start for user_id=% (tg=%)', NEW.id, v_telegram_id;

  -- Пытаемся обновить существующий профиль по telegram_id
  IF v_telegram_id IS NOT NULL THEN
    -- Сначала проверяем, есть ли уже профиль с таким user_id
    SELECT id INTO v_existing_profile_id FROM public.profiles WHERE user_id = NEW.id;
    
    IF v_existing_profile_id IS NOT NULL THEN
       -- Профиль с таким user_id уже существует.
       -- Удаляем любые ДРУГИЕ профили с этим telegram_id (они дубликаты)
       DELETE FROM public.profiles 
       WHERE telegram_id = v_telegram_id AND id != v_existing_profile_id;
       
       -- Обновляем telegram_id и АВАТАРКУ, если она пришла
       UPDATE public.profiles
       SET telegram_id = v_telegram_id,
           photo_url = COALESCE(
             NEW.raw_user_meta_data->>'avatar_url', 
             NEW.raw_user_meta_data->>'photo_url', 
             profiles.photo_url
           ),
           updated_at = now()
       WHERE id = v_existing_profile_id;
       
       v_profile_exists := TRUE;
       RAISE NOTICE '[handle_new_user] Updated existing profile user_id=% with tg=% and photo', NEW.id, v_telegram_id;
    ELSE
       -- Профиля с user_id нет. Ищем по telegram_id
       UPDATE public.profiles 
       SET 
         user_id = NEW.id,
         first_name = COALESCE(profiles.first_name, NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
         last_name = COALESCE(profiles.last_name, NEW.raw_user_meta_data->>'last_name'),
         photo_url = COALESCE(
           NEW.raw_user_meta_data->>'avatar_url',
           NEW.raw_user_meta_data->>'photo_url',
           profiles.photo_url
         ),
         platform = 'telegram',
         updated_at = now()
       WHERE telegram_id = v_telegram_id;
       
       GET DIAGNOSTICS v_profile_exists = ROW_COUNT;
       IF v_profile_exists THEN
          RAISE NOTICE '[handle_new_user] Linked existing profile(tg=%) to user_id=%', v_telegram_id, NEW.id;
       END IF;
    END IF;
  ELSE
    v_profile_exists := FALSE;
  END IF;

  -- Если профиль не был обновлен (не существовал или нет tg_id), создаем новый
  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (
      user_id,
      telegram_id,
      first_name,
      last_name,
      photo_url,
      settings,
      platform
    )
    VALUES (
      NEW.id,
      v_telegram_id,
      COALESCE(
        NEW.raw_user_meta_data->>'first_name', 
        NEW.raw_user_meta_data->>'given_name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'family_name'
      ),
      -- Приоритет: avatar_url (Mina App), потом photo_url
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'photo_url'
      ),
      '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
      CASE WHEN v_telegram_id IS NOT NULL THEN 'telegram' ELSE 'web' END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      telegram_id = COALESCE(profiles.telegram_id, EXCLUDED.telegram_id),
      photo_url = COALESCE(
        EXCLUDED.photo_url, 
        profiles.photo_url
      );
    
    RAISE NOTICE '[handle_new_user] Created new profile for user_id=% (tg=%)', NEW.id, v_telegram_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] ERROR for user_id %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2. Обратная привязка (Backfill) - привязываем существующих юзеров к их профилям
DO $$
DECLARE
  r RECORD;
  v_existing_profile_id UUID;
  v_conflict_profile_id UUID;
BEGIN
  FOR r IN 
    SELECT id, email, (raw_user_meta_data->>'telegram_id')::BIGINT as tg_id 
    FROM auth.users 
    WHERE raw_user_meta_data->>'telegram_id' IS NOT NULL
  LOOP
    BEGIN
        -- 1. Ищем существующий профиль по user_id
        SELECT id INTO v_existing_profile_id FROM public.profiles WHERE user_id = r.id;
        
        IF v_existing_profile_id IS NOT NULL THEN
            -- Если профиль есть, и у нас есть telegram_id для привязки
            
            -- Сначала УДАЛЯЕМ всех конкурентов на этот telegram_id
            -- Игнорируем наш собственный профиль
            DELETE FROM public.profiles 
            WHERE telegram_id = r.tg_id AND id != v_existing_profile_id;

            -- Теперь обновляем наш профиль
            UPDATE public.profiles
            SET telegram_id = r.tg_id
            WHERE id = v_existing_profile_id AND (telegram_id IS NULL OR telegram_id != r.tg_id);
            
        ELSE
            -- Профиля по user_id нет. Может есть по telegram_id?
            -- Если есть - забираем его себе
            UPDATE public.profiles 
            SET user_id = r.id 
            WHERE telegram_id = r.tg_id AND user_id IS NULL;
            
            -- Если даже так ничего не обновилось, ничего страшного.
            -- Профиль создастся при следующем входе.
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error processing user %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
