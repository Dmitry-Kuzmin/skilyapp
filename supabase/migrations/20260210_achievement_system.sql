-- Achievement System Migration
-- 1. Create Achievement Definitions Table
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    id TEXT PRIMARY KEY,
    title_ru TEXT NOT NULL,
    description_ru TEXT NOT NULL,
    reward_xp INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    reward_badge TEXT,
    category TEXT NOT NULL,
    progress_target INTEGER NOT NULL DEFAULT 1,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Modify Achievements Table to link to definitions
-- First, add reward_granted columns (achievement_type already exists)
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS reward_granted BOOLEAN DEFAULT false;

-- 3. Function to initialize achievements for a new user
CREATE OR REPLACE FUNCTION public.initialize_user_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.achievements (user_id, achievement_type, title, description, max_progress, unlocked, progress)
    SELECT 
        NEW.id, 
        ad.id, 
        ad.title_ru, 
        ad.description_ru, 
        ad.progress_target, 
        false, 
        0
    FROM public.achievement_definitions ad
    WHERE ad.is_active = true
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Add unique constraint to achievements if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'achievements_user_id_achievement_type_key'
    ) THEN
        ALTER TABLE public.achievements ADD CONSTRAINT achievements_user_id_achievement_type_key UNIQUE (user_id, achievement_type);
    END IF;
END $$;

-- Trigger to initialize achievements on profile creation
DROP TRIGGER IF EXISTS tr_initialize_user_achievements ON public.profiles;
CREATE TRIGGER tr_initialize_user_achievements
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_achievements();

-- 4. Function to check and update achievement progress
CREATE OR REPLACE FUNCTION public.update_user_achievement(
    p_user_id UUID,
    p_achievement_type TEXT,
    p_progress_delta INTEGER DEFAULT 1,
    p_set_absolute BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_progress INTEGER;
    v_max_progress INTEGER;
    v_unlocked BOOLEAN;
    v_reward_xp INTEGER;
    v_reward_coins INTEGER;
    v_already_unlocked BOOLEAN;
    v_result JSONB;
BEGIN
    -- Get current state and definition
    SELECT 
        a.progress, 
        a.max_progress, 
        a.unlocked,
        ad.reward_xp,
        ad.reward_coins
    INTO 
        v_current_progress, 
        v_max_progress, 
        v_unlocked,
        v_reward_xp,
        v_reward_coins
    FROM public.achievements a
    JOIN public.achievement_definitions ad ON a.achievement_type = ad.id
    WHERE a.user_id = p_user_id AND a.achievement_type = p_achievement_type;

    IF NOT FOUND THEN
        -- If not found, try to initialize it
        INSERT INTO public.achievements (user_id, achievement_type, title, description, max_progress)
        SELECT p_user_id, id, title_ru, description_ru, progress_target
        FROM public.achievement_definitions 
        WHERE id = p_achievement_type
        ON CONFLICT (user_id, achievement_type) DO NOTHING;
        
        -- Re-fetch
        SELECT 
            a.progress, a.max_progress, a.unlocked, ad.reward_xp, ad.reward_coins
        INTO 
            v_current_progress, v_max_progress, v_unlocked, v_reward_xp, v_reward_coins
        FROM public.achievements a
        JOIN public.achievement_definitions ad ON a.achievement_type = ad.id
        WHERE a.user_id = p_user_id AND a.achievement_type = p_achievement_type;
    END IF;

    v_already_unlocked := v_unlocked;

    -- Update progress
    IF p_set_absolute THEN
        v_current_progress := p_progress_delta;
    ELSE
        v_current_progress := v_current_progress + p_progress_delta;
    END IF;

    -- Cap progress
    IF v_current_progress >= v_max_progress THEN
        v_current_progress := v_max_progress;
        v_unlocked := true;
    END IF;

    -- Update achievement record
    UPDATE public.achievements
    SET 
        progress = v_current_progress,
        unlocked = v_unlocked,
        unlocked_at = CASE WHEN v_unlocked AND NOT v_already_unlocked THEN now() ELSE unlocked_at END
    WHERE user_id = p_user_id AND achievement_type = p_achievement_type;

    -- Award rewards if just unlocked
    IF v_unlocked AND NOT v_already_unlocked THEN
        PERFORM public.increment_profile_stats(p_user_id, v_reward_coins, v_reward_xp, 0);
        
        -- Mark reward as granted
        UPDATE public.achievements SET reward_granted = true 
        WHERE user_id = p_user_id AND achievement_type = p_achievement_type;
        
        v_result := jsonb_build_object(
            'unlocked', true,
            'reward_xp', v_reward_xp,
            'reward_coins', v_reward_coins,
            'progress', v_current_progress
        );
    ELSE
        v_result := jsonb_build_object(
            'unlocked', v_unlocked,
            'progress', v_current_progress
        );
    END IF;

    RETURN v_result;
END;
$$;


-- 5. Seed initial definitions
INSERT INTO public.achievement_definitions (id, title_ru, description_ru, reward_xp, reward_coins, category, progress_target, icon)
VALUES 
    ('leader_of_roads', 'Лидер дорог', 'Занять первое место в рейтинге среди учеников', 200, 0, 'beginner', 1, 'Trophy'),
    ('spanish_driver', 'Испанский водитель', 'Пройти финальный тест по ПДД', 150, 0, 'master', 1, 'Flag'),
    ('photomodel', 'Фотомодель', 'Добавить фото в профиль', 20, 0, 'beginner', 1, 'Camera'),
    ('novice', 'Новичок', 'Завершить первый урок по ПДД', 30, 0, 'beginner', 1, 'BookOpen'),
    ('weekend_warrior', 'Воин выходного дня', 'Пройти тест в субботу и воскресенье', 50, 0, 'streak', 2, 'Shield'),
    ('enthusiast', 'Энтузиаст', 'Заниматься 3 дня подряд', 40, 0, 'streak', 3, 'Calendar'),
    ('social_butterfly', 'Душа компании', 'Пригласить 3 друзей в приложение', 80, 0, 'learning', 3, 'Users'),
    ('strategist', 'Стратег', 'Завершить 10 дополнительных тестов', 120, 0, 'accuracy', 10, 'Target'),
    ('true_student', 'Настоящий ученик', 'Завершить 10 дней подряд без пропусков', 200, 0, 'streak', 10, 'Calendar'),
    ('flawless_driver', 'Безошибочный водитель', 'Пройти 20 уроков без ошибок', 250, 0, 'accuracy', 20, 'Award'),
    ('examiner', 'Экзаменатор', 'Пройти 20 экзаменационных тестов', 200, 0, 'games', 20, 'CheckSquare'),
    ('sign_sniper', 'Снайпер знаков', 'Узнать 50 знаков без ошибок', 200, 0, 'accuracy', 50, 'Target'),
    ('pdd_genius', 'Гений ПДД', 'Набрать 100% правильных ответов в экзаменационном тесте', 500, 0, 'master', 1, 'Lightbulb'),
    ('sign_master', 'Знаток знаков', 'Выучить 100 дорожных знаков', 500, 0, 'master', 100, 'Flag'),
    ('pdd_master', 'Мастер ПДД', 'Набрать 4000 очков опыта', 1000, 0, 'master', 4000, 'Crown')
ON CONFLICT (id) DO UPDATE SET
    title_ru = EXCLUDED.title_ru,
    description_ru = EXCLUDED.description_ru,
    reward_xp = EXCLUDED.reward_xp,
    reward_coins = EXCLUDED.reward_coins,
    category = EXCLUDED.category,
    progress_target = EXCLUDED.progress_target,
    icon = EXCLUDED.icon;

-- 6. Update process_test_completion to track achievements
CREATE OR REPLACE FUNCTION public.process_test_completion(
  p_user_id UUID,
  p_test_id TEXT,
  p_session_id TEXT,
  p_score INTEGER,
  p_questions_count INTEGER,
  p_correct_count INTEGER,
  p_test_duration_seconds INTEGER,
  p_premium_flag BOOLEAN DEFAULT FALSE,
  p_double_sp_active BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_coins_reward INTEGER;
  v_sp_reward INTEGER;
  v_is_premium BOOLEAN;
  v_test_result_id UUID;
  v_subscription_status TEXT;
  v_subscription_expires_at TIMESTAMPTZ;
  v_premium_forever_purchased_at TIMESTAMPTZ;
  v_questions_multiplier NUMERIC;
  v_abuse_penalty NUMERIC := 1.0;
  v_diminishing_factor NUMERIC := 1.0;
  v_tests_today INTEGER;
  v_base_coins INTEGER;
  v_base_sp INTEGER;
  v_is_exam BOOLEAN;
BEGIN
  -- Set search path to public to be safe
  SET LOCAL search_path = public;
  
  -- Check if it's an exam based on test_id or context (assuming exams have specific IDs or count)
  v_is_exam := (p_test_id LIKE '%exam%' OR p_questions_count >= 30);

  -- 1. Проверка Premium статуса
  SELECT subscription_status, subscription_expires_at, premium_forever_purchased_at
  INTO v_subscription_status, v_subscription_expires_at, v_premium_forever_purchased_at
  FROM profiles
  WHERE id = p_user_id;

  v_is_premium := (
    (v_subscription_status IN ('trial', 'active') AND v_subscription_expires_at > NOW())
    OR v_premium_forever_purchased_at IS NOT NULL
  );

  -- 2. Расчет мультипликатора длины теста
  v_questions_multiplier := CASE
    WHEN p_questions_count <= 10 THEN p_questions_count::NUMERIC / 10
    ELSE 1.0 + (1 - EXP(-(p_questions_count - 10)::NUMERIC / 15)) * 0.5
  END;
  v_questions_multiplier := LEAST(v_questions_multiplier, 1.5);

  -- 3. Базовые награды
  v_base_coins := GREATEST(
    ROUND(20 * (p_score::NUMERIC / 100) * v_questions_multiplier),
    CEIL(1.5 * v_questions_multiplier)
  )::INTEGER;

  v_base_sp := ROUND(
    15 * (0.35 + p_score::NUMERIC / 180) + 
    FLOOR(p_questions_count / 10) +
    CASE WHEN p_score = 100 THEN 10 ELSE 0 END
  )::INTEGER;

  -- 4. Premium множители
  IF v_is_premium THEN
    v_base_coins := ROUND(v_base_coins * 1.5)::INTEGER;
    v_base_sp := ROUND(v_base_sp * 1.3)::INTEGER;
  END IF;

  -- 5. Double SP
  IF p_double_sp_active THEN
    v_base_sp := v_base_sp * 2;
  END IF;

  -- 6. Diminishing returns
  SELECT COUNT(*) INTO v_tests_today
  FROM test_results
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  IF v_tests_today > 10 THEN
    v_diminishing_factor := GREATEST(0.8, 1 - (v_tests_today - 10)::NUMERIC * 0.05);
  END IF;

  -- 7. Применяем множители
  v_coins_reward := LEAST(
    ROUND(v_base_coins * v_abuse_penalty * v_diminishing_factor),
    100
  )::INTEGER;

  v_sp_reward := LEAST(
    ROUND(v_base_sp * v_abuse_penalty * v_diminishing_factor),
    100
  )::INTEGER;

  -- 8. Обновляем баланс (атомарно через increment_profile_stats)
  PERFORM public.increment_profile_stats(p_user_id, v_coins_reward, v_sp_reward, 0);

  -- 9. Записываем результат теста
  INSERT INTO public.test_results (
    user_id, test_id, session_id, score, questions_count, correct_count, 
    test_duration_seconds, coins_awarded, sp_awarded
  )
  VALUES (
    p_user_id,
    CASE WHEN p_test_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_test_id::UUID ELSE NULL END,
    p_session_id, p_score, p_questions_count, p_correct_count, p_test_duration_seconds, v_coins_reward, v_sp_reward
  )
  RETURNING id INTO v_test_result_id;

  -- 10. Обновляем статус сессии
  UPDATE public.test_sessions SET status = 'completed', finished_at = NOW(), updated_at = NOW() WHERE session_id = p_session_id;

  -- 11. ПРОВЕРКА ДОСТИЖЕНИЙ
  -- Novice (1st test)
  PERFORM public.update_user_achievement(p_user_id, 'novice', 1, false);
  
  -- Strategist (Total tests)
  PERFORM public.update_user_achievement(p_user_id, 'strategist', 1, false);
  
  -- PDD Genius (100% on exam)
  IF v_is_exam AND p_score = 100 THEN
    PERFORM public.update_user_achievement(p_user_id, 'pdd_genius', 1, true);
  END IF;
  
  -- Examiner (20 exams)
  IF v_is_exam THEN
    PERFORM public.update_user_achievement(p_user_id, 'examiner', 1, false);
  END IF;

  -- 12. Логируем транзакцию
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (p_user_id, 'coins_earned_test', v_coins_reward, json_build_object('test_id', p_test_id, 'score', p_score)::JSONB);

  -- 13. Возвращаем результат
  RETURN json_build_object(
    'coins_awarded', v_coins_reward,
    'sp_awarded', v_sp_reward,
    'test_result_id', v_test_result_id,
    'is_premium', v_is_premium
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger to track achievements from user_metrics
CREATE OR REPLACE FUNCTION public.sync_achievements_with_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Novice
    IF NEW.total_tests_completed >= 1 THEN
        PERFORM public.update_user_achievement(NEW.user_id, 'novice', 1, true);
    END IF;

    -- Enthusiast
    IF NEW.streak_days >= 3 THEN
        PERFORM public.update_user_achievement(NEW.user_id, 'enthusiast', 3, true);
    END IF;

    -- True Student
    IF NEW.streak_days >= 10 THEN
        PERFORM public.update_user_achievement(NEW.user_id, 'true_student', 10, true);
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_achievements_on_metrics ON public.user_metrics;
CREATE TRIGGER tr_sync_achievements_on_metrics
AFTER INSERT OR UPDATE ON public.user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.sync_achievements_with_metrics();

-- 8. Trigger to track achievements from profile updates (Photo)
CREATE OR REPLACE FUNCTION public.sync_achievements_with_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Photomodel (Photo added)
    IF NEW.avatar_url IS NOT NULL AND (OLD.avatar_url IS NULL OR OLD.avatar_url <> NEW.avatar_url) THEN
        PERFORM public.update_user_achievement(NEW.id, 'photomodel', 1, true);
    END IF;

    -- PDD Master (XP check)
    IF NEW.xp >= 4000 THEN
        PERFORM public.update_user_achievement(NEW.id, 'pdd_master', 4000, true);
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_achievements_on_profile ON public.profiles;
CREATE TRIGGER tr_sync_achievements_on_profile
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_achievements_with_profile();

