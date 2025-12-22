/**
 * Page - Универсальный контейнер страницы с Telegram Safe Areas
 * 
 * Автоматически применяет отступы для:
 * - Status Bar / Dynamic Island (iOS)
 * - Кнопка "Назад" Telegram
 * - Home Indicator (iOS)
 * 
 * @example
 * ```tsx
 * <Page>
 *   <h1>My Page</h1>
 * </Page>
 * 
 * // С дополнительными классами
 * <Page className="bg-background p-6">
 *   <h1>My Page</h1>
 * </Page>
 * 
 * // Без верхнего отступа (для fullscreen режимов)
 * <Page noTopPadding>
 *   <FullscreenContent />
 * </Page>
 * ```
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp, isTelegramMobilePlatformName, getTelegramWebApp } from "@/lib/telegram";

interface PageProps {
    children: ReactNode;
    className?: string;
    /** Отключить верхний safe-area отступ (для fullscreen mode) */
    noTopPadding?: boolean;
    /** Отключить нижний safe-area отступ */
    noBottomPadding?: boolean;
    /** Использовать min-height вместо просто контейнера */
    fullHeight?: boolean;
}

export function Page({
    children,
    className,
    noTopPadding = false,
    noBottomPadding = false,
    fullHeight = false,
}: PageProps) {
    // Определяем, нужны ли Telegram отступы
    const isTelegram = isTelegramMiniApp();
    const webApp = getTelegramWebApp();
    const isMobileTelegram = isTelegram && webApp?.platform
        ? isTelegramMobilePlatformName(webApp.platform)
        : false;

    return (
        <div
            className={cn(
                // Базовые стили
                "w-full",
                // Высота (опционально)
                fullHeight && "min-h-tg-screen",
                // Safe Area Padding для Telegram Mobile
                isMobileTelegram && !noTopPadding && "pt-safe-top",
                isMobileTelegram && !noBottomPadding && "pb-safe-bottom",
                // Дополнительные классы
                className
            )}
            style={{
                // Fallback для старых версий Telegram или когда CSS-переменные еще не установлены
                ...(isMobileTelegram && !noTopPadding ? {
                    paddingTop: `max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), 48px)`
                } : {}),
                ...(isMobileTelegram && !noBottomPadding ? {
                    paddingBottom: `max(var(--tg-content-safe-area-inset-bottom, 0px), var(--tg-safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px))`
                } : {}),
            }}
        >
            {children}
        </div>
    );
}

export default Page;
