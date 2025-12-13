-- =====================================================
-- Добавление категории 'security' и шаблонов для Auth событий
-- Интеграция с новыми Supabase Auth Templates
-- =====================================================

-- 1. Расширяем constraint для добавления категории 'security'
ALTER TABLE public.notification_templates
  DROP CONSTRAINT IF EXISTS notification_templates_category_check;

ALTER TABLE public.notification_templates
  ADD CONSTRAINT notification_templates_category_check
  CHECK (category IN (
    'progress', 
    'duel', 
    'daily', 
    'educational', 
    'motivation', 
    'system', 
    'monetization', 
    'premium',
    'security'  -- Новая категория для Auth событий
  ));

-- =====================================================
-- 2. Шаблоны для событий безопасности
-- =====================================================

-- Password Changed
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'password_changed', '🔐 Пароль изменён',
  'Ваш пароль был успешно изменён. Если это были не вы, немедленно свяжитесь с поддержкой.',
  '🔐', 'Проверить активность', 'profile',
  jsonb_build_object('event', 'password_changed'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'password_changed'
);

-- Email Changed
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'email_changed', '📧 Email изменён',
  'Адрес электронной почты вашего аккаунта был изменён на {new_email}. Если это были не вы, немедленно свяжитесь с поддержкой.',
  '📧', 'Проверить настройки', 'profile',
  jsonb_build_object('event', 'email_changed'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'email_changed'
);

-- Phone Number Changed
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'phone_changed', '📱 Номер телефона изменён',
  'Номер телефона вашего аккаунта был изменён на {new_phone}. Если это были не вы, немедленно свяжитесь с поддержкой.',
  '📱', 'Проверить настройки', 'profile',
  jsonb_build_object('event', 'phone_changed'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'phone_changed'
);

-- Identity Linked (например, привязан Google аккаунт)
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'identity_linked', '🔗 Аккаунт привязан',
  'К вашему аккаунту был привязан {provider_name} ({provider_email}). Теперь вы можете входить через этот сервис.',
  '🔗', 'Проверить подключения', 'profile',
  jsonb_build_object('event', 'identity_linked'),
  0, 4, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'identity_linked'
);

-- Identity Unlinked (отвязан аккаунт)
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'identity_unlinked', '🔓 Аккаунт отвязан',
  'От вашего аккаунта был отвязан {provider_name}. Если это были не вы, немедленно свяжитесь с поддержкой.',
  '🔓', 'Проверить подключения', 'profile',
  jsonb_build_object('event', 'identity_unlinked'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'identity_unlinked'
);

-- MFA Enrolled (двухфакторная аутентификация включена)
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'mfa_enrolled', '🛡️ Двухфакторная аутентификация включена',
  'Двухфакторная аутентификация успешно включена для вашего аккаунта. Теперь ваш аккаунт защищён дополнительным уровнем безопасности.',
  '🛡️', 'Управление безопасностью', 'profile',
  jsonb_build_object('event', 'mfa_enrolled'),
  0, 4, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'mfa_enrolled'
);

-- MFA Unenrolled (двухфакторная аутентификация отключена)
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'mfa_unenrolled', '⚠️ Двухфакторная аутентификация отключена',
  'Двухфакторная аутентификация была отключена для вашего аккаунта. Если это были не вы, немедленно свяжитесь с поддержкой и включите её обратно.',
  '⚠️', 'Включить MFA', 'profile',
  jsonb_build_object('event', 'mfa_unenrolled'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'mfa_unenrolled'
);

-- Suspicious Login Attempt (подозрительная попытка входа)
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'security', 'suspicious_login', '🚨 Подозрительная попытка входа',
  'Обнаружена попытка входа в ваш аккаунт с необычного устройства или местоположения ({location}). Если это были не вы, немедленно смените пароль.',
  '🚨', 'Проверить активность', 'profile',
  jsonb_build_object('event', 'suspicious_login'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'suspicious_login'
);

-- =====================================================
-- 3. Комментарии
-- =====================================================
COMMENT ON COLUMN public.notification_templates.category IS 'Категория шаблона: progress, duel, daily, educational, motivation, system, monetization, premium, security';
COMMENT ON TABLE public.notification_templates IS 'Шаблоны уведомлений включая новые Auth события безопасности (password_changed, email_changed, mfa_enrolled и т.д.)';




