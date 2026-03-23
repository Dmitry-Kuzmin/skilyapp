-- =====================================================
-- Duel Pass & Daily Quest Notification Templates
-- =====================================================
-- Шаблоны для умных напоминаний:
-- 1. Ежедневные квесты
-- 2. Конец сезона (3д, 1д, последние часы)
-- 3. Близко к следующему уровню
-- 4. Срочные баллы через Duel Pass

-- Убедимся что constraint существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_templates_type_unique') THEN
        ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_type_unique UNIQUE (type);
    END IF;
END $$;

-- =====================================================
-- ШАБЛОНЫ
-- =====================================================

-- Ежедневные квесты Duel Pass
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('duel', 'duel_pass_daily_quest', '🎯 Квесты ждут тебя', 'Сегодняшние задания дают до +260 SP. Не упусти — завтра будут другие.', '🎯', 12, 3, false, 'Выполнить квесты', 'dashboard')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority,
    cta_text = EXCLUDED.cta_text,
    cta_deeplink = EXCLUDED.cta_deeplink;

-- Сезон заканчивается через 3 дня
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('duel', 'duel_pass_season_3d', '⏰ Сезон заканчивается через 3 дня', 'Финальный спринт! Каждый SP на счету. Уровень {level} — успеешь прокачать?', '⏰', 24, 4, true, 'К сезону', 'dashboard')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority;

-- Сезон заканчивается через 1 день
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('duel', 'duel_pass_season_1d', '🔥 Последний день сезона!', 'Через 24 часа сезон закроется. Уровень {level}. Успей забрать награды!', '🔥', 12, 5, true, 'Играть!', 'dashboard')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority;

-- Последние часы сезона
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('duel', 'duel_pass_season_last_hours', '⚡ Последний шанс!', 'Сезон "{season_name}" закрывается сегодня. Уровень {level} — забери свои награды!', '⚡', 3, 5, true, 'Играть сейчас!', 'dashboard')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority;

-- Близко к следующему уровню
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('duel', 'duel_pass_level_close', '🏆 Почти новый уровень!', 'До уровня {next_level} осталось всего {sp_remaining} SP. Одна дуэль — и ты там!', '🏆', 12, 4, false, 'Добить уровень', 'dashboard')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority;

-- Срочное предупреждение о баллах (через Duel Pass flow)
INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance, cta_text, cta_deeplink)
VALUES
('system', 'license_urgent_duelpass', '🚨 Баллы под угрозой!', 'Без активности ты потеряешь водительский балл. Зайди и реши один тест — это займёт 2 минуты.', '🚨', 6, 5, true, 'Пройти тест', 'learn')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    cooldown_hours = EXCLUDED.cooldown_hours,
    priority = EXCLUDED.priority;

-- =====================================================
-- ПРАВИЛА (notification_rules)
-- =====================================================

-- Убедимся что constraint на rule_name существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_rules_rule_name_key') THEN
        ALTER TABLE public.notification_rules ADD CONSTRAINT notification_rules_rule_name_key UNIQUE (rule_name);
    END IF;
END $$;

-- Правила для Duel Pass уведомлений
INSERT INTO public.notification_rules (rule_name, event_type, template_type, category, priority, cooldown_hours, max_per_day, enabled)
VALUES
('Duel Pass Daily Quest', 'duel_pass_daily_quest', 'duel_pass_daily_quest', 'duel', 3, 12, 2, true),
('Duel Pass Season 3d', 'duel_pass_season_3d', 'duel_pass_season_3d', 'duel', 4, 24, 1, true),
('Duel Pass Season 1d', 'duel_pass_season_1d', 'duel_pass_season_1d', 'duel', 5, 12, 2, true),
('Duel Pass Season Last Hours', 'duel_pass_season_last_hours', 'duel_pass_season_last_hours', 'duel', 5, 3, 3, true),
('Duel Pass Level Close', 'duel_pass_level_close', 'duel_pass_level_close', 'duel', 4, 12, 1, true),
('License Urgent DuelPass', 'license_urgent_duelpass', 'license_urgent_duelpass', 'system', 5, 6, 2, true)
ON CONFLICT (rule_name) DO UPDATE SET
    cooldown_hours = EXCLUDED.cooldown_hours,
    max_per_day = EXCLUDED.max_per_day,
    enabled = EXCLUDED.enabled;
