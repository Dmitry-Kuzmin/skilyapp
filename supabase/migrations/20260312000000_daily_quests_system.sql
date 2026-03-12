-- Migration: Daily Quests System
-- Description: Tables and functions for Daily Quests (Daily Pass)

-- 1. Таблица определений квестов
CREATE TABLE IF NOT EXISTS public.daily_quest_definitions (
    id TEXT PRIMARY KEY,
    title_ru TEXT NOT NULL,
    description_ru TEXT NOT NULL,
    category TEXT NOT NULL, -- 'questions', 'duels', 'exams', 'accuracy'
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
    target_value INTEGER NOT NULL,
    reward_sp INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Таблица квестов пользователя
CREATE TABLE IF NOT EXISTS public.user_daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id TEXT REFERENCES public.daily_quest_definitions(id),
    current_progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    assigned_at DATE DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, quest_id, assigned_at)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_id_date ON public.user_daily_quests(user_id, assigned_at);

-- 3. Функция для получения или назначения квестов (3 штуки каждый день)
CREATE OR REPLACE FUNCTION public.get_or_assign_daily_quests(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        -- Выбираем 1 Easy, 1 Medium, 1 Hard (или Medium если Hard нет)
        -- Используем UNION для гарантии набора разной сложности
        INSERT INTO public.user_daily_quests (user_id, quest_id)
        SELECT p_user_id, id FROM (
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'easy' AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'medium' AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty IN ('medium', 'hard') AND is_active = true ORDER BY random() LIMIT 1)
        ) AS random_quests
        LIMIT 3;
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
$$;

-- 4. Функция обновления прогресса квестов
CREATE OR REPLACE FUNCTION public.update_daily_quest_progress(
    p_user_id UUID,
    p_category TEXT,
    p_delta INTEGER DEFAULT 1,
    p_set_absolute BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    UPDATE public.user_daily_quests udq
    SET 
        current_progress = CASE 
            WHEN p_set_absolute THEN p_delta 
            ELSE udq.current_progress + p_delta 
        END,
        is_completed = CASE 
            WHEN (CASE WHEN p_set_absolute THEN p_delta ELSE udq.current_progress + p_delta END) >= dq.target_value THEN true 
            ELSE false 
        END,
        completed_at = CASE 
            WHEN NOT udq.is_completed AND (CASE WHEN p_set_absolute THEN p_delta ELSE udq.current_progress + p_delta END) >= dq.target_value THEN now()
            ELSE udq.completed_at
        END
    FROM public.daily_quest_definitions dq
    WHERE udq.quest_id = dq.id
      AND udq.user_id = p_user_id
      AND udq.assigned_at = v_today
      AND dq.category = p_category
      AND udq.is_completed = false;
END;
$$;

-- 5. Функция получения награды
CREATE OR REPLACE FUNCTION public.claim_daily_quest_reward(
    p_user_id UUID,
    p_user_quest_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward_sp INTEGER;
    v_quest_id TEXT;
BEGIN
    -- Проверяем выполнение и отсутствие выплаты
    SELECT dq.reward_sp, udq.quest_id INTO v_reward_sp, v_quest_id
    FROM public.user_daily_quests udq
    JOIN public.daily_quest_definitions dq ON udq.quest_id = dq.id
    WHERE udq.id = p_user_quest_id 
      AND udq.user_id = p_user_id 
      AND udq.is_completed = true 
      AND udq.is_claimed = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest not completed or already claimed');
    END IF;

    -- Помечаем как забранный
    UPDATE public.user_daily_quests
    SET is_claimed = true, claimed_at = now()
    WHERE id = p_user_quest_id;

    -- Начисляем SP (через существующую функцию или напрямую в прогресс сезона)
    -- В этом приложении SP часто начисляются через increment_profile_stats или напрямую в user_season_progress
    -- Для надежности попробуем найти RPC получения/создания прогресса
    PERFORM public.increment_profile_stats(p_user_id, 0, v_reward_sp, 0);

    RETURN jsonb_build_object('success', true, 'reward_sp', v_reward_sp);
END;
$$;

-- 6. Заполнение начальными квестами
INSERT INTO public.daily_quest_definitions (id, title_ru, description_ru, category, difficulty, target_value, reward_sp)
VALUES 
    ('warmup', 'Разминка', 'Ответь на 10 вопросов в любом режиме', 'questions', 'easy', 10, 20),
    ('duelist_1', 'Первая кровь', 'Сыграй 1 дуэль', 'duels', 'easy', 1, 30),
    ('winner', 'Победитель', 'Одержи 1 победу в дуэли', 'duels', 'medium', 1, 50),
    ('marathon', 'Марафон вопросов', 'Ответь на 50 вопросов', 'questions', 'medium', 50, 60),
    ('sniper', 'Снайпер', 'Ответь на 15 вопросов без ошибок подряд', 'accuracy', 'hard', 15, 100),
    ('exam_pass', 'Экзаменуемый', 'Пройти 1 экзамен', 'exams', 'medium', 1, 50),
    ('perfect_exam', 'Отличник', 'Сдай экзамен на 100%', 'exams', 'hard', 1, 150)
ON CONFLICT (id) DO UPDATE SET
    title_ru = EXCLUDED.title_ru,
    description_ru = EXCLUDED.description_ru,
    category = EXCLUDED.category,
    target_value = EXCLUDED.target_value,
    reward_sp = EXCLUDED.reward_sp;
