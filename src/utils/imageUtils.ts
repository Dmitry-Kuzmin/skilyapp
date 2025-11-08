import { supabase } from "@/integrations/supabase/client";

// Кэш для предзагруженных изображений
const imageCache = new Map<string, { url: string; aspectRatio: number; loaded: boolean }>();
const preloadPromises = new Map<string, Promise<void>>();

/**
 * Получить публичный URL изображения из Supabase Storage
 * Если передан полный URL (начинается с http), возвращает его как есть
 * Если передан относительный путь (например, "1110.jpeg" или "Image_test/Public/1110.jpeg"), возвращает URL из Supabase Storage
 * 
 * Поддерживаемые форматы:
 * - Полный URL: "https://example.com/image.jpg" - возвращается как есть
 * - Имя файла: "1110.jpeg" - ищется в bucket 'questions'
 * - Путь с подпапками: "Image_test/Public/1110.jpeg" - ищется в bucket 'questions' в указанной подпапке
 * 
 * @param imageUrl - URL изображения или путь к файлу в Supabase Storage
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Публичный URL изображения или null, если путь некорректный
 */
export function getImageUrl(imageUrl: string | null | undefined, bucket: string = 'questions'): string | null {
  if (!imageUrl) return null;

  // Если это уже полный URL, возвращаем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Нормализуем путь: убираем лишние слэши в начале и конце
  const normalizedPath = imageUrl.trim().replace(/^\/+/, '').replace(/\/+$/, '');

  // Если путь пустой после нормализации, возвращаем null
  if (!normalizedPath) {
    console.warn(`[getImageUrl] Empty path after normalization for: ${imageUrl}`);
    return null;
  }

  // Проверяем кэш (но только если изображение уже загружено)
  const cacheKey = `${bucket}:${normalizedPath}`;
  const cached = imageCache.get(cacheKey);
  if (cached && cached.loaded) {
    return cached.url;
  }

  // Если это путь к файлу в Supabase Storage, получаем публичный URL
  try {
    const { data, error } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
    
    if (error) {
      console.error(`[getImageUrl] Error getting public URL (bucket: ${bucket}, path: ${normalizedPath}):`, error);
      return null;
    }

    if (!data?.publicUrl) {
      console.warn(`[getImageUrl] No public URL returned (bucket: ${bucket}, path: ${normalizedPath})`);
      return null;
    }

    // Сохраняем URL в кэш для быстрого доступа в будущем
    // Даже если изображение еще не загружено, URL уже известен
    const existingCache = imageCache.get(cacheKey);
    if (!existingCache) {
      imageCache.set(cacheKey, {
        url: data.publicUrl,
        aspectRatio: 1,
        loaded: false,
      });
    } else if (existingCache.url !== data.publicUrl) {
      // Обновляем URL, если он изменился
      imageCache.set(cacheKey, {
        ...existingCache,
        url: data.publicUrl,
      });
    }

    return data.publicUrl;
  } catch (error) {
    console.error(`[getImageUrl] Exception getting image URL from Supabase Storage (bucket: ${bucket}, path: ${normalizedPath}):`, error);
    return null;
  }
}

/**
 * Предзагрузить изображение в фоне
 * Изображение будет загружено и сохранено в кэше для быстрого доступа
 * 
 * @param imageUrl - URL изображения или путь к файлу
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Promise, который резолвится, когда изображение загружено
 */
export function preloadImage(imageUrl: string | null | undefined, bucket: string = 'questions'): Promise<void> {
  if (!imageUrl) {
    return Promise.resolve();
  }

  const cacheKey = `${bucket}:${imageUrl.trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;

  // Если изображение уже загружено, возвращаем сразу
  if (imageCache.has(cacheKey) && imageCache.get(cacheKey)!.loaded) {
    return Promise.resolve();
  }

  // Если изображение уже загружается, возвращаем существующий Promise
  if (preloadPromises.has(cacheKey)) {
    return preloadPromises.get(cacheKey)!;
  }

  // Создаем новый Promise для загрузки
  const loadPromise = new Promise<void>((resolve, reject) => {
    const url = getImageUrl(imageUrl, bucket);
    
    if (!url) {
      resolve();
      return;
    }

    // Проверяем, есть ли уже URL в кэше (но изображение еще не загружено)
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey)!;
      if (cached.url === url && cached.loaded) {
        resolve();
        return;
      }
    }

    // Загружаем изображение в фоне
    const img = new Image();
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      imageCache.set(cacheKey, {
        url,
        aspectRatio,
        loaded: true,
      });
      preloadPromises.delete(cacheKey);
      resolve();
    };

    img.onerror = () => {
      console.warn(`[preloadImage] Failed to preload image: ${url}`);
      // Сохраняем URL даже при ошибке, чтобы не пытаться загружать снова
      imageCache.set(cacheKey, {
        url,
        aspectRatio: 1,
        loaded: false,
      });
      preloadPromises.delete(cacheKey);
      resolve(); // Разрешаем Promise, чтобы не блокировать другие загрузки
    };

    img.src = url;
  });

  preloadPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Получить aspect ratio изображения из кэша
 * 
 * @param imageUrl - URL изображения или путь к файлу
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Aspect ratio изображения или null, если изображение не загружено
 */
export function getCachedImageAspectRatio(imageUrl: string | null | undefined, bucket: string = 'questions'): number | null {
  if (!imageUrl) return null;

  const cacheKey = `${bucket}:${imageUrl.trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
  const cached = imageCache.get(cacheKey);
  
  return cached?.loaded ? cached.aspectRatio : null;
}

/**
 * Предзагрузить несколько изображений
 * 
 * @param imageUrls - Массив URL изображений или путей к файлам
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns Promise, который резолвится, когда все изображения загружены
 */
export function preloadImages(imageUrls: (string | null | undefined)[], bucket: string = 'questions'): Promise<void[]> {
  return Promise.all(imageUrls.map(url => preloadImage(url, bucket)));
}

/**
 * Проверить существование изображения в Supabase Storage
 * 
 * @param imageUrl - Путь к файлу в Supabase Storage
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns true, если файл существует, false в противном случае
 */
export async function checkImageExists(imageUrl: string | null | undefined, bucket: string = 'questions'): Promise<boolean> {
  if (!imageUrl) return false;

  // Если это полный URL, считаем что файл существует
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return true;
  }

  // Нормализуем путь
  const normalizedPath = imageUrl.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalizedPath) return false;

  try {
    // Пытаемся получить информацию о файле
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(normalizedPath.split('/').slice(0, -1).join('/') || '', {
        limit: 1000,
        search: normalizedPath.split('/').pop() || '',
      });

    if (error) {
      console.warn(`[checkImageExists] Error checking file (bucket: ${bucket}, path: ${normalizedPath}):`, error);
      return false;
    }

    // Проверяем, найден ли файл
    const fileName = normalizedPath.split('/').pop();
    return data?.some(file => file.name === fileName) || false;
  } catch (error) {
    console.error(`[checkImageExists] Exception checking image (bucket: ${bucket}, path: ${normalizedPath}):`, error);
    return false;
  }
}

/**
 * Получить список возможных путей для поиска изображения
 * Пытается найти изображение в разных местах:
 * 1. Указанный путь как есть
 * 2. В корне bucket
 * 3. В подпапке "Image_test/Public"
 * 
 * @param imageUrl - Исходный путь к изображению
 * @param bucket - Имя bucket в Supabase Storage
 * @returns Массив возможных путей для проверки
 */
export function getPossibleImagePaths(imageUrl: string, bucket: string = 'questions'): string[] {
  const paths: string[] = [];

  // Если это полный URL, возвращаем только его
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return [imageUrl];
  }

  const normalized = imageUrl.trim().replace(/^\/+/, '').replace(/\/+$/, '');

  // 1. Путь как есть
  paths.push(normalized);

  // 2. Если путь не содержит подпапок, добавляем варианты с подпапками
  if (!normalized.includes('/')) {
    // В подпапке Image_test/Public
    paths.push(`Image_test/Public/${normalized}`);
    // В подпапке Public
    paths.push(`Public/${normalized}`);
  }

  return paths;
}

/**
 * Найти существующее изображение среди возможных путей
 * 
 * @param imageUrl - Исходный путь к изображению
 * @param bucket - Имя bucket в Supabase Storage (по умолчанию 'questions')
 * @returns URL первого найденного изображения или null
 */
export async function findImageUrl(imageUrl: string | null | undefined, bucket: string = 'questions'): Promise<string | null> {
  if (!imageUrl) return null;

  // Если это полный URL, возвращаем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Получаем список возможных путей
  const possiblePaths = getPossibleImagePaths(imageUrl, bucket);

  // Пытаемся найти существующий файл
  for (const path of possiblePaths) {
    const exists = await checkImageExists(path, bucket);
    if (exists) {
      return getImageUrl(path, bucket);
    }
  }

  // Если ничего не найдено, возвращаем URL для первого пути (на случай если проверка не сработала)
  return getImageUrl(possiblePaths[0], bucket);
}

/**
 * Загрузить изображение в Supabase Storage
 * 
 * @param file - Файл изображения
 * @param path - Путь к файлу в bucket (например, "1110.jpeg" или "Image_test/Public/1110.jpeg")
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

    // Нормализуем путь
    const normalizedPath = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');

    // Загрузка файла
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(normalizedPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Получение публичного URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);

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
    const normalizedPath = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    const { error } = await supabase.storage.from(bucket).remove([normalizedPath]);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}
