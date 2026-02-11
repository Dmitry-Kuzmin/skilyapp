import React from 'react';
import { Download, Share } from 'lucide-react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallInstructions } from './IOSInstallInstructions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InstallAppButtonProps {
    className?: string; // Для кастомных стилей
    minimal?: boolean; // Если true - только иконка
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
    className,
    minimal
}) => {
    const {
        isInstalled,
        installApp,
        showIOSInstructions,
        setShowIOSInstructions,
        canInstall
    } = usePWAInstall();

    const isTelegram = isTelegramMiniApp();

    // Если приложение уже установлено (PWA mode), кнопку/баннер не показываем
    if (isInstalled) {
        return null;
    }

    // Если мы не можем установить (не Android PWA и не iOS - например Firefox Desktop), тоже скрываем
    // Хотя canInstall возвращает true для iOS, так что это ок.
    if (!canInstall) {
        return null;
    }

    return (
        <>
            <Button
                onClick={installApp}
                className={cn(
                    "gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg transition-all active:scale-95",
                    className
                )}
                size={minimal ? "icon" : "default"}
            >
                <Download className="w-4 h-4" />
                {!minimal && (
                    <span>{isTelegram ? 'Добавить на экран' : 'Установить приложение'}</span>
                )}
            </Button>

            {/* Шторка для iOS рендерится порталом или просто здесь, так как она fixed */}
            <IOSInstallInstructions
                isOpen={showIOSInstructions}
                onClose={() => setShowIOSInstructions(false)}
            />
        </>
    );
};
