-- =====================================================
-- Additional notification templates & rules
-- streak reminders, challenge bank, purchases, boosts
-- =====================================================

-- Helper insert
INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'motivation', 'daily_practice', '🔥 Серия под угрозой',
       'Вчера серия была {streak_days} дней. Пройди короткий тест сегодня, чтобы не потерять ритм.',
       '🔥', 'Открыть тренировку', 'learn',
       jsonb_build_object('event', 'streak_reminder'),
       24, 4, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'daily_practice');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'motivation', 'comeback_3days', '🔄 Давай продолжим',
       'Три дня без тренировок — это нормально. Я уже сохранил короткий сценарий, чтобы вернуться в ритм за 5 минут.',
       '🔄', 'Открыть Skilyapp', '',
       jsonb_build_object('event', 'inactive_3d'),
       48, 4, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'comeback_3days');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'motivation', 'comeback_7days', '💛 Я жду тебя в Skilyapp',
       'Прошло 7 дней без тренировок. Я подготовил челлендж “3×1 тест”, чтобы вернуться без стресса.',
       '💛', 'Запустить челлендж', 'challenge_reengage',
       jsonb_build_object('event', 'inactive_7d'),
       72, 5, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'comeback_7days');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'progress', 'almost_ready', '🏁 Остался финальный шаг',
       'Готовность {readiness_level}% — пора закрепить результат контрольным тестом.',
       '🏁', 'Пройти тест', 'tests',
       jsonb_build_object('event', 'almost_ready'),
       24, 4, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'almost_ready');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'educational', 'challenge_bank_ready', '🧠 {pending_questions} вопросов ждут реванша',
       'Банк вопросов накопил {pending_questions} ошибок. Давай разберём их и усилим память.',
       '🧠', 'Открыть Challenge Bank', 'tests/challenge-bank',
       jsonb_build_object('event', 'challenge_bank_pending'),
       48, 3, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'challenge_bank_ready');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'monetization', 'purchase_success', '✅ Покупка выполнена',
       '{product_name}: +{product_value}. Новый баланс {new_balance}.',
       '💳', 'Вернуться в приложение', '',
       jsonb_build_object('event', 'purchase_completed'),
       0, 5, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'purchase_success');

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon,
  cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 'motivation', 'boost_acquired', '⚡ Новый бустер готов',
       'Ты взял {boost_name}. Используй его в дуэлях или тестах, пока мотивация максимальная.',
       '⚡', 'Открыть Boost Hub', 'boosts',
       jsonb_build_object('event', 'boost_purchase'),
       12, 3, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE type = 'boost_acquired');

-- Notification rules for event-driven templates
INSERT INTO public.notification_rules (
  rule_name, event_type, user_state_filter, category, priority,
  cooldown_hours, max_per_day, template_type
) VALUES
  (
    'Challenge Bank Reminder',
    'challenge_bank_pending',
    jsonb_build_object('state', ARRAY['active','at_risk','passive']),
    'educational',
    4,
    48,
    1,
    'challenge_bank_ready'
  ),
  (
    'Purchase Confirmation',
    'purchase_completed',
    jsonb_build_object('state', ARRAY['active','at_risk','passive','new']),
    'monetization',
    5,
    0,
    3,
    'purchase_success'
  ),
  (
    'Boost Purchase Alert',
    'boost_purchase',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'motivation',
    3,
    12,
    2,
    'boost_acquired'
  )
ON CONFLICT (rule_name) DO NOTHING;

INSERT INTO public.notification_rules (
  rule_name, event_type, user_state_filter, category, priority,
  cooldown_hours, max_per_day, template_type
) VALUES
  (
    'Streak Protect Reminder',
    'streak_reminder',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'motivation',
    3,
    24,
    1,
    'daily_practice'
  ),
  (
    'Inactivity 3d Comeback',
    'inactive_3d',
    jsonb_build_object('state', ARRAY['active','at_risk','passive']),
    'motivation',
    4,
    48,
    1,
    'comeback_3days'
  ),
  (
    'Inactivity 7d Comeback',
    'inactive_7d',
    jsonb_build_object('state', ARRAY['at_risk','passive']),
    'motivation',
    5,
    72,
    1,
    'comeback_7days'
  ),
  (
    'Almost Ready Push',
    'almost_ready',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'progress',
    4,
    24,
    1,
    'almost_ready'
  )
ON CONFLICT (rule_name) DO NOTHING;



