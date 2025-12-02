-- ============================================
-- ПРОВЕРКА: Есть ли у партнеров partner_code?
-- ============================================
-- Выполните этот запрос в Supabase SQL Editor, чтобы проверить, применена ли миграция

-- Проверить, есть ли колонка partner_code
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'partners' 
  AND column_name = 'partner_code';

-- Проверить, есть ли у партнеров коды
SELECT 
  id,
  name,
  partner_code,
  registration_status,
  status
FROM public.partners
ORDER BY created_at DESC
LIMIT 10;

-- Если partner_code NULL, можно сгенерировать их вручную:
-- UPDATE public.partners 
-- SET partner_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8))
-- WHERE partner_code IS NULL;





