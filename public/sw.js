/**
 * Service Worker для кэширования статических ресурсов
 * Улучшает производительность и позволяет работать offline
 */

// Обновляем версию кэша при каждом деплое, чтобы очистить старые файлы
// ОПТИМИЗАЦИЯ: Используем дату деплоя вместо timestamp для стабильности
const CACHE_VERSION = 'v8'; // Обновлено: добавлена ротация кэша и метки времени
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
  
  // КРИТИЧНО: Пропускаем запросы без URL или с пустым/некорректным URL
  if (!request.url || 
      typeof request.url !== 'string' ||
      request.url.trim() === '' || 
      request.url === '.' || 
      request.url === './' ||
      request.url === '/' ||
      request.url.startsWith('data:') ||
      request.url.startsWith('blob:') ||
      request.url.startsWith('chrome-extension:') ||
      request.url.startsWith('moz-extension:')) {
    // Не обрабатываем такие запросы - пусть браузер обработает сам
    return;
  }
  
  let url;
  try {
    url = new URL(request.url, self.location.origin);
  } catch (error) {
    // Некорректный URL - пропускаем, не обрабатываем
    console.warn('[SW] Invalid URL:', request.url);
    return;
  }

  // КРИТИЧНО: Пропускаем некорректные URL (пустые пути, только протокол и т.д.)
  if (!url.pathname || 
      url.pathname === '' || 
      url.pathname === '.' || 
      url.pathname === './' ||
      url.pathname === '/' ||
      url.pathname.length < 1) {
    // Не обрабатываем такие запросы
    return;
  }

  // КРИТИЧНО: Пропускаем внешние домены (особенно telegram.org) - не кэшируем их через SW
  // Это предотвращает opaque responses и проблемы с загрузкой внешних скриптов
  try {
    const currentOrigin = new URL(self.location.origin);
    const requestHostname = url.hostname.toLowerCase();
    const currentHostname = currentOrigin.hostname.toLowerCase();
    
    if (requestHostname !== currentHostname && requestHostname !== '') {
      // Внешний домен - пропускаем обработку, пусть браузер обработает напрямую
      // Это критично для telegram.org, supabase.co и других внешних ресурсов
      return;
    }
  } catch (e) {
    // Если не удалось определить origin, пропускаем проверку
    console.warn('[SW] Could not compare hostnames:', e);
  }

  // КРИТИЧНО: Кэшируем данные тестов для offline режима
  // Пропускаем только критичные API запросы, но кэшируем данные тестов
  if (
    url.protocol === 'data:' ||
    url.protocol === 'blob:' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:' ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__') ||
    url.pathname.includes('vercel') ||
    url.pathname.startsWith('/go/') || // Партнерские ссылки (редиректы)
    url.pathname.startsWith('/partner/') || // Партнерские страницы
    url.pathname.startsWith('/join/') // Реферальные ссылки
  ) {
    return;
  }
  
  // КРИТИЧНО: Кэшируем запросы к Supabase для данных тестов (questions, answer_options)
  // Это позволяет работать в offline режиме
  if (url.pathname.includes('/rest/v1/') && 
      (url.pathname.includes('questions') || 
       url.pathname.includes('answer_options') ||
       url.pathname.includes('tests') ||
       url.pathname.includes('topics'))) {
    // КРИТИЧНО: Network First стратегия с таймаутом 3 секунды
    // Если сервер не отвечает за 3 секунды - переключаемся на кэш мгновенно
    event.respondWith(
      Promise.race([
        // Пытаемся загрузить из сети
        fetch(request)
          .then((response) => {
            // Клонируем ответ для кэширования
            const responseClone = response.clone();
            // Добавляем метку времени для ротации кэша
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cache-date', Date.now().toString());
            const cachedResponse = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers,
            });
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cachedResponse);
            });
            return response;
          })
          .catch(() => {
            // Если сеть недоступна, возвращаем null для переключения на кэш
            return null;
          }),
        // Таймаут: если сеть не отвечает за 3 секунды - переключаемся на кэш
        new Promise((resolve) => {
          setTimeout(() => resolve(null), 3000); // 3 секунды таймаут
        }),
      ]).then((networkResponse) => {
        // Если сеть ответила быстро - используем ответ из сети
        if (networkResponse) {
          return networkResponse;
        }
        
        // Если сеть не ответила или таймаут - используем кэш
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Using cached response (network timeout or offline)');
            return cachedResponse;
          }
          
          // Если нет в кэше, возвращаем ошибку
          return new Response(JSON.stringify({ 
            error: 'Offline: данные не доступны',
            message: 'Нет подключения к интернету и данные не найдены в кэше'
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
    return;
  }
  
  // Пропускаем другие API запросы (не кэшируем)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/supabase/')) {
    return;
  }

  // Дополнительная проверка: пропускаем запросы с некорректными символами в пути
  if (url.pathname.includes('//') || url.pathname.includes('..')) {
    return;
  }

  // КРИТИЧНО: Пропускаем запросы к внешним ресурсам ДО обработки
  if (url.origin !== self.location.origin) {
    return;
  }

  // Финальная проверка безопасности - если что-то не так, не обрабатываем
  if (!request.url || !url.pathname || url.pathname.length < 1) {
    return;
  }

  // Определяем тип ресурса для оптимальной стратегии кэширования
  const isStaticAsset = url.pathname.match(/\.(js|css|mjs)$/);
  const isHTML = url.pathname.match(/\.html$/) || request.mode === 'navigate';
  const isImage = url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
  const isFont = url.pathname.match(/\.(woff2?|ttf|eot|otf)$/i);
  
  // КРИТИЧНО: НЕ обрабатываем JS/CSS файлы через Service Worker
  // Это гарантирует, что всегда загружается актуальная версия и нет проблем с белым экраном
  if (isStaticAsset) {
    return; // Пусть браузер обработает JS/CSS сам
  }
  
  // Стратегия кэширования:
  // - JS/CSS: НЕ обрабатываем (браузер сам)
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
            const response = await fetch(request);
            if (response && response.ok && response.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              // Добавляем метку времени для ротации кэша
              const headers = new Headers(response.headers);
              headers.set('sw-cache-date', Date.now().toString());
              const cachedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
              });
              cache.put(request, cachedResponse).catch(() => {
                // Игнорируем ошибки кэширования
              });
            }
            return response;
          } catch (error) {
            // Тихая обработка ошибок - возвращаем пустой ответ
            console.warn('[SW] Failed to fetch image/font:', request.url);
            return new Response('', { status: 404 });
          }
        }
        
        // Для HTML используем Network First с таймаутом 3 секунды и fallback на кэш
        if (isHTML) {
        try {
          // КРИТИЧНО: Таймаут 3 секунды для HTML запросов
          const response = await Promise.race([
            fetch(request, {
              cache: 'no-cache',
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Network timeout')), 3000);
            }),
          ]);

            // Кэшируем только успешные ответы
            if (response && response.ok && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
              // Добавляем метку времени для ротации кэша
              const headers = new Headers(response.headers);
              headers.set('sw-cache-date', Date.now().toString());
              const cachedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
              });
              cache.put(request, cachedResponse).catch(() => {
                // Игнорируем ошибки кэширования
              });
          }

          return response;
        } catch (error) {
            console.warn('[SW] Network fetch failed for HTML:', request.url, error);
            
            // Fallback на кэш для HTML
            try {
            const cached = await caches.match(request);
            if (cached) {
              return cached;
            }
            
              // Для навигации возвращаем index.html из кэша
            if (request.mode === 'navigate') {
              const indexHtml = await caches.match('/index.html');
              if (indexHtml) {
                return indexHtml;
              }
            }
            } catch (cacheError) {
              console.warn('[SW] Cache fallback failed:', cacheError);
          }
          
            // Если все попытки не удались, пробрасываем запрос браузеру
            return fetch(request);
          }
        }
        
        // Для остальных файлов (не JS/CSS/HTML/Images/Fonts) пробрасываем браузеру
        return fetch(request);
      } catch (error) {
        // В случае критической ошибки пробрасываем запрос браузеру
        // Это предотвращает белый экран из-за ошибок Service Worker
        console.error('[SW] Critical error:', error);
        // Пробрасываем запрос браузеру - он обработает его сам
        return fetch(request);
      }
    })()
  );
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

// КРИТИЧНО: Background Sync API для отправки аналитики при восстановлении связи
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(
      // Отправляем сообщение клиенту для отправки аналитики
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_ANALYTICS' });
        });
      })
    );
  }
  
  if (event.tag === 'cache-rotation') {
    event.waitUntil(
      // Периодическая ротация кэша
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const requests = await cache.keys();
          const now = Date.now();
          const MAX_AGE_IMAGES = 7 * 24 * 60 * 60 * 1000; // 7 дней
          const MAX_AGE_DATA = 30 * 24 * 60 * 60 * 1000; // 30 дней
          
          let deletedCount = 0;
          for (const request of requests) {
            const response = await cache.match(request);
            if (!response) continue;
            
            const cacheDateHeader = response.headers.get('sw-cache-date');
            if (cacheDateHeader) {
              const cacheDate = parseInt(cacheDateHeader, 10);
              const age = now - cacheDate;
              
              const url = request.url;
              const isImage = url.includes('/storage/v1/object/public/');
              const isData = url.includes('/rest/v1/');
              
              const maxAge = isImage ? MAX_AGE_IMAGES : isData ? MAX_AGE_DATA : Infinity;
              
              if (age > maxAge) {
                await cache.delete(request);
                deletedCount++;
              }
            }
          }
          
          if (deletedCount > 0) {
            console.log(`[SW] Cache rotation: deleted ${deletedCount} old entries`);
          }
        } catch (error) {
          console.error('[SW] Cache rotation error:', error);
        }
      })()
    );
  }
});


