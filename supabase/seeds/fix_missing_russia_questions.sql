-- ========================================
-- FIX: Insert 4 missing Russian questions
-- Date: 2025-12-25
-- Missing: Билет4-Q9, Билет5-Q12, Билет8-Q8, Билет9-Q15
-- ========================================

-- 1. Билет 4, Вопрос 9
INSERT INTO public.pdd_russia_questions (
  source_id, ticket_number, question_number, ticket_category,
  question_text, image_url, explanation, correct_answer_text, topics
) VALUES (
  '5ccc967d70f19d41f276ce69b2ad1334',
  4, 9, 'A,B',
  'Вам можно выполнить разворот:',
  'https://ylioglhxfhstdimxfwwc.supabase.co/storage/v1/object/public/pdd_russia/images/A_B/3967ea92f049121b27547528fd472093.jpg',
  'При наличии слева трамвайных путей попутного направления, расположенных на одном уровне с проезжей частью, для выполнения разворота необходимо заблаговременно выехать на трамвайные пути, после чего выполнить маневр. При этом не должно создаваться помех трамваю. Вам можно выполнить разворот только по траектории «Б».(Пункты 8.5, 9.6 ПДД)',
  'Правильный ответ: 2',
  ARRAY['Дорожные знаки', 'Начало движения, маневрирование']
) ON CONFLICT (ticket_number, question_number) DO NOTHING;

-- Insert answers for Билет 4, Вопрос 9
INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только по траектории А', false, 1
FROM public.pdd_russia_questions WHERE ticket_number = 4 AND question_number = 9
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только по траектории Б', true, 2
FROM public.pdd_russia_questions WHERE ticket_number = 4 AND question_number = 9
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'По любой траектории из указанных', false, 3
FROM public.pdd_russia_questions WHERE ticket_number = 4 AND question_number = 9
ON CONFLICT (question_id, position) DO NOTHING;

-- 2. Билет 5, Вопрос 12
INSERT INTO public.pdd_russia_questions (
  source_id, ticket_number, question_number, ticket_category,
  question_text, image_url, explanation, correct_answer_text, topics
) VALUES (
  '592c5535461a8d7a15d496c3d5862a0e',
  5, 12, 'A,B',
  'Кто из водителей нарушил правила стоянки?',
  'https://ylioglhxfhstdimxfwwc.supabase.co/storage/v1/object/public/pdd_russia/images/A_B/456767f8b2e0d39f83d8f9f1b2a378da.jpg',
  'Ставить ТС разрешается в один ряд параллельно краю проезжей части. Это правило распространяется и на местное уширение проезжей части (как в данной ситуации). Исключением являются подобные места, имеющие сочетание знака 6.4 с одной из табличек 8.6.1-8.6.9 Водитель автомобиля «А» нарушает правила стоянки.(Пункт 12.2 ПДД)',
  'Правильный ответ: 2',
  ARRAY['Остановка и стоянка']
) ON CONFLICT (ticket_number, question_number) DO NOTHING;

-- Insert answers for Билет 5, Вопрос 12
INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Оба', false, 1
FROM public.pdd_russia_questions WHERE ticket_number = 5 AND question_number = 12
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только водитель автомобиля А', true, 2
FROM public.pdd_russia_questions WHERE ticket_number = 5 AND question_number = 12
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только водитель автомобиля Б', false, 3
FROM public.pdd_russia_questions WHERE ticket_number = 5 AND question_number = 12
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Никто не нарушил', false, 4
FROM public.pdd_russia_questions WHERE ticket_number = 5 AND question_number = 12
ON CONFLICT (question_id, position) DO NOTHING;

-- 3. Билет 8, Вопрос 8
INSERT INTO public.pdd_russia_questions (
  source_id, ticket_number, question_number, ticket_category,
  question_text, image_url, explanation, correct_answer_text, topics
) VALUES (
  '76c1351bb5fb6e68489cabe11aa628ec',
  8, 8, 'A,B',
  'По какой траектории Вам разрешается выполнить поворот налево?',
  'https://ylioglhxfhstdimxfwwc.supabase.co/storage/v1/object/public/pdd_russia/images/A_B/e5c4d4989ef9427567d3944a43de239c.jpg',
  'В случае отсутствия знака 5.15.1 «Направления движения по полосам» следовало бы выполнить поворот налево по траектории «А». Но на перекрёстках, перед которыми и на которых имеются знаки 5.15.1 и 5.15.2, выезд на трамвайные пути запрещён. Поворот налево (разворот) следует произвести по траектории «Б».(«Дорожные знаки», пункт 8.5 ПДД)',
  'Правильный ответ: 2',
  ARRAY['Начало движения, маневрирование']
) ON CONFLICT (ticket_number, question_number) DO NOTHING;

-- Insert answers for Билет 8, Вопрос 8
INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только по А', false, 1
FROM public.pdd_russia_questions WHERE ticket_number = 8 AND question_number = 8
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только по Б', true, 2
FROM public.pdd_russia_questions WHERE ticket_number = 8 AND question_number = 8
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'По любой из указанных', false, 3
FROM public.pdd_russia_questions WHERE ticket_number = 8 AND question_number = 8
ON CONFLICT (question_id, position) DO NOTHING;

-- 4. Билет 9, Вопрос 15
INSERT INTO public.pdd_russia_questions (
  source_id, ticket_number, question_number, ticket_category,
  question_text, image_url, explanation, correct_answer_text, topics
) VALUES (
  'c64eefab25596af3056aa4b69e92516e',
  9, 15, 'A,B',
  'Кому Вы обязаны уступить дорогу при повороте налево?',
  'https://ylioglhxfhstdimxfwwc.supabase.co/storage/v1/object/public/pdd_russia/images/A_B/dd7e958840da9ddd1c102a65d8d5c03f.jpg',
  'Перекрёсток неравнозначный. Главная дорога меняет направление. Транспортные средства, находящиеся на главной дороге, имеют преимущество. А между собой руководствуются «правилом правой руки». У Вас помехи справа нет. Проезжаете первым, водитель легкового автомобиля после Вас, автобус последним, так как находится на второстепенной дороге.(Пункты 13.9, 13.10, 13.11 ПДД)',
  'Правильный ответ: 3',
  ARRAY['Проезд перекрестков']
) ON CONFLICT (ticket_number, question_number) DO NOTHING;

-- Insert answers for Билет 9, Вопрос 15
INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только автобусу', false, 1
FROM public.pdd_russia_questions WHERE ticket_number = 9 AND question_number = 15
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Только легковому автомобилю', false, 2
FROM public.pdd_russia_questions WHERE ticket_number = 9 AND question_number = 15
ON CONFLICT (question_id, position) DO NOTHING;

INSERT INTO public.pdd_russia_answers (question_id, answer_text, is_correct, position)
SELECT id, 'Никому', true, 3
FROM public.pdd_russia_questions WHERE ticket_number = 9 AND question_number = 15
ON CONFLICT (question_id, position) DO NOTHING;

-- ========================================
-- Verify: Should now be 800 questions
-- ========================================
SELECT 
  'BEFORE FIX' as status,
  COUNT(*) as total_questions
FROM public.pdd_russia_questions;

-- Verification after insert (run separately)
-- SELECT ticket_number, COUNT(*) as cnt 
-- FROM pdd_russia_questions 
-- WHERE ticket_number IN (4,5,8,9) 
-- GROUP BY ticket_number 
-- ORDER BY ticket_number;
