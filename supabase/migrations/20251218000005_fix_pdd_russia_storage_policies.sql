-- ========================================
-- Исправление политик Storage для импорта
-- ========================================
-- Разрешаем service_role загружать изображения для импорта

-- Удаляем старую политику
DROP POLICY IF EXISTS "Authenticated users can upload PDD Russia images" ON storage.objects;

-- Создаём новую политику, разрешающую service_role
CREATE POLICY "Authenticated users can upload PDD Russia images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdd_russia'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Дополнительная политика для service_role (на всякий случай)
CREATE POLICY "Service role can upload PDD Russia images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdd_russia');

-- Также обновляем политики для UPDATE и DELETE
DROP POLICY IF EXISTS "Authenticated users can update PDD Russia images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDD Russia images" ON storage.objects;

CREATE POLICY "Authenticated users can update PDD Russia images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pdd_russia'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

CREATE POLICY "Authenticated users can delete PDD Russia images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdd_russia'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

