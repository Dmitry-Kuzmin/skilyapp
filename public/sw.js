/**
 * Service Worker для кэширования статических ресурсов
 * Улучшает производительность и позволяет работать offline
 */

// Обновляем версию кэша при каждом деплое, чтобы очистить старые файлы
const CACHE_VERSION = 'v2-' + Date.now();
const CACHE_NAME = `sdadim-dgt-prep-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `sdadim-static-${CACHE_VERSION}`;

// Ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  // CSS и JS будут кэшироваться динамически
];

// Установка Service Worker
self.addEventListener('install', (event: any) => {
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
self.addEventListener('activate', (event: any) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
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
    })
  );
  
  // Берем контроль над всеми страницами
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к API и внешним ресурсам
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/supabase/')
  ) {
    return;
  }

  // Стратегия: Network First с проверкой версии
  // Для JS/CSS файлов всегда проверяем сеть (не используем кэш для старых версий)
  const isStaticAsset = url.pathname.match(/\.(js|css|html)$/);
  
  event.respondWith(
    fetch(request, {
      // Добавляем заголовок для предотвращения кэширования старых версий
      cache: isStaticAsset ? 'no-cache' : 'default',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then((response) => {
        // Клонируем ответ для кэширования
        const responseToCache = response.clone();

        // Кэшируем только успешные ответы (не кэшируем JS/CSS агрессивно)
        if (response.status === 200 && !isStaticAsset) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Если сеть недоступна, используем кэш только для не-JS/CSS файлов
        if (!isStaticAsset) {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Если нет в кэше, возвращаем offline страницу
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
        }
        // Для JS/CSS файлов не используем кэш при ошибке сети
        return new Response('Network error', { status: 408 });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});


