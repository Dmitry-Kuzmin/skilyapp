-- Fix streak quests and add new quest definitions
-- 1. Fix update_daily_quest_progress: support GREATEST (streak max) and reset semantics
-- 2. Change sniper category: accuracy → streak_correct
-- 3. Add 6 new quest definitions

-- ── 1. Fix update_daily_quest_progress ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_daily_quest_progress(uuid, text, integer, boolean);
-- New behavior for p_set_absolute:
--   p_set_absolute=true, p_delta=0  → reset to 0 (streak broken)
--   p_set_absolute=true, p_delta>0  → GREATEST(current, delta) (track max streak)
--   p_set_absolute=false            → current + delta (accumulate, existing behavior)

CREATE OR REPLACE FUNCTION public.update_daily_quest_progress(
  p_user_id      uuid,
  p_category     text,
  p_delta        integer,
  p_set_absolute boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_new_progress integer;
BEGIN
  UPDATE public.user_daily_quests udq
  SET
    current_progress = CASE
      WHEN p_set_absolute AND p_delta = 0
        THEN 0
      WHEN p_set_absolute AND p_delta > 0
        THEN GREATEST(udq.current_progress, p_delta)
      ELSE
        udq.current_progress + p_delta
    END,
    is_completed = CASE
      WHEN (CASE
              WHEN p_set_absolute AND p_delta = 0 THEN 0
              WHEN p_set_absolute AND p_delta > 0 THEN GREATEST(udq.current_progress, p_delta)
              ELSE udq.current_progress + p_delta
            END) >= dq.target_value THEN true
      ELSE false
    END,
    completed_at = CASE
      WHEN NOT udq.is_completed AND (CASE
              WHEN p_set_absolute AND p_delta = 0 THEN 0
              WHEN p_set_absolute AND p_delta > 0 THEN GREATEST(udq.current_progress, p_delta)
              ELSE udq.current_progress + p_delta
            END) >= dq.target_value THEN now()
      ELSE udq.completed_at
    END
  FROM public.daily_quest_definitions dq
  WHERE udq.quest_id = dq.id
    AND udq.user_id  = p_user_id
    AND udq.assigned_at = v_today
    AND dq.category  = p_category
    AND udq.is_completed = false;
END;
$$;

-- ── 2. Fix sniper: accuracy → streak_correct (only sniper tracks streaks)
-- ultra_accuracy stays as 'accuracy' (cumulative correct answers)
UPDATE public.daily_quest_definitions
SET category = 'streak_correct'
WHERE id = 'sniper';

-- ── 3. New quest definitions ─────────────────────────────────────────────────
INSERT INTO public.daily_quest_definitions
  (id, category, difficulty, target_value, reward_sp, is_active, title_ru, description_ru)
VALUES
  ('gladiator',     'duels',          'easy',   3,   35,  true, 'Гладиатор',     'Сразись в 3 дуэлях'),
  ('sharp_shooter', 'streak_correct', 'medium', 10,  65,  true, 'Снайпер',       '10 правильных ответов подряд'),
  ('exam_blitz',    'exams',          'hard',   3,   110, true, 'Экзамен-блиц',  'Пройди 3 экзамена за день'),
  ('iron_focus',    'streak_correct', 'hard',   20,  130, true, 'Железная воля', '20 правильных ответов подряд'),
  ('legend',        'questions',      'hard',   150, 160, true, 'Легенда',       'Ответь на 150 вопросов за день'),
  ('dominator',     'duel_wins',      'hard',   6,   155, true, 'Доминатор',     'Выиграй 6 дуэлей за день')
ON CONFLICT (id) DO NOTHING;
