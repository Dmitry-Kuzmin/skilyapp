import { useState, useEffect } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWA_INSTALLED_FLAG = 'pwa-was-installed';
const PWA_CHANNEL = 'pwa-status-channel';

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [browserType, setBrowserType] = useState<'safari' | 'chrome' | 'other'>('other');
    const [isPWALikelyInstalled, setIsPWALikelyInstalled] = useState(false);

    useEffect(() => {
        // 1. Проверяем, запущено ли приложение уже как PWA
        // "standalone" for iOS, "display-mode: standalone" for Android
        const isStandaloneMode =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsStandalone(isStandaloneMode);

        // 2. 🧠 УМНАЯ ДЕТЕКЦИЯ: Если сейчас в standalone - сохраняем флаг навсегда
        if (isStandaloneMode) {
            localStorage.setItem(PWA_INSTALLED_FLAG, Date.now().toString());
            console.log('[PWA] 📱 Running in standalone mode - PWA is installed');
        }

        // 3. Определяем iOS и Браузер
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        if (isIosDevice) {
            if (userAgent.includes('crios')) {
                setBrowserType('chrome');
            } else if (userAgent.includes('safari') && !userAgent.includes('crios') && !userAgent.includes('fxios')) {
                setBrowserType('safari');
            } else {
                setBrowserType('other'); // Firefox etc.
            }
        }

        // 4. 🧠 УМНАЯ ДЕТЕКЦИЯ: Если раньше открывали в standalone - PWA скорее всего установлен
        const wasInstalledBefore = localStorage.getItem(PWA_INSTALLED_FLAG);
        if (wasInstalledBefore) {
            const timestamp = parseInt(wasInstalledBefore, 10);
            const daysSince = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

            // Считаем PWA установленным если:
            // - Флаг свежий (< 90 дней) - пользователь недавно открывал PWA
            // - Или мы СЕЙЧАС в standalone режиме
            if (daysSince < 90 || isStandaloneMode) {
                setIsPWALikelyInstalled(true);
                console.log('[PWA] ✅ PWA likely installed (last seen:', Math.round(daysSince), 'days ago)');
            }
        }

        // 5. 🧠 REAL-TIME ДЕТЕКЦИЯ: BroadcastChannel для связи между вкладками
        // Если PWA открыто прямо сейчас - узнаем об этом через канал
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel(PWA_CHANNEL);

            // Если в браузере - спрашиваем, открыто ли PWA
            if (!isStandaloneMode) {
                channel.postMessage({ type: 'ping', from: 'browser' });
                console.log('[PWA] 📡 Checking if PWA is open via BroadcastChannel...');
            }

            // Слушаем ответы
            channel.onmessage = (event) => {
                if (event.data.type === 'pong' && event.data.from === 'pwa') {
                    console.log('[PWA] ✅ PWA is currently open!');
                    setIsPWALikelyInstalled(true);
                    localStorage.setItem(PWA_INSTALLED_FLAG, Date.now().toString());
                }

                // Если мы PWA и нас спросили - отвечаем
                if (event.data.type === 'ping' && isStandaloneMode) {
                    channel.postMessage({ type: 'pong', from: 'pwa' });
                }
            };

            return () => {
                channel.close();
            };
        }

        // 6. Ловим событие установки для Android/Desktop Chrome
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Отменяем стандартный баннер
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const installApp = async () => {
        if (isTelegramMiniApp()) {
            // Для Telegram используем специальный deep-link для добавления на экран
            window.location.href = 'https://t.me/skilyapp_bot/?startapp&addToHomeScreen';
            return;
        }

        if (isIOS) {
            // Для iOS показываем инструкцию
            setShowIOSInstructions(true);
        } else if (deferredPrompt) {
            // Для Android вызываем нативное окно
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                // Ставим флаг что PWA установлено
                localStorage.setItem(PWA_INSTALLED_FLAG, Date.now().toString());
            }
        } else {
            // Fallback (например, десктоп Safari или неизвестный браузер)
            console.log('Installation prompt not available');
            // Тоже можно показать инструкцию, если это мобилка но без поддержки prompt
            if (isIOS) setShowIOSInstructions(true);
        }
    };

    return {
        isInstalled: isStandalone,
        isPWALikelyInstalled, // 🆕 Новый флаг - PWA скорее всего установлен
        isIOS,
        browserType,
        canInstall: !!deferredPrompt || isIOS || isTelegramMiniApp(),
        installApp,
        showIOSInstructions,
        setShowIOSInstructions
    };
};
