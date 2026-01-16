-- Создание bucket для обложек тестов
-- Выполните этот SQL в Supabase Dashboard -> SQL Editor

-- Создаем bucket test-covers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-covers',
  'test-covers',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies для test-covers bucket
-- Сначала удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Anyone can view test covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload test covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update test covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete test covers" ON storage.objects;

-- Любой может просматривать обложки (публичный доступ)
CREATE POLICY "Anyone can view test covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'test-covers');

-- Только аутентифицированные пользователи могут загружать обложки
CREATE POLICY "Authenticated users can upload test covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

-- Только аутентифицированные пользователи могут обновлять обложки
CREATE POLICY "Authenticated users can update test covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

-- Только аутентифицированные пользователи могут удалять обложки
CREATE POLICY "Authenticated users can delete test covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'test-covers' 
  AND auth.role() = 'authenticated'
);

