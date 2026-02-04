import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [browserType, setBrowserType] = useState<'safari' | 'chrome' | 'other'>('other');

    useEffect(() => {
        // 1. Проверяем, запущено ли приложение уже как PWA
        // "standalone" for iOS, "display-mode: standalone" for Android
        const isStandaloneMode =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsStandalone(isStandaloneMode);

        // 2. Определяем iOS и Браузер
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

        // 3. Ловим событие установки для Android/Desktop Chrome
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
        if (isIOS) {
            // Для iOS показываем инструкцию
            setShowIOSInstructions(true);
        } else if (deferredPrompt) {
            // Для Android вызываем нативное окно
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
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
        isIOS,
        browserType,
        canInstall: !!deferredPrompt || isIOS,
        installApp,
        showIOSInstructions,
        setShowIOSInstructions
    };
};
