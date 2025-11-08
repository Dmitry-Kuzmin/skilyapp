-- ========================================
-- Migration: Manual tests setup (альтернативный вариант)
-- ========================================
-- Если автоматическое создание не подходит, используйте этот скрипт
-- для ручного создания тестов

-- Пример для Тема 1:
-- Тест 1: GS-1 до GS-30
INSERT INTO public.tests (
  topic_id,
  test_number,
  title_ru,
  title_es,
  title_en,
  description_ru,
  source_id_prefix,
  source_id_start,
  source_id_end,
  questions_count,
  min_pass_percent,
  order_index,
  is_unlocked_by_default
)
SELECT 
  id,
  1,
  'Тест 1: Основы дорожного движения',
  'Test 1: Fundamentos del tráfico',
  'Test 1: Traffic Fundamentals',
  'Первый тест по основам дорожного движения. Вопросы GS-1 до GS-30.',
  'GS',
  1,
  30,
  30,
  80,
  1,
  true
FROM public.topics 
WHERE number = 1
ON CONFLICT (topic_id, test_number) DO NOTHING;

-- Тест 2: GS-31 до GS-60 (требует прохождения теста 1)
INSERT INTO public.tests (
  topic_id,
  test_number,
  title_ru,
  title_es,
  title_en,
  description_ru,
  source_id_prefix,
  source_id_start,
  source_id_end,
  questions_count,
  min_pass_percent,
  order_index,
  required_test_id,
  is_unlocked_by_default
)
SELECT 
  t1.id,
  2,
  'Тест 2: Дорожные знаки',
  'Test 2: Señales de tráfico',
  'Test 2: Traffic Signs',
  'Второй тест по дорожным знакам. Вопросы GS-31 до GS-60.',
  'GS',
  31,
  60,
  30,
  80,
  2,
  t2.id,
  false
FROM public.topics t1
CROSS JOIN public.tests t2
WHERE t1.number = 1 
  AND t2.topic_id = t1.id 
  AND t2.test_number = 1
ON CONFLICT (topic_id, test_number) DO NOTHING;

-- Тест 3: GS-61 до GS-90 (требует прохождения теста 2)
INSERT INTO public.tests (
  topic_id,
  test_number,
  title_ru,
  title_es,
  title_en,
  description_ru,
  source_id_prefix,
  source_id_start,
  source_id_end,
  questions_count,
  min_pass_percent,
  order_index,
  required_test_id,
  is_unlocked_by_default
)
SELECT 
  t1.id,
  3,
  'Тест 3: Правила дорожного движения',
  'Test 3: Normas de tráfico',
  'Test 3: Traffic Rules',
  'Третий тест по правилам дорожного движения. Вопросы GS-61 до GS-90.',
  'GS',
  61,
  90,
  30,
  80,
  3,
  t2.id,
  false
FROM public.topics t1
CROSS JOIN public.tests t2
WHERE t1.number = 1 
  AND t2.topic_id = t1.id 
  AND t2.test_number = 2
ON CONFLICT (topic_id, test_number) DO NOTHING;

-- Пример для Тема 2 (если используется префикс GG):
-- Тест 1: GG-1 до GG-30
INSERT INTO public.tests (
  topic_id,
  test_number,
  title_ru,
  title_es,
  title_en,
  description_ru,
  source_id_prefix,
  source_id_start,
  source_id_end,
  questions_count,
  min_pass_percent,
  order_index,
  is_unlocked_by_default
)
SELECT 
  id,
  1,
  'Тест 1: Правила обгона',
  'Test 1: Reglas de adelantamiento',
  'Test 1: Overtaking Rules',
  'Первый тест по правилам обгона. Вопросы GG-1 до GG-30.',
  'GG',
  1,
  30,
  30,
  80,
  1,
  true
FROM public.topics 
WHERE number = 2
ON CONFLICT (topic_id, test_number) DO NOTHING;

-- Тест 2: GG-31 до GG-60 (требует прохождения теста 1)
INSERT INTO public.tests (
  topic_id,
  test_number,
  title_ru,
  title_es,
  title_en,
  description_ru,
  source_id_prefix,
  source_id_start,
  source_id_end,
  questions_count,
  min_pass_percent,
  order_index,
  required_test_id,
  is_unlocked_by_default
)
SELECT 
  t1.id,
  2,
  'Тест 2: Скоростной режим',
  'Test 2: Límites de velocidad',
  'Test 2: Speed Limits',
  'Второй тест по скоростному режиму. Вопросы GG-31 до GG-60.',
  'GG',
  31,
  60,
  30,
  80,
  2,
  t2.id,
  false
FROM public.topics t1
CROSS JOIN public.tests t2
WHERE t1.number = 2 
  AND t2.topic_id = t1.id 
  AND t2.test_number = 1
ON CONFLICT (topic_id, test_number) DO NOTHING;

-- Примечание: 
-- 1. Измените number (1, 2, 3...) на актуальные номера ваших тем
-- 2. Измените префиксы (GS, GG) на те, что используются в ваших вопросах
-- 3. Измените диапазоны (1-30, 31-60) на актуальные для ваших данных
-- 4. Добавьте больше тестов по аналогии

