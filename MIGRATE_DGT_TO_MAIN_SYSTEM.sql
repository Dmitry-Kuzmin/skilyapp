-- ========================================
-- ИНТЕГРАЦИЯ DGT ВОПРОСОВ В ОСНОВНУЮ СИСТЕМУ
-- ========================================
-- Этот скрипт переносит DGT вопросы в существующую систему тестов
-- с AI подсказками, переводами и картой навигации

-- Шаг 1: Создаём темы для категорий DGT
INSERT INTO public.topics (number, title_ru, title_es, title_en, cover_image, is_premium, gradient_from, gradient_to)
VALUES 
  (100, 'DGT Экзамен A1', 'Examen DGT A1', 'DGT Exam A1', NULL, false, '#FF6B35', '#FF8C42'),
  (101, 'DGT Экзамен B', 'Examen DGT B', 'DGT Exam B', NULL, false, '#00A8E8', '#0077B6'),
  (102, 'DGT Экзамен D', 'Examen DGT D', 'DGT Exam D', NULL, false, '#7B2CBF', '#9D4EDD')
ON CONFLICT (number) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  title_es = EXCLUDED.title_es,
  title_en = EXCLUDED.title_en,
  gradient_from = EXCLUDED.gradient_from,
  gradient_to = EXCLUDED.gradient_to;

-- Шаг 2: Переносим вопросы из dgt_questions в questions_new
-- Важно: Сначала получаем ID тем
DO $$
DECLARE
  topic_a1_id UUID;
  topic_b_id UUID;
  topic_d_id UUID;
  dgt_question RECORD;
  new_question_id UUID;
BEGIN
  -- Получаем ID тем
  SELECT id INTO topic_a1_id FROM public.topics WHERE number = 100;
  SELECT id INTO topic_b_id FROM public.topics WHERE number = 101;
  SELECT id INTO topic_d_id FROM public.topics WHERE number = 102;

  -- Переносим вопросы для каждой категории
  FOR dgt_question IN 
    SELECT * FROM public.dgt_questions
  LOOP
    -- Определяем topic_id по категории
    DECLARE
      current_topic_id UUID;
    BEGIN
      CASE dgt_question.category
        WHEN 'A1' THEN current_topic_id := topic_a1_id;
        WHEN 'B' THEN current_topic_id := topic_b_id;
        WHEN 'D' THEN current_topic_id := topic_d_id;
      END CASE;

      -- Вставляем вопрос в questions_new
      INSERT INTO public.questions_new (
        topic_id,
        difficulty,
        is_premium,
        type,
        image_url,
        source,
        percent_correct,
        question_ru,
        question_es,
        question_en,
        explanation_ru,
        explanation_es,
        explanation_en,
        version,
        notes
      ) VALUES (
        current_topic_id,
        'medium',
        false,
        'single',
        dgt_question.image_filename, -- используем filename как есть
        dgt_question.source,
        CASE 
          WHEN dgt_question.times_shown > 0 
          THEN ROUND((dgt_question.times_correct::DECIMAL / dgt_question.times_shown) * 100)
          ELSE 0
        END,
        dgt_question.question_es, -- Пока ставим ES как RU (можно перевести позже)
        dgt_question.question_es,
        dgt_question.question_es, -- Пока ставим ES как EN (можно перевести позже)
        dgt_question.explanation_es, -- Пока ставим ES как RU
        dgt_question.explanation_es,
        dgt_question.explanation_es, -- Пока ставим ES как EN
        1,
        'Imported from DGT database. Category: ' || dgt_question.category
      ) RETURNING id INTO new_question_id;

      -- Создаём варианты ответов
      -- Вариант A
      INSERT INTO public.answer_options (
        question_id,
        text_ru,
        text_es,
        text_en,
        is_correct,
        position
      ) VALUES (
        new_question_id,
        dgt_question.option_a_es,
        dgt_question.option_a_es,
        dgt_question.option_a_es,
        (dgt_question.correct_answer = 'a'),
        1
      );

      -- Вариант B
      INSERT INTO public.answer_options (
        question_id,
        text_ru,
        text_es,
        text_en,
        is_correct,
        position
      ) VALUES (
        new_question_id,
        dgt_question.option_b_es,
        dgt_question.option_b_es,
        dgt_question.option_b_es,
        (dgt_question.correct_answer = 'b'),
        2
      );

      -- Вариант C
      INSERT INTO public.answer_options (
        question_id,
        text_ru,
        text_es,
        text_en,
        is_correct,
        position
      ) VALUES (
        new_question_id,
        dgt_question.option_c_es,
        dgt_question.option_c_es,
        dgt_question.option_c_es,
        (dgt_question.correct_answer = 'c'),
        3
      );
    END;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Шаг 3: Обновляем счётчики вопросов в topics
-- (это произойдёт автоматически при загрузке)

-- Шаг 4: Проверяем результат
SELECT 
  t.title_ru,
  COUNT(q.id) as questions_count
FROM public.topics t
LEFT JOIN public.questions_new q ON q.topic_id = t.id
WHERE t.number IN (100, 101, 102)
GROUP BY t.id, t.title_ru
ORDER BY t.number;

SELECT 'DGT вопросы успешно интегрированы в основную систему! Теперь они доступны через существующий интерфейс тестов с AI и переводами.' as result;

