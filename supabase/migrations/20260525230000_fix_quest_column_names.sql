-- Fix column names in get_or_assign_daily_quests:
-- daily_quest_definitions has title_ru/description_ru, not title/description
-- quest_id is in user_daily_quests (FK), not in daily_quest_definitions

CREATE OR REPLACE FUNCTION public.get_or_assign_daily_quests()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
DECLARE
  v_auth_id   uuid := auth.uid();
  v_user_id   uuid;
  v_intensity text;
  v_today     date := CURRENT_DATE;
  v_count     integer;
  v_quests    jsonb;
  v_easy_n    integer;
  v_medium_n  integer;
  v_hard_n    integer;
BEGIN
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id, COALESCE(track_intensity, 'standard')
    INTO v_user_id, v_intensity
  FROM public.profiles
  WHERE user_id = v_auth_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  CASE v_intensity
    WHEN 'light' THEN
      v_easy_n := 1;
      v_medium_n := 1;
      v_hard_n := 0;
    WHEN 'hardcore' THEN
      v_easy_n := 1;
      v_medium_n := 2;
      v_hard_n := 2;
    ELSE
      v_easy_n := 1;
      v_medium_n := 1;
      v_hard_n := 1;
  END CASE;

  SELECT COUNT(*) INTO v_count
  FROM public.user_daily_quests
  WHERE user_id = v_user_id AND assigned_at = v_today;

  IF v_count = 0 THEN
    INSERT INTO public.user_daily_quests (user_id, quest_id)
    SELECT v_user_id, id
    FROM (
      (
        SELECT id FROM public.daily_quest_definitions
        WHERE difficulty = 'easy' AND is_active = true
        ORDER BY random()
        LIMIT v_easy_n
      )
      UNION ALL
      (
        SELECT id FROM public.daily_quest_definitions
        WHERE difficulty = 'medium' AND is_active = true
        ORDER BY random()
        LIMIT v_medium_n
      )
      UNION ALL
      (
        SELECT id FROM public.daily_quest_definitions
        WHERE difficulty = 'hard' AND is_active = true
        ORDER BY random()
        LIMIT v_hard_n
      )
    ) AS picked
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',               udq.id,
      'quest_id',         udq.quest_id,
      'title',            dq.title_ru,
      'description',      dq.description_ru,
      'category',         dq.category,
      'difficulty',       dq.difficulty,
      'current_progress', udq.current_progress,
      'target_value',     dq.target_value,
      'reward_sp',        dq.reward_sp,
      'is_completed',     udq.is_completed,
      'is_claimed',       udq.is_claimed
    )
    ORDER BY
      CASE dq.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      udq.is_completed ASC
  )
  INTO v_quests
  FROM public.user_daily_quests udq
  JOIN public.daily_quest_definitions dq ON dq.id = udq.quest_id
  WHERE udq.user_id = v_user_id
    AND udq.assigned_at = v_today;

  RETURN COALESCE(v_quests, '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_assign_daily_quests() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_assign_daily_quests() TO authenticated;
