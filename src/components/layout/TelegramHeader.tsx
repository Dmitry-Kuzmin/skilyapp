/**
 * TelegramHeader — Fixed header для Telegram Mini App
 * 
 * Реализует RULE 4 из RULES_LAYOUT.md:
 * - Использует pt-safe-top для защиты от Dynamic Island / Notch
 * - Fixed позиционирование с backdrop-blur
 * - Цвет фона совпадает с настройками Telegram (Rule 3)
 * 
 * @see RULES_LAYOUT.md
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TelegramHeaderProps {
    children: ReactNode;
    /** Дополнительные CSS классы */
    className?: string;
    /** Высота контента (без safe area) */
    height?: "sm" | "md" | "lg";
    /** Прозрачный фон с blur */
    transparent?: boolean;
}

const heightClasses = {
    sm: "h-12",
    md: "h-14",
    lg: "h-16",
};

export const TelegramHeader = ({
    children,
    className,
    height = "md",
    transparent = false
}: TelegramHeaderProps) => {
    return (
        <header className={cn(
            "fixed top-0 left-0 w-full z-50",
            "pt-safe-top", // CRITICAL: Pushes content below the Notch
            transparent
                ? "bg-zinc-950/80 backdrop-blur-md"
                : "bg-zinc-950",
            className
        )}>
            <div className={cn(
                heightClasses[height],
                "flex items-center px-4"
            )}>
                {children}
            </div>
        </header>
    );
};

/**
 * Spacer для компенсации высоты fixed header
 * Использовать после TelegramHeader чтобы контент не перекрывался
 */
export const TelegramHeaderSpacer = ({
    height = "md"
}: {
    height?: "sm" | "md" | "lg"
}) => {
    return (
        <div className={cn(
            "w-full pt-safe-top",
            heightClasses[height]
        )} />
    );
};

export default TelegramHeader;
