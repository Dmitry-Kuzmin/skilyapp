import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallInstructions } from './IOSInstallInstructions';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallBanner: React.FC = () => {
    const { isInstalled, isPWALikelyInstalled, installApp, showIOSInstructions, setShowIOSInstructions, canInstall } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);
    const isTelegram = isTelegramMiniApp();

    useEffect(() => {
        // 1. Если приложение уже установлено (standalone) - не показываем
        if (isInstalled) return;

        // 2. 🧠 УМНАЯ ПРОВЕРКА: Если PWA скорее всего установлен - не показываем
        if (isPWALikelyInstalled) {
            console.log('[PWABanner] ✅ PWA likely installed - hiding banner');
            return;
        }

        // 3. Если устройство не поддерживает установку - не показываем
        if (!canInstall) return;

        // 4. Проверяем умные флаги скрытия (dismiss/install initiated)
        const checkSmartMain = () => {
            const now = Date.now();

            // 1. Если пользователь нажал "Установить" (считаем, что он уже установил)
            // Скрываем на 60 дней
            const installInitiated = localStorage.getItem('pwa-install-initiated');
            if (installInitiated) {
                const date = parseInt(installInitiated, 10);
                if (now - date < 60 * 24 * 60 * 60 * 1000) return false;
            }

            // 2. Если пользователь закрыл баннер крестиком
            // Скрываем на 14 дней
            const dismissed = localStorage.getItem('pwa-banner-dismissed');
            if (dismissed) {
                const date = parseInt(dismissed, 10);
                if (now - date < 14 * 24 * 60 * 60 * 1000) return false;
            }

            return true;
        };

        if (checkSmartMain()) {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstalled, isPWALikelyInstalled, canInstall]);

    const handleClose = () => {
        setIsVisible(false);
        // Сохраняем дату закрытия для "умного" скрытия (на 14 дней)
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    };

    const handleInstallWrapper = () => {
        // Если пользователь начал процесс установки, считаем что он скорее всего установит
        // Скрываем баннер надолго (60 дней), чтобы не надоедать
        localStorage.setItem('pwa-install-initiated', Date.now().toString());
        installApp();
    };

    if (isInstalled) return null;

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-4 left-4 right-4 z-[90] md:left-auto md:right-8 md:w-96"
                    >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl flex items-center gap-4">
                            <div className="shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium text-sm">
                                    {isTelegram ? 'Вынести на главный экран' : 'Установить приложение'}
                                </h4>
                                <p className="text-zinc-400 text-xs truncate">
                                    {isTelegram ? 'Мгновенный доступ к Skily одним тапом' : 'Быстрее, удобнее и без адресной строки'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleInstallWrapper}
                                    className="bg-white text-black text-xs font-bold px-3 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    Установить
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <IOSInstallInstructions
                isOpen={showIOSInstructions}
                onClose={() => setShowIOSInstructions(false)}
            />
        </>
    );
};
