-- ========================================
-- Migration: Populate tests table with data
-- ========================================
-- Автоматически создает тесты на основе source_id в вопросах
-- Структура: GS-1 до GS-30 = Тест 1, GS-31 до GS-60 = Тест 2, и т.д.

-- Функция для автоматического создания тестов на основе source_id
CREATE OR REPLACE FUNCTION public.populate_tests_from_questions()
RETURNS void AS $$
DECLARE
  v_topic RECORD;
  v_prefix TEXT;
  v_min_num INTEGER;
  v_max_num INTEGER;
  v_test_number INTEGER;
  v_start_num INTEGER;
  v_end_num INTEGER;
  v_questions_per_test INTEGER := 30;
  v_test_count INTEGER;
  v_prev_test_id UUID;
  v_test_id UUID;
BEGIN
  -- Проходим по каждой теме
  FOR v_topic IN 
    SELECT DISTINCT t.id, t.number, t.title_ru
    FROM public.topics t
    WHERE EXISTS (
      SELECT 1 FROM public.questions_new q 
      WHERE q.topic_id = t.id AND q.source_id IS NOT NULL
    )
    ORDER BY t.number
  LOOP
    RAISE NOTICE 'Processing topic: % (ID: %)', v_topic.title_ru, v_topic.id;
    
    -- Определяем префикс source_id для этой темы (берем первый префикс из вопросов)
    SELECT 
      SUBSTRING(q.source_id FROM '^([A-Z]+)-') INTO v_prefix
    FROM public.questions_new q
    WHERE q.topic_id = v_topic.id 
      AND q.source_id IS NOT NULL
      AND q.source_id ~ '^[A-Z]+-\d+$'
    LIMIT 1;
    
    IF v_prefix IS NULL THEN
      RAISE NOTICE 'No valid source_id prefix found for topic %', v_topic.title_ru;
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'Found prefix: % for topic %', v_prefix, v_topic.title_ru;
    
    -- Находим минимальный и максимальный номер source_id для этой темы
    SELECT 
      MIN(CAST(SUBSTRING(q.source_id FROM ('^' || v_prefix || '-(\d+)$')) AS INTEGER)),
      MAX(CAST(SUBSTRING(q.source_id FROM ('^' || v_prefix || '-(\d+)$')) AS INTEGER))
    INTO v_min_num, v_max_num
    FROM public.questions_new q
    WHERE q.topic_id = v_topic.id
      AND q.source_id IS NOT NULL
      AND q.source_id ~ ('^' || v_prefix || '-\d+$');
    
    IF v_min_num IS NULL OR v_max_num IS NULL THEN
      RAISE NOTICE 'No valid source_id numbers found for topic %', v_topic.title_ru;
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'Source_id range: %-% to %-%', v_prefix, v_min_num, v_prefix, v_max_num;
    
    -- Создаем тесты группами по 30 вопросов
    v_test_number := 1;
    v_start_num := v_min_num;
    v_prev_test_id := NULL;
    
    WHILE v_start_num <= v_max_num LOOP
      v_end_num := LEAST(v_start_num + v_questions_per_test - 1, v_max_num);
      
      -- Подсчитываем количество вопросов в этом диапазоне
      SELECT COUNT(*) INTO v_test_count
      FROM public.questions_new q
      WHERE q.topic_id = v_topic.id
        AND q.source_id IS NOT NULL
        AND q.source_id ~ ('^' || v_prefix || '-\d+$')
        AND CAST(SUBSTRING(q.source_id FROM ('^' || v_prefix || '-(\d+)$')) AS INTEGER) BETWEEN v_start_num AND v_end_num;
      
      IF v_test_count = 0 THEN
        RAISE NOTICE 'No questions found for range %-% to %-%, skipping', v_prefix, v_start_num, v_prefix, v_end_num;
        v_start_num := v_end_num + 1;
        CONTINUE;
      END IF;
      
      RAISE NOTICE 'Creating test % for topic %: %-% to %-% (% questions)', 
        v_test_number, v_topic.title_ru, v_prefix, v_start_num, v_prefix, v_end_num, v_test_count;
      
      -- Создаем тест
      INSERT INTO public.tests (
        topic_id,
        test_number,
        title_ru,
        title_es,
        title_en,
        description_ru,
        description_es,
        description_en,
        source_id_prefix,
        source_id_start,
        source_id_end,
        questions_count,
        min_pass_percent,
        order_index,
        required_test_id,
        is_unlocked_by_default
      )
      VALUES (
        v_topic.id,
        v_test_number,
        'Тест ' || v_test_number || ': ' || v_topic.title_ru,
        'Test ' || v_test_number || ': ' || v_topic.title_ru,
        'Test ' || v_test_number || ': ' || v_topic.title_ru,
        'Тест ' || v_test_number || ' по теме "' || v_topic.title_ru || '". Вопросы ' || v_prefix || '-' || v_start_num || ' до ' || v_prefix || '-' || v_end_num || '.',
        'Test ' || v_test_number || ' for topic "' || v_topic.title_ru || '". Questions ' || v_prefix || '-' || v_start_num || ' to ' || v_prefix || '-' || v_end_num || '.',
        'Test ' || v_test_number || ' for topic "' || v_topic.title_ru || '". Questions ' || v_prefix || '-' || v_start_num || ' to ' || v_prefix || '-' || v_end_num || '.',
        v_prefix,
        v_start_num,
        v_end_num,
        v_test_count,
        80,
        v_test_number,
        v_prev_test_id,
        CASE WHEN v_test_number = 1 THEN true ELSE false END
      )
      ON CONFLICT (topic_id, test_number) DO UPDATE SET
        source_id_prefix = EXCLUDED.source_id_prefix,
        source_id_start = EXCLUDED.source_id_start,
        source_id_end = EXCLUDED.source_id_end,
        questions_count = EXCLUDED.questions_count,
        title_ru = EXCLUDED.title_ru,
        title_es = EXCLUDED.title_es,
        title_en = EXCLUDED.title_en,
        description_ru = EXCLUDED.description_ru,
        description_es = EXCLUDED.description_es,
        description_en = EXCLUDED.description_en
      RETURNING id INTO v_test_id;
      
      v_prev_test_id := v_test_id;
      v_test_number := v_test_number + 1;
      v_start_num := v_end_num + 1;
    END LOOP;
    
    RAISE NOTICE 'Created % tests for topic %', v_test_number - 1, v_topic.title_ru;
  END LOOP;
  
  RAISE NOTICE 'Finished populating tests';
END;
$$ LANGUAGE plpgsql;

-- Вызываем функцию для создания тестов
SELECT public.populate_tests_from_questions();

-- Добавляем комментарий к функции (она остается для будущего использования)
COMMENT ON FUNCTION public.populate_tests_from_questions IS 'Automatically creates tests based on source_id patterns in questions (30 questions per test)';

-- Примечание: Функция остается в базе данных для возможного повторного использования.
-- Если нужно удалить функцию после использования, раскомментируйте следующую строку:
-- DROP FUNCTION IF EXISTS public.populate_tests_from_questions();

