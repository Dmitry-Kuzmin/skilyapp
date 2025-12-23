/**
 * PageWrapper — универсальный контейнер для страниц в Telegram Mini App
 * 
 * Реализует RULE 4 из RULES_LAYOUT.md:
 * - Использует min-h-tg-screen для корректной высоты на мобильных
 * - Добавляет pb-safe-bottom для защиты контента от Home Indicator
 * - Цвет фона совпадает с настройками Telegram (Rule 3)
 * 
 * @see RULES_LAYOUT.md
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
    children: ReactNode;
    /** Дополнительные CSS классы */
    className?: string;
    /** Отключить padding снизу (для страниц с фиксированным footer) */
    noPaddingBottom?: boolean;
    /** Полноэкранный режим (для игр, тестов) - отключает все отступы */
    fullscreen?: boolean;
}

export const PageWrapper = ({
    children,
    className,
    noPaddingBottom = false,
    fullscreen = false
}: PageWrapperProps) => {
    if (fullscreen) {
        return (
            <div className={cn(
                "w-full min-h-tg-screen flex flex-col",
                "bg-zinc-950 text-white",
                className
            )}>
                {children}
            </div>
        );
    }

    return (
        <div className={cn(
            "w-full min-h-tg-screen flex flex-col",
            "bg-zinc-950 text-white",
            !noPaddingBottom && "pb-safe-bottom",
            className
        )}>
            {children}
        </div>
    );
};

export default PageWrapper;
