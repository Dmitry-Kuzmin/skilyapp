-- ============================================================
-- DAILY QUESTS SYSTEM: Full Fix + New Quests
-- Apply this in Supabase SQL Editor
-- ============================================================

-- 1. Фикс категорий
UPDATE public.daily_quest_definitions SET category = 'duel_wins'     WHERE id = 'winner';
UPDATE public.daily_quest_definitions SET category = 'perfect_exams' WHERE id = 'perfect_exam';

-- 2. Обновить функцию update_daily_quest_progress — теперь возвращает JSONB с завершёнными квестами
CREATE OR REPLACE FUNCTION public.update_daily_quest_progress(
    p_user_id    UUID,
    p_category   TEXT,
    p_delta      INTEGER DEFAULT 1,
    p_set_absolute BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today         DATE := CURRENT_DATE;
    v_completed     JSONB := '[]'::JSONB;
    v_quest         RECORD;
    v_new_progress  INTEGER;
BEGIN
    -- Обновляем прогресс для незавершённых квестов данной категории
    FOR v_quest IN
        SELECT udq.id, udq.current_progress, udq.is_completed, dq.target_value, dq.title_ru, dq.reward_sp, dq.category
        FROM   public.user_daily_quests   udq
        JOIN   public.daily_quest_definitions dq ON udq.quest_id = dq.id
        WHERE  udq.user_id    = p_user_id
          AND  udq.assigned_at = v_today
          AND  dq.category    = p_category
          AND  udq.is_completed = false
    LOOP
        v_new_progress := CASE
            WHEN p_set_absolute THEN p_delta
            ELSE LEAST(v_quest.current_progress + p_delta, v_quest.target_value)
        END;

        UPDATE public.user_daily_quests
        SET
            current_progress = v_new_progress,
            is_completed     = (v_new_progress >= v_quest.target_value),
            completed_at     = CASE
                WHEN v_new_progress >= v_quest.target_value THEN now()
                ELSE completed_at
            END
        WHERE id = v_quest.id;

        -- Если квест только что завершился — добавляем в результат
        IF v_new_progress >= v_quest.target_value THEN
            v_completed := v_completed || jsonb_build_object(
                'user_quest_id', v_quest.id,
                'title',         v_quest.title_ru,
                'reward_sp',     v_quest.reward_sp,
                'category',      v_quest.category
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('completed', v_completed);
END;
$$;

-- 3. Фикс claim_daily_quest_reward: SP идёт в p_sp (4-й параметр), не в p_xp (3-й)
CREATE OR REPLACE FUNCTION public.claim_daily_quest_reward(
    p_user_id       UUID,
    p_user_quest_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reward_sp INTEGER;
    v_quest_id  TEXT;
BEGIN
    SELECT dq.reward_sp, udq.quest_id INTO v_reward_sp, v_quest_id
    FROM   public.user_daily_quests        udq
    JOIN   public.daily_quest_definitions  dq ON udq.quest_id = dq.id
    WHERE  udq.id          = p_user_quest_id
      AND  udq.user_id     = p_user_id
      AND  udq.is_completed = true
      AND  udq.is_claimed   = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest not completed or already claimed');
    END IF;

    UPDATE public.user_daily_quests
    SET is_claimed = true, claimed_at = now()
    WHERE id = p_user_quest_id;

    -- SP → 4-й параметр (было XP → 3-й)
    PERFORM public.increment_profile_stats(p_user_id, 0, 0, v_reward_sp);

    RETURN jsonb_build_object('success', true, 'reward_sp', v_reward_sp);
END;
$$;

-- 4. Новые квесты
INSERT INTO public.daily_quest_definitions (id, title_ru, description_ru, category, difficulty, target_value, reward_sp, is_active)
VALUES
    -- Easy
    ('early_bird',      'Ранняя пташка',     'Ответь на 5 вопросов в любом режиме',    'questions',     'easy',    5,  15, true),

    -- Medium
    ('duel_streak',     'Серия побед',        'Выиграй 3 дуэли',                        'duel_wins',     'medium',  3,  80, true),
    ('question_master', 'Мастер вопросов',    'Ответь правильно на 30 вопросов подряд', 'accuracy',      'medium', 30,  70, true),
    ('two_exams',       'Двойной экзамен',    'Пройди 2 экзамена за день',              'exams',         'medium',  2,  90, true),

    -- Hard
    ('centurion',       'Центурион',          'Ответь на 100 вопросов за день',         'questions',     'hard',  100, 120, true),
    ('duel_master',     'Дуэлянт-мастер',     'Выиграй 5 дуэлей',                      'duel_wins',     'hard',    5, 130, true),
    ('ultra_accuracy',  'Суперточность',      'Ответь на 50 вопросов без ошибок',      'accuracy',      'hard',   50, 140, true)

ON CONFLICT (id) DO UPDATE SET
    title_ru       = EXCLUDED.title_ru,
    description_ru = EXCLUDED.description_ru,
    category       = EXCLUDED.category,
    difficulty     = EXCLUDED.difficulty,
    target_value   = EXCLUDED.target_value,
    reward_sp      = EXCLUDED.reward_sp,
    is_active      = true;
