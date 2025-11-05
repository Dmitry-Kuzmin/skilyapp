-- ============================================
-- ИСПРАВЛЕНИЕ: Изменение типа question_seed с INTEGER на BIGINT
-- ============================================
-- Проблема: question_seed генерируется как Date.now() * 1000,
-- что дает значение больше 2 миллиардов (превышает INTEGER)
-- Решение: Изменить тип колонки на BIGINT

-- Изменяем тип колонки question_seed с INTEGER на BIGINT
ALTER TABLE public.duels 
  ALTER COLUMN question_seed TYPE BIGINT;

-- Проверяем, что изменение применено
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'duels' 
      AND column_name = 'question_seed' 
      AND data_type = 'bigint'
  ) THEN
    RAISE NOTICE '✅ Колонка question_seed успешно изменена на BIGINT';
  ELSE
    RAISE EXCEPTION '❌ Ошибка: колонка question_seed не изменена на BIGINT';
  END IF;
END $$;


