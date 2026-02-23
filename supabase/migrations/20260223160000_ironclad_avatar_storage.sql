-- IRONCLAD Storage RLS for Avatars
-- Удаляем старые политики и создаем более надежные

-- 1. Публичный доступ на чтение (SELECT)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Загрузка (INSERT)
-- Используем LIKE вместо foldername для максимальной надежности
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- 3. Обновление (UPDATE)
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- 4. Удаление (DELETE)
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- Даем права на саму таблицу объектов (на всякий случай)
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
