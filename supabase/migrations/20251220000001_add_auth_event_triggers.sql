-- =====================================================
-- Database Triggers для автоматического вызова auth-event-handler
-- =====================================================
-- Автоматически вызывает auth-event-handler при изменении
-- пароля, email или других критичных Auth событий в auth.users

-- =====================================================
-- 1. Функция для вызова auth-event-handler через HTTP
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_auth_event_handler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_old_email TEXT;
  v_new_email TEXT;
  v_old_phone TEXT;
  v_new_phone TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_response_status INT;
BEGIN
  -- Получаем переменные окружения (если доступны через pg_settings)
  -- В реальности лучше использовать Edge Function или хранить в secrets
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  -- Если переменные не установлены, используем значения по умолчанию
  -- В production нужно настроить через Supabase Secrets или pg_settings
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://yffjnqegeiorunyvcxkn.supabase.co';
  END IF;
  
  -- Определяем тип события на основе изменений
  IF TG_OP = 'UPDATE' THEN
    -- Проверяем изменение email
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      v_event_type := 'email_changed';
      v_old_email := OLD.email;
      v_new_email := NEW.email;
      
      -- Вызываем auth-event-handler через HTTP (через Edge Function)
      -- ВАЖНО: Прямой HTTP вызов из PostgreSQL требует расширения http
      -- Альтернатива: использовать pg_net или вызывать через Edge Function
      -- Для MVP используем логирование, реальный вызов через Edge Function
      
      RAISE NOTICE '[Auth Trigger] Email changed: % -> % for user %', 
        v_old_email, v_new_email, NEW.id;
      
      -- TODO: Реальный HTTP вызов через pg_net или Edge Function
      -- PERFORM net.http_post(
      --   url := v_supabase_url || '/functions/v1/auth-event-handler',
      --   headers := jsonb_build_object(
      --     'Content-Type', 'application/json',
      --     'Authorization', 'Bearer ' || v_service_role_key
      --   ),
      --   body := jsonb_build_object(
      --     'event_type', v_event_type,
      --     'user_id', NEW.id,
      --     'old_value', v_old_email,
      --     'new_value', v_new_email
      --   )
      -- );
    END IF;
    
    -- Проверяем изменение phone
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      v_event_type := 'phone_changed';
      v_old_phone := OLD.phone;
      v_new_phone := NEW.phone;
      
      RAISE NOTICE '[Auth Trigger] Phone changed: % -> % for user %', 
        v_old_phone, v_new_phone, NEW.id;
    END IF;
    
    -- Проверяем изменение encrypted_password (смена пароля)
    -- ВАЖНО: В Supabase auth.users пароль хранится в encrypted_password
    -- Но это поле может быть недоступно напрямую
    -- Лучше использовать Supabase Auth Hooks или вызывать из кода
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 2. Триггер на auth.users для отслеживания изменений
-- =====================================================

-- ВАЖНО: Триггеры на auth.users требуют специальных прав
-- В Supabase это может быть ограничено
-- Альтернатива: использовать Supabase Auth Hooks (BETA) или вызывать из кода

-- DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
-- 
-- CREATE TRIGGER on_auth_user_updated
--   AFTER UPDATE ON auth.users
--   FOR EACH ROW
--   WHEN (
--     OLD.email IS DISTINCT FROM NEW.email
--     OR OLD.phone IS DISTINCT FROM NEW.phone
--   )
--   EXECUTE FUNCTION public.trigger_auth_event_handler();

-- =====================================================
-- 3. Комментарии и рекомендации
-- =====================================================

COMMENT ON FUNCTION public.trigger_auth_event_handler() IS 
'Триггерная функция для автоматического вызова auth-event-handler при изменении Auth данных. 
ВНИМАНИЕ: Прямые триггеры на auth.users могут быть ограничены в Supabase.
Рекомендуется использовать Supabase Auth Hooks (BETA) или вызывать auth-event-handler из кода приложения.';

-- =====================================================
-- 4. Альтернативный подход: Supabase Auth Hooks
-- =====================================================

-- Вместо Database Triggers можно использовать Supabase Auth Hooks (BETA)
-- Настроить в Dashboard → Authentication → Auth Hooks
-- 
-- Пример конфигурации:
-- {
--   "hook_type": "auth.user.updated",
--   "hook_url": "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/auth-event-handler",
--   "events": ["user.updated"]
-- }

-- =====================================================
-- 5. Рекомендация: Использовать вызовы из кода
-- =====================================================

-- Для MVP рекомендуется вызывать auth-event-handler из кода приложения
-- через useAuthEventListener или sendAuthEvent()
-- 
-- Это более надежно и не требует специальных прав на auth.users




