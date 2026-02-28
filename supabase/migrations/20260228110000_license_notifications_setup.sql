-- Миграция: Добавление точного отслеживания активности для уведомлений о потере баллов

-- 1. Добавляем колонки для точного времени и флагов уведомлений
ALTER TABLE public.profiles 
ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN license_warning_level TEXT; -- NULL, '12h', '1h'

-- 2. Инициализируем last_activity_at из существующей даты (если она есть)
UPDATE public.profiles 
SET last_activity_at = last_daily_point_at::TIMESTAMP WITH TIME ZONE 
WHERE last_daily_point_at IS NOT NULL;

-- 3. Обновляем функцию обработки событий, чтобы она обновляла и метку времени
CREATE OR REPLACE FUNCTION public.process_license_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_delta INTEGER DEFAULT 0,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_old_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- Получаем текущие баллы
    SELECT license_points INTO v_old_points FROM public.profiles WHERE id = p_user_id;
    
    -- Рассчитываем новые баллы (минимум 0, максимум 15)
    v_new_points := LEAST(15, GREATEST(0, COALESCE(v_old_points, 10) + p_delta));
    
    -- Обновляем профиль: баллы + дата активности + сброс флага уведомления
    UPDATE public.profiles
    SET 
        license_points = v_new_points,
        last_daily_point_at = CURRENT_DATE,
        last_activity_at = NOW(),
        license_warning_level = NULL -- Сбрасываем, так как активность была
    WHERE id = p_user_id;
    
    -- Логируем в аудит
    INSERT INTO public.user_license_points_audit (
        user_id,
        old_points,
        new_points,
        delta,
        event_type,
        reason
    ) VALUES (
        p_user_id,
        v_old_points,
        v_new_points,
        p_delta,
        p_event_type,
        p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Добавляем шаблоны уведомлений (если их нет)
-- Сначала убедимся, что по полю type есть уникальность для ON CONFLICT
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_templates_type_unique') THEN
        ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_type_unique UNIQUE (type);
    END IF;
END $$;

INSERT INTO public.notification_templates (category, type, title_template, message_template, icon, cooldown_hours, priority, ai_enhance)
VALUES 
('system', 'license_warning_12h', '⚠️ Внимание: права под угрозой', 'До потери балла за неактивность осталось всего 12 часов! Зайди и реши хотя бы один тест, чтобы сохранить прогресс.', '🚨', 24, 5, true),
('system', 'license_warning_1h', '⚡️ Последний шанс!', 'Через 1 час ты потеряешь 1 балл. Быстрее в приложение!', '🔥', 1, 5, true)
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    priority = EXCLUDED.priority;

-- 6. Добавляем правила уведомлений (удаляем старые если есть и вставляем заново)
DELETE FROM public.notification_rules WHERE event_type IN ('license_warning_12h', 'license_warning_1h');
INSERT INTO public.notification_rules (rule_name, event_type, template_type, category, priority, cooldown_hours, enabled)
VALUES 
('License Warning 12h', 'license_warning_12h', 'license_warning_12h', 'system', 5, 24, true),
('License Warning 1h', 'license_warning_1h', 'license_warning_1h', 'system', 5, 1, true);
