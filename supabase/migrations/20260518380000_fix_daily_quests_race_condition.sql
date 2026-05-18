-- Fix race condition in get_or_assign_daily_quests:
-- Two simultaneous calls both pass COUNT=0 check and both try to INSERT,
-- causing unique constraint violation. ON CONFLICT DO NOTHING handles this.
-- Also handles case when UNION ALL picks same quest_id twice (medium appears in positions 2 and 3).

CREATE OR REPLACE FUNCTION public.get_or_assign_daily_quests(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_count INTEGER;
    v_quests JSONB;
BEGIN
    -- 1. Проверяем, есть ли уже квесты на сегодня
    SELECT COUNT(*) INTO v_count
    FROM public.user_daily_quests
    WHERE user_id = p_user_id AND assigned_at = v_today;

    -- 2. Если нет — назначаем новые
    IF v_count = 0 THEN
        INSERT INTO public.user_daily_quests (user_id, quest_id)
        SELECT p_user_id, id FROM (
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'easy' AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'medium' AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty IN ('medium', 'hard') AND is_active = true ORDER BY random() LIMIT 1)
        ) AS random_quests
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    -- 3. Возвращаем квесты с их определениями
    SELECT jsonb_agg(jsonb_build_object(
        'id', udq.id,
        'quest_id', udq.quest_id,
        'title', dq.title_ru,
        'description', dq.description_ru,
        'category', dq.category,
        'difficulty', dq.difficulty,
        'current_progress', udq.current_progress,
        'target_value', dq.target_value,
        'reward_sp', dq.reward_sp,
        'is_completed', udq.is_completed,
        'is_claimed', udq.is_claimed
    )) INTO v_quests
    FROM public.user_daily_quests udq
    JOIN public.daily_quest_definitions dq ON udq.quest_id = dq.id
    WHERE udq.user_id = p_user_id AND udq.assigned_at = v_today;

    RETURN COALESCE(v_quests, '[]'::jsonb);
END;
$function$;
