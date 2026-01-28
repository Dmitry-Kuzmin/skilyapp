/**
 * Service Worker для Push-уведомлений
 * ВАЖНО: НЕ кэширует файлы, только обрабатывает пуши
 */

const SW_VERSION = '1.0.0';

// Установка SW
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version:', SW_VERSION);
    // Пропускаем ожидание и сразу активируем
    self.skipWaiting();
});

// Активация SW
self.addEventListener('activate', (event) => {
    console.log('[SW] Activated version:', SW_VERSION);
    // Берём контроль над всеми клиентами
    event.waitUntil(self.clients.claim());
});

// КРИТИЧНО: Обработка Push-уведомлений
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {
        title: 'Skily',
        body: 'У вас новое уведомление',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
    };

    // Парсим данные из пуша
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[SW] Failed to parse push data:', e);
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/badge-72.png',
        image: data.image, // Большая картинка (как в Duolingo)
        vibrate: data.vibrate || [200, 100, 200],
        tag: data.tag || 'skily-notification',
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.url || '/',
            ...data.data,
        },
        // iOS не поддерживает icon в actions, только title
        actions: data.actions || [
            {
                action: 'open',
                title: 'Открыть', // Короткий текст для iOS (1-2 слова)
            },
            {
                action: 'close',
                title: 'Закрыть',
            },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Обработка кликов по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    // Если нажали на кнопку действия
    if (event.action === 'close') {
        return; // Просто закрываем
    }

    // Открываем приложение
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Ищем уже открытую вкладку
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(urlToOpen);
                    return;
                }
            }
            // Если нет открытых — открываем новую
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Обработка закрытия уведомления
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event);
    // Можно отправить аналитику
});
