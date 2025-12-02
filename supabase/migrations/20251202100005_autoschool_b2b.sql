-- ============================================================
-- AFFILIATE PROGRAM 2.0 - ЭТАП 5: B2B для Автошкол
-- ============================================================
-- Цель: Автошколы видят прогресс своих студентов в реальном времени
-- Киллер-фича: "Готов к экзамену" индикатор
-- ============================================================

-- 1. Добавить тип партнера "autoschool"
-- Расширяем существующий CHECK constraint
DO $$
BEGIN
  -- Удаляем старый constraint если существует
  ALTER TABLE public.partners 
  DROP CONSTRAINT IF EXISTS partners_partner_type_check;

  -- Создаем новый с autoschool
  ALTER TABLE public.partners 
  ADD CONSTRAINT partners_partner_type_check 
  CHECK (partner_type IN ('barter', 'revenue_share', 'autoschool'));
EXCEPTION
  WHEN OTHERS THEN
    -- Если constraint не существовал, просто добавляем
    ALTER TABLE public.partners 
    ADD CONSTRAINT partners_partner_type_check 
    CHECK (partner_type IN ('barter', 'revenue_share', 'autoschool'));
END $$;

-- 2. Таблица связи автошкола <-> студенты
CREATE TABLE IF NOT EXISTS public.autoschool_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Дополнительная информация (может заполнять автошкола)
  student_name TEXT, -- Если студент еще не зарегистрирован
  student_group TEXT, -- Группа обучения (например, "Группа А", "Вечерняя")
  enrollment_date DATE, -- Дата зачисления
  expected_exam_date DATE, -- Планируемая дата экзамена
  notes TEXT, -- Заметки инструктора
  
  -- Статус
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'dropped', 'on_hold')),
  
  -- Метаданные
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by UUID REFERENCES auth.users(id), -- Кто добавил студента
  
  UNIQUE(partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_autoschool_students_partner_id ON public.autoschool_students(partner_id);
CREATE INDEX IF NOT EXISTS idx_autoschool_students_user_id ON public.autoschool_students(user_id);
CREATE INDEX IF NOT EXISTS idx_autoschool_students_status ON public.autoschool_students(status);

-- Enable RLS
ALTER TABLE public.autoschool_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Autoschool partners can manage their students"
ON public.autoschool_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = autoschool_students.partner_id
    AND partners.user_id = auth.uid()
    AND partners.partner_type = 'autoschool'
  )
);

CREATE POLICY "Students can view their autoschool"
ON public.autoschool_students
FOR SELECT
USING (
  user_id = auth.uid()
);

CREATE POLICY "Admins can manage all autoschool students"
ON public.autoschool_students
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. Функция для добавления студента в автошколу
CREATE OR REPLACE FUNCTION add_student_to_autoschool(
  p_partner_id UUID,
  p_user_id UUID,
  p_student_group TEXT DEFAULT NULL,
  p_enrollment_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  student_id UUID
) AS $$
DECLARE
  v_partner RECORD;
  v_student_id UUID;
BEGIN
  -- Проверить, что это партнер типа autoschool
  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id
  AND partner_type = 'autoschool'
  AND registration_status = 'approved'
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found or is not an autoschool'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Проверить, что студент существует
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT false, 'Student user not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Добавить студента (или обновить если уже есть)
  INSERT INTO public.autoschool_students (
    partner_id,
    user_id,
    student_group,
    enrollment_date,
    notes,
    added_by,
    status
  ) VALUES (
    p_partner_id,
    p_user_id,
    p_student_group,
    COALESCE(p_enrollment_date, CURRENT_DATE),
    p_notes,
    auth.uid(),
    'active'
  )
  ON CONFLICT (partner_id, user_id)
  DO UPDATE SET
    student_group = EXCLUDED.student_group,
    notes = EXCLUDED.notes,
    status = 'active'
  RETURNING id INTO v_student_id;

  RETURN QUERY SELECT true, 'Student added successfully'::TEXT, v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция для получения прогресса студентов (КИЛЛЕР-ФИЧА!)
CREATE OR REPLACE FUNCTION get_autoschool_students_progress(
  p_partner_id UUID
)
RETURNS TABLE(
  student_id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  student_group TEXT,
  enrollment_date DATE,
  expected_exam_date DATE,
  
  -- Статистика из профиля
  total_tests_taken INTEGER,
  total_questions_answered INTEGER,
  correct_answers INTEGER,
  accuracy_rate DECIMAL,
  last_test_at TIMESTAMPTZ,
  
  -- Детальная статистика по типам тестов
  esencial_tests_taken INTEGER,
  priority_tests_taken INTEGER,
  general_tests_taken INTEGER,
  
  -- Готовность к экзамену
  exam_ready BOOLEAN,
  exam_readiness_score INTEGER, -- От 0 до 100
  readiness_status TEXT, -- 'not_ready', 'in_progress', 'almost_ready', 'ready'
  
  -- Слабые стороны (для рекомендаций)
  weak_categories JSONB,
  
  -- Активность
  days_since_last_test INTEGER,
  is_active BOOLEAN -- Активен ли в последние 7 дней
) AS $$
BEGIN
  RETURN QUERY
  WITH student_stats AS (
    SELECT
      ase.id as student_id,
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      ase.student_group,
      ase.enrollment_date,
      ase.expected_exam_date,
      COALESCE(p.total_tests_taken, 0) as tests_taken,
      COALESCE(p.total_questions_answered, 0) as questions_answered,
      COALESCE(p.correct_answers, 0) as correct_answers,
      p.last_test_at,
      p.created_at as registration_date,
      
      -- Детальная статистика
      COALESCE(p.esencial_tests_taken, 0) as esencial_tests,
      COALESCE(p.priority_tests_taken, 0) as priority_tests,
      COALESCE(p.general_tests_taken, 0) as general_tests
      
    FROM public.autoschool_students ase
    JOIN public.profiles p ON ase.user_id = p.id
    WHERE ase.partner_id = p_partner_id
    AND ase.status = 'active'
  ),
  student_analysis AS (
    SELECT
      ss.*,
      -- Точность
      CASE 
        WHEN ss.questions_answered > 0 
        THEN ROUND((ss.correct_answers::DECIMAL / ss.questions_answered::DECIMAL) * 100, 1)
        ELSE 0
      END as accuracy,
      
      -- Дни с последнего теста
      CASE 
        WHEN ss.last_test_at IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - ss.last_test_at)::INTEGER
        ELSE NULL
      END as days_since_test,
      
      -- Активность
      CASE 
        WHEN ss.last_test_at >= NOW() - INTERVAL '7 days' THEN true
        ELSE false
      END as active_status
      
    FROM student_stats ss
  )
  SELECT
    sa.student_id,
    sa.user_id,
    sa.full_name,
    sa.avatar_url,
    sa.student_group,
    sa.enrollment_date,
    sa.expected_exam_date,
    sa.tests_taken::INTEGER,
    sa.questions_answered::INTEGER,
    sa.correct_answers::INTEGER,
    sa.accuracy::DECIMAL,
    sa.last_test_at,
    sa.esencial_tests::INTEGER,
    sa.priority_tests::INTEGER,
    sa.general_tests::INTEGER,
    
    -- Готовность к экзамену (критерии DGT Испания)
    -- Требования: >15 тестов, >90% точность, хотя бы 1 тест каждого типа
    CASE 
      WHEN sa.tests_taken >= 15 
      AND sa.accuracy >= 90
      AND sa.esencial_tests >= 1
      AND sa.priority_tests >= 1
      AND sa.general_tests >= 1
      THEN true
      ELSE false
    END as exam_ready,
    
    -- Оценка готовности (0-100)
    LEAST(100, (
      -- 40% за количество тестов (макс 20 тестов)
      (LEAST(sa.tests_taken, 20)::DECIMAL / 20 * 40) +
      -- 50% за точность
      (sa.accuracy / 100 * 50) +
      -- 10% за разнообразие (все типы тестов)
      (CASE 
        WHEN sa.esencial_tests >= 1 AND sa.priority_tests >= 1 AND sa.general_tests >= 1 
        THEN 10 
        ELSE 0 
      END)
    ))::INTEGER as exam_readiness_score,
    
    -- Статус готовности
    CASE 
      WHEN sa.tests_taken >= 15 AND sa.accuracy >= 90 THEN 'ready'
      WHEN sa.tests_taken >= 10 AND sa.accuracy >= 85 THEN 'almost_ready'
      WHEN sa.tests_taken >= 5 OR sa.accuracy >= 70 THEN 'in_progress'
      ELSE 'not_ready'
    END as readiness_status,
    
    -- Слабые стороны (TODO: можно добавить анализ по категориям)
    '{}'::JSONB as weak_categories,
    
    sa.days_since_test,
    sa.active_status
    
  FROM student_analysis sa
  ORDER BY 
    -- Сортировка: сначала готовые к экзамену, потом по дате последнего теста
    CASE 
      WHEN sa.tests_taken >= 15 AND sa.accuracy >= 90 THEN 0
      ELSE 1
    END,
    sa.last_test_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для получения сводной статистики автошколы
CREATE OR REPLACE FUNCTION get_autoschool_summary(
  p_partner_id UUID
)
RETURNS TABLE(
  total_students INTEGER,
  active_students INTEGER,
  ready_for_exam INTEGER,
  almost_ready INTEGER,
  avg_accuracy DECIMAL,
  avg_tests_per_student DECIMAL,
  students_tested_today INTEGER,
  students_tested_this_week INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH student_data AS (
    SELECT
      ase.id,
      ase.status,
      p.total_tests_taken,
      p.total_questions_answered,
      p.correct_answers,
      p.last_test_at,
      CASE 
        WHEN p.total_questions_answered > 0 
        THEN (p.correct_answers::DECIMAL / p.total_questions_answered::DECIMAL) * 100
        ELSE 0
      END as accuracy
    FROM public.autoschool_students ase
    JOIN public.profiles p ON ase.user_id = p.id
    WHERE ase.partner_id = p_partner_id
  )
  SELECT
    COUNT(*)::INTEGER as total_students,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_students,
    COUNT(*) FILTER (WHERE total_tests_taken >= 15 AND accuracy >= 90)::INTEGER as ready_for_exam,
    COUNT(*) FILTER (WHERE total_tests_taken >= 10 AND total_tests_taken < 15 AND accuracy >= 85)::INTEGER as almost_ready,
    ROUND(AVG(accuracy), 1) as avg_accuracy,
    ROUND(AVG(total_tests_taken), 1) as avg_tests_per_student,
    COUNT(*) FILTER (WHERE last_test_at >= CURRENT_DATE)::INTEGER as students_tested_today,
    COUNT(*) FILTER (WHERE last_test_at >= NOW() - INTERVAL '7 days')::INTEGER as students_tested_this_week
  FROM student_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для получения топ студентов по точности
CREATE OR REPLACE FUNCTION get_autoschool_top_students(
  p_partner_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  accuracy_rate DECIMAL,
  total_tests_taken INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_students AS (
    SELECT
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      CASE 
        WHEN p.total_questions_answered > 0 
        THEN ROUND((p.correct_answers::DECIMAL / p.total_questions_answered::DECIMAL) * 100, 1)
        ELSE 0
      END as accuracy,
      p.total_tests_taken,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN p.total_questions_answered > 0 
          THEN (p.correct_answers::DECIMAL / p.total_questions_answered::DECIMAL) 
          ELSE 0 END DESC,
          p.total_tests_taken DESC
      )::INTEGER as rank
    FROM public.autoschool_students ase
    JOIN public.profiles p ON ase.user_id = p.id
    WHERE ase.partner_id = p_partner_id
    AND ase.status = 'active'
    AND p.total_tests_taken > 0
  )
  SELECT
    rs.user_id,
    rs.full_name,
    rs.avatar_url,
    rs.accuracy,
    rs.total_tests_taken::INTEGER,
    rs.rank
  FROM ranked_students rs
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Добавить поле instructor_mode_enabled для автошкол
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS instructor_mode_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.partners.instructor_mode_enabled IS 'Разрешить инструкторам использовать режим "Инструктор" (показывает правильные ответы сразу)';

-- 8. Функция для активации instructor mode для пользователя автошколы
CREATE OR REPLACE FUNCTION enable_instructor_mode(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Проверить, что пользователь является партнером-автошколой
  IF NOT EXISTS (
    SELECT 1 FROM public.partners
    WHERE user_id = p_user_id
    AND partner_type = 'autoschool'
    AND registration_status = 'approved'
    AND instructor_mode_enabled = true
  ) THEN
    RETURN QUERY SELECT false, 'Only autoschool partners can use instructor mode'::TEXT;
    RETURN;
  END IF;

  -- Активировать/деактивировать режим
  UPDATE public.profiles
  SET instructor_mode = p_enabled
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, 'Instructor mode updated'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии для документации
COMMENT ON TABLE public.autoschool_students IS 'Связь автошкол со студентами для отслеживания прогресса';
COMMENT ON COLUMN public.autoschool_students.student_group IS 'Группа обучения (например, "Группа А", "Вечерняя")';
COMMENT ON COLUMN public.autoschool_students.expected_exam_date IS 'Планируемая дата экзамена DGT';

COMMENT ON FUNCTION add_student_to_autoschool IS 'Добавляет студента в автошколу для отслеживания прогресса';
COMMENT ON FUNCTION get_autoschool_students_progress IS 'КИЛЛЕР-ФИЧА: Возвращает детальный прогресс всех студентов с индикатором "Готов к экзамену"';
COMMENT ON FUNCTION get_autoschool_summary IS 'Возвращает сводную статистику автошколы';
COMMENT ON FUNCTION get_autoschool_top_students IS 'Возвращает топ студентов по точности (для мотивации)';
COMMENT ON FUNCTION enable_instructor_mode IS 'Включает/выключает режим инструктора (показывает правильные ответы)';


