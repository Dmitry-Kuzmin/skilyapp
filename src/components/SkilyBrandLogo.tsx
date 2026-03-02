import React from 'react';
import { cn } from "@/lib/utils";

interface SkilyBrandLogoProps {
    className?: string;
    size?: number;
    showText?: boolean;
    variant?: 'light' | 'dark' | 'color';
}

/**
 * ОФИЦИАЛЬНЫЙ БРЕНД-ЛОГОТИП SKILY
 * Воссоздан на основе корпоративного стиля (лого на машине)
 */
export const SkilyBrandLogo: React.FC<SkilyBrandLogoProps> = ({
    className,
    size = 40,
    showText = true,
    variant = 'color'
}) => {
    // Цвета из корпоративного стиля
    const iconColor1 = "#00D1FF"; // Cyan
    const iconColor2 = "#0057FF"; // Blue
    const textColor = variant === 'light' ? "#FFFFFF" : "#0A2540"; // Navy Dark or White

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 drop-shadow-sm"
            >
                {/* Top hook (Cyan) */}
                <path
                    d="M45 25C45 15 55 10 65 10C75 10 85 15 85 30C85 45 70 50 55 50C40 50 30 55 30 70C30 85 40 90 50 90C65 90 75 80 75 70"
                    stroke={variant === 'color' ? iconColor1 : 'currentColor'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="opacity-90"
                />
                {/* Bottom hook (Blue) - slightly offset */}
                <path
                    d="M25 30C25 20 35 10 50 10C65 10 75 15 75 30C75 45 60 50 45 50C30 50 15 55 15 70C15 85 25 90 35 90C45 90 55 80 55 70"
                    stroke={variant === 'color' ? iconColor2 : 'currentColor'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>

            {showText && (
                <span
                    className="font-black tracking-tight"
                    style={{
                        fontSize: size * 0.6,
                        color: textColor,
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Skily
                </span>
            )}
        </div>
    );
};
