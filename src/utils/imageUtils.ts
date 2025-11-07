import { supabase } from "@/integrations/supabase/client";

/**
 * Получить публичный URL изображения из Supabase Storage
 * Если передан полный URL (начинается с http), возвращает его как есть
 * Если передан относительный путь (например, "1110.jpeg"), возвращает URL из Supabase Storage
 * 
 * @param imageUrl - URL изображения или путь к файлу в Supabase Storage
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Публичный URL изображения
 */
export function getImageUrl(imageUrl: string | null | undefined, bucket: string = 'questions'): string | null {
  if (!imageUrl) return null;

  // Если это уже полный URL, возвращаем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Если это путь к файлу в Supabase Storage, получаем публичный URL
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting image URL from Supabase Storage:', error);
    return null;
  }
}

/**
 * Загрузить изображение в Supabase Storage
 * 
 * @param file - Файл изображения
 * @param path - Путь к файлу в bucket (например, "questions/1110.jpeg")
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Публичный URL загруженного изображения
 */
export async function uploadImageToStorage(
  file: File,
  path: string,
  bucket: string = 'questions'
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('File must be an image') };
    }

    // Проверка размера файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { url: null, error: new Error('File size must be less than 10MB') };
    }

    // Загрузка файла
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Получение публичного URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Удалить изображение из Supabase Storage
 * 
 * @param path - Путь к файлу в bucket
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Результат удаления
 */
export async function deleteImageFromStorage(
  path: string,
  bucket: string = 'questions'
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

