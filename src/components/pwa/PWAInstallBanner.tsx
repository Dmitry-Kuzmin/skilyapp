import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallInstructions } from './IOSInstallInstructions';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallBanner: React.FC = () => {
    const { isInstalled, installApp, showIOSInstructions, setShowIOSInstructions, canInstall } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Показываем баннер через 3 секунды после загрузки, если можно установить
        if (!isInstalled && canInstall) {
            // Проверяем, не закрывал ли пользователь баннер ранее (в сессии)
            const wasClosed = sessionStorage.getItem('pwa-banner-closed');
            if (!wasClosed) {
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isInstalled, canInstall]);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa-banner-closed', 'true');
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
                                <h4 className="text-white font-medium text-sm">Установить приложение</h4>
                                <p className="text-zinc-400 text-xs truncate">
                                    Быстрее, удобнее и без адресной строки
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={installApp}
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
