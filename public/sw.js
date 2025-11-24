/**
 * Service Worker для кэширования статических ресурсов
 * Улучшает производительность и позволяет работать offline
 */

// Обновляем версию кэша при каждом деплое, чтобы очистить старые файлы
// ОПТИМИЗАЦИЯ: Используем дату деплоя вместо timestamp для стабильности
const CACHE_VERSION = 'v4';
const CACHE_NAME = `skilyapp-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `skilyapp-static-${CACHE_VERSION}`;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB лимит кэша

// Ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  // CSS и JS будут кэшироваться динамически
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Активируем новый SW сразу
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Удаляем старые кэши
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем ВСЕ старые кэши (более агрессивная очистка)
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // ОПТИМИЗАЦИЯ: Очищаем кэш если он превышает лимит
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        if (keys.length > 100) { // Если больше 100 файлов в кэше
          // Удаляем старые файлы (первые 20%)
          const toDelete = keys.slice(0, Math.floor(keys.length * 0.2));
          await Promise.all(toDelete.map(key => cache.delete(key)));
          console.log('[SW] Cleaned up old cache entries:', toDelete.length);
        }
      })
    ])
  );
  
  // Берем контроль над всеми страницами
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }
  
  try {
    const url = new URL(request.url);

    // Пропускаем запросы к внешним ресурсам, API, data: URLs и blob: URLs
    if (
      url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/supabase/') ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:'
    ) {
      return;
    }

    // Определяем тип ресурса для оптимальной стратегии кэширования
    const isStaticAsset = url.pathname.match(/\.(js|css|html)$/);
    const isImage = url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
    const isFont = url.pathname.match(/\.(woff2?|ttf|eot|otf)$/i);
    
    // Стратегия кэширования:
    // - JS/CSS: Network First (всегда проверяем сеть для актуальных версий)
    // - Изображения/Шрифты: Cache First (быстрая загрузка из кэша)
    // - HTML: Network First с fallback на кэш
    
    event.respondWith(
      (async () => {
        try {
          // Для изображений и шрифтов используем Cache First
          if (isImage || isFont) {
            const cached = await caches.match(request);
            if (cached) {
              return cached;
            }
            // Если нет в кэше, загружаем из сети и кэшируем
            try {
              const response = await fetch(request, {
                mode: 'cors',
                credentials: 'omit',
              });
              if (response.ok && response.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                // Клонируем response перед кэшированием
                cache.put(request, response.clone());
              }
              return response;
            } catch (error) {
              console.error('[SW] Fetch error for image/font:', error);
              return new Response('Network error', { 
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            }
          }
          
          // Для JS/CSS и HTML используем Network First
          try {
            const response = await fetch(request, {
              cache: isStaticAsset ? 'no-cache' : 'default',
              mode: 'cors',
              credentials: 'omit',
            });
            
            // Кэшируем только успешные ответы (не JS/CSS для актуальности)
            if (response.ok && response.status === 200 && !isStaticAsset) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, response.clone());
            }
            
            return response;
          } catch (error) {
            console.error('[SW] Fetch error:', error);
            // Fallback на кэш для не-JS/CSS файлов
            if (!isStaticAsset) {
              const cached = await caches.match(request);
              if (cached) {
                return cached;
              }
              
              // Для навигации возвращаем index.html
              if (request.mode === 'navigate') {
                const indexHtml = await caches.match('/index.html');
                if (indexHtml) {
                  return indexHtml;
                }
              }
            }
            
            return new Response('Network error', { 
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        } catch (error) {
          console.error('[SW] Unexpected error:', error);
          // В случае критической ошибки просто пропускаем запрос
          return fetch(request).catch(() => {
            return new Response('Service Worker error', { 
              status: 500,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        }
      })()
    );
  } catch (error) {
    // Если не удалось создать URL, просто пропускаем запрос
    console.error('[SW] Invalid URL:', error);
    return;
  }
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});


