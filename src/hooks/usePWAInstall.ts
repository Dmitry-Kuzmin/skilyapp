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

    useEffect(() => {
        // 1. Проверяем, запущено ли приложение уже как PWA
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        // 2. Определяем iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

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
            // Для iOS просто показываем инструкцию
            setShowIOSInstructions(true);
        } else if (deferredPrompt) {
            // Для Android вызываем нативное окно
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            // Если кнопка нажата, но deferredPrompt нет (например, десктоп без поддержки или уже установлено)
            // Можно показать простое уведомление или ничего не делать
            console.log('Installation prompt not available');
        }
    };

    return {
        isInstalled: isStandalone,
        isIOS,
        canInstall: !!deferredPrompt || isIOS, // На iOS всегда "можно" попробовать установить через инструкцию
        installApp,
        showIOSInstructions,
        setShowIOSInstructions
    };
};
