-- Create ambient-music bucket for background music files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ambient-music',
  'ambient-music',
  true, -- Public access для всех пользователей
  10485760, -- 10MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ambient-music bucket
-- Все могут читать музыку
CREATE POLICY "Anyone can view ambient music"
ON storage.objects FOR SELECT
USING (bucket_id = 'ambient-music');

-- Только админы могут загружать
CREATE POLICY "Admins can upload ambient music"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ambient-music' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Только админы могут обновлять
CREATE POLICY "Admins can update ambient music"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ambient-music' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Только админы могут удалять
CREATE POLICY "Admins can delete ambient music"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ambient-music' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

