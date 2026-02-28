/**
 * Push Notifications Manager
 * Управление Web Push уведомлениями для iOS/Android PWA
 */

import { supabase } from '@/integrations/supabase/client';

// VAPID Public Key (получим позже из Supabase Edge Function)
// Это публичный ключ для шифрования пушей
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BIbTbtur6M7ge2EeItW-bpqGt1MIjiOcJdT4EeUI4cqEB2Nz7fZz2ql734VCtJb6V5B0wco48SCYkujejZ3f6WI';

/**
 * Проверяет, поддерживаются ли Push-уведомления
 */
export function isPushSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Проверяет, установлено ли приложение как PWA (добавлено на домашний экран)
 */
export function isPWAInstalled(): boolean {
    // iOS Safari
    if ((window.navigator as any).standalone === true) {
        return true;
    }
    // Android Chrome
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    return false;
}

/**
 * Получает текущий статус разрешения на уведомления
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Запрашивает разрешение на отправку уведомлений
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
}

/**
 * Конвертирует VAPID ключ из base64 в Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Регистрирует Service Worker и подписывается на Push
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        throw new Error('Push notifications are not supported');
    }

    if (!VAPID_PUBLIC_KEY) {
        console.warn('[Push] VAPID_PUBLIC_KEY not configured');
        throw new Error('Push notifications not configured');
    }

    try {
        // 1. Регистрируем Service Worker
        const registration = await navigator.serviceWorker.register('/sw-push.js', {
            scope: '/',
            updateViaCache: 'none', // Не кэшируем SW
        });

        console.log('[Push] Service Worker registered:', registration);

        // Ждём активации
        await navigator.serviceWorker.ready;

        // 2. Подписываемся на Push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Обязательно для iOS
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        console.log('[Push] Subscribed:', subscription);

        // 3. Сохраняем подписку в Supabase
        const subscriptionData = subscription.toJSON();
        const { error } = await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: subscriptionData.keys?.p256dh,
            auth: subscriptionData.keys?.auth,
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString(),
        }, {
            onConflict: 'endpoint',
        });

        if (error) {
            console.error('[Push] Failed to save subscription:', error);
            throw error;
        }

        console.log('[Push] Subscription saved to database');
        return subscription;
    } catch (error) {
        console.error('[Push] Subscribe error:', error);
        throw error;
    }
}

/**
 * Отписывается от Push-уведомлений
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
    if (!isPushSupported()) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            console.log('[Push] No service worker registration found');
            return;
        }

        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            console.log('[Push] No push subscription found');
            return;
        }

        // Отписываемся
        await subscription.unsubscribe();
        console.log('[Push] Unsubscribed');

        // Удаляем из базы
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint);

        if (error) {
            console.error('[Push] Failed to delete subscription:', error);
        }
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        throw error;
    }
}

/**
 * Проверяет, подписан ли пользователь на Push
 */
export async function isPushSubscribed(): Promise<boolean> {
    if (!isPushSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            return false;
        }

        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch (error) {
        console.error('[Push] Check subscription error:', error);
        return false;
    }
}

export async function sendTestNotification(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker не поддерживается');
    }

    const registration = await navigator.serviceWorker.ready;
    const timestamp = new Date().getTime();

    // ВАЖНО: iOS требует абсолютный URL для картинок
    const origin = window.location.origin;
    const imageUrl = `${origin}/images/hero-lcp.webp`;
    const iconUrl = `${origin}/favicon.ico`;

    await registration.showNotification('🎉 Skily: Rich Push Test', {
        body: 'Зажми уведомление пальцем (Haptic Touch), чтобы увидеть картинку! 📸',
        icon: iconUrl,
        image: imageUrl, // Абсолютный путь обязателен для iOS
        badge: iconUrl,
        tag: `test-notification-${timestamp}`,
        renotify: true,
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        requireInteraction: true,
        // iOS лучше работает с простым текстом в кнопках (без emoji)
        actions: [
            { action: 'open', title: 'Открыть' },
            { action: 'later', title: 'Позже' }
        ],
        data: { url: '/dashboard', timestamp }
    });
}
