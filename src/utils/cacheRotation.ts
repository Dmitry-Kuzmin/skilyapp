/**
 * Система умной ротации кэша
 * Удаляет старые данные по времени, размеру и приоритету
 */

interface CacheEntry {
  url: string;
  timestamp: number;
  testId?: string;
  testCompletedAt?: number;
  size?: number;
  priority: 'high' | 'medium' | 'low';
}

const CACHE_NAME = 'skilyapp-v7';
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200 MB (увеличено с 50MB для активных студентов)
const MAX_CACHE_AGE_IMAGES = 7 * 24 * 60 * 60 * 1000; // 7 дней для изображений тестов
const MAX_CACHE_AGE_DATA = 30 * 24 * 60 * 60 * 1000; // 30 дней для данных тестов
const CLEANUP_THRESHOLD = 0.8; // Начинаем очистку при 80% заполнения

/**
 * Очистить старые изображения пройденных тестов
 */
export async function cleanupOldTestImages(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    const now = Date.now();
    let deletedCount = 0;
    let freedSpace = 0;

    // Фильтруем запросы к изображениям из тестов
    const imageRequests = requests.filter((req) => {
      const url = req.url;
      return (
        url.includes('/storage/v1/object/public/questions/') ||
        url.includes('/storage/v1/object/public/road_signs/')
      );
    });

    // Удаляем изображения старше MAX_CACHE_AGE_IMAGES
    for (const request of imageRequests) {
      const response = await cache.match(request);
      if (!response) continue;

      const cacheDateHeader = response.headers.get('sw-cache-date');
      if (cacheDateHeader) {
        const cacheDate = parseInt(cacheDateHeader, 10);
        const age = now - cacheDate;

        if (age > MAX_CACHE_AGE_IMAGES) {
          const blob = await response.blob();
          freedSpace += blob.size;
          await cache.delete(request);
          deletedCount++;
        }
      } else {
        // Если нет метки времени, удаляем старые ответы (older than 7 days)
        // Используем время последнего изменения заголовка
        const lastModified = response.headers.get('last-modified');
        if (lastModified) {
          const modifiedDate = new Date(lastModified).getTime();
          const age = now - modifiedDate;
          if (age > MAX_CACHE_AGE_IMAGES) {
            const blob = await response.blob();
            freedSpace += blob.size;
            await cache.delete(request);
            deletedCount++;
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(
        `[CacheRotation] Cleaned up ${deletedCount} old test images, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`
      );
    }
  } catch (error) {
    console.error('[CacheRotation] Cleanup error:', error);
  }
}

/**
 * Очистить старые данные тестов
 */
export async function cleanupOldTestData(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    const now = Date.now();
    let deletedCount = 0;

    // Фильтруем запросы к данным тестов
    const testDataRequests = requests.filter((req) => {
      const url = req.url;
      return (
        url.includes('/rest/v1/questions') ||
        url.includes('/rest/v1/answer_options') ||
        url.includes('/rest/v1/tests')
      );
    });

    // Удаляем данные старше MAX_CACHE_AGE_DATA
    for (const request of testDataRequests) {
      const response = await cache.match(request);
      if (!response) continue;

      const cacheDateHeader = response.headers.get('sw-cache-date');
      if (cacheDateHeader) {
        const cacheDate = parseInt(cacheDateHeader, 10);
        const age = now - cacheDate;

        if (age > MAX_CACHE_AGE_DATA) {
          await cache.delete(request);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[CacheRotation] Cleaned up ${deletedCount} old test data entries`);
    }
  } catch (error) {
    console.error('[CacheRotation] Cleanup test data error:', error);
  }
}

/**
 * Проверить размер кэша и очистить при необходимости
 */
export async function enforceCacheSizeLimit(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    let totalSize = 0;
    const entries: Array<{ request: Request; size: number; timestamp: number }> = [];

    // Вычисляем размер каждого элемента
    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;

      const blob = await response.blob();
      const size = blob.size;
      totalSize += size;

      const cacheDateHeader = response.headers.get('sw-cache-date');
      const timestamp = cacheDateHeader ? parseInt(cacheDateHeader, 10) : Date.now();

      entries.push({ request, size, timestamp });
    }

    // Если размер превышает лимит, удаляем старые элементы
    if (totalSize > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
      // Сортируем по времени (старые первыми)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      let freedSpace = 0;
      let deletedCount = 0;

      for (const entry of entries) {
        if (totalSize - freedSpace <= MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
          break;
        }

        await cache.delete(entry.request);
        freedSpace += entry.size;
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(
          `[CacheRotation] Enforced size limit: deleted ${deletedCount} entries, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`
        );
      }
    }
  } catch (error) {
    console.error('[CacheRotation] Enforce size limit error:', error);
  }
}

/**
 * Получить статистику кэша
 */
export async function getCacheStats(): Promise<{
  totalSize: number;
  totalEntries: number;
  imageCount: number;
  dataCount: number;
}> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    let totalSize = 0;
    let imageCount = 0;
    let dataCount = 0;

    for (const request of requests) {
      const url = request.url;
      const response = await cache.match(request);
      if (!response) continue;

      const blob = await response.blob();
      totalSize += blob.size;

      if (url.includes('/storage/v1/object/public/')) {
        imageCount++;
      } else if (url.includes('/rest/v1/')) {
        dataCount++;
      }
    }

    return {
      totalSize,
      totalEntries: requests.length,
      imageCount,
      dataCount,
    };
  } catch (error) {
    console.error('[CacheRotation] Get cache stats error:', error);
    return {
      totalSize: 0,
      totalEntries: 0,
      imageCount: 0,
      dataCount: 0,
    };
  }
}

/**
 * Запустить полную очистку кэша
 */
export async function performCacheRotation(): Promise<void> {
  console.log('[CacheRotation] Starting cache rotation...');
  
  await cleanupOldTestImages();
  await cleanupOldTestData();
  await enforceCacheSizeLimit();
  
  const stats = await getCacheStats();
  console.log('[CacheRotation] Cache rotation complete:', {
    totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
    totalEntries: stats.totalEntries,
    imageCount: stats.imageCount,
    dataCount: stats.dataCount,
  });
}

// Периодическая очистка (каждые 6 часов)
if (typeof window !== 'undefined') {
  // Запускаем сразу при загрузке
  performCacheRotation();

  // И затем каждые 6 часов
  setInterval(() => {
    performCacheRotation();
  }, 6 * 60 * 60 * 1000);
}

