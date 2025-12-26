-- ========================================
-- FIX: Add missing answers for question f9ecbd46-9862-42c7-9439-fbf2337fd4d0
-- Question: "С какой максимальной скоростью Вы имеете право продолжить движение 
--           на легковом автомобиле с прицепом вне населенного пункта?"
-- Image: знак 80 (конец ограничения скорости)
-- Date: 2025-12-25
-- ========================================

-- Проверяем, что вопрос существует
SELECT id, question_ru FROM questions_new 
WHERE id = 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0';

-- Удаляем старые ответы если есть (на всякий случай)
DELETE FROM answer_options 
WHERE question_id = 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0';

-- Добавляем ответы
-- По ПДД: Вне населенного пункта с прицепом - 70 км/ч
INSERT INTO answer_options (id, question_id, text_ru, text_es, text_en, is_correct, position) VALUES
  (gen_random_uuid(), 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0', '70 км/ч', '70 km/h', '70 km/h', true, 1),
  (gen_random_uuid(), 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0', '80 км/ч', '80 km/h', '80 km/h', false, 2),
  (gen_random_uuid(), 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0', '90 км/ч', '90 km/h', '90 km/h', false, 3);

-- Проверяем результат
SELECT * FROM answer_options 
WHERE question_id = 'f9ecbd46-9862-42c7-9439-fbf2337fd4d0';
