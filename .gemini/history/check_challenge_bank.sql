-- Проверяем существование таблицы user_challenge_questions
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_challenge_questions'
) as table_exists;

-- Если таблица существует, показываем её структуру
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_challenge_questions'
ORDER BY ordinal_position;

-- Показываем количество записей
SELECT COUNT(*) as total_records 
FROM public.user_challenge_questions;
