import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLocation } from 'react-router-dom';

// Карта цветов для конкретных роутов
const ROUTE_COLORS: Record<string, string> = {
    '/': '#0f172a',
    '/landing': '#0f172a',
};

// Цвет по умолчанию для всего приложения (дашборд)
const DASHBOARD_COLOR = '#09090b';

/**
 * ThemeColorManager — Хамелеон-протокол v4.
 * Синхронно красит browser chrome (theme-color, body, html, Telegram header)
 * под цвет текущей страницы при каждом переходе маршрута.
 */
export function ThemeColorManager() {
    const { resolvedTheme } = useTheme();
    const location = useLocation();

    useEffect(() => {
        const applyColor = (color: string) => {
            if (!color) return;

            // 1. meta theme-color (браузерная строка сверху, PWA)
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                (metaThemeColor as HTMLMetaElement).name = 'theme-color';
                document.head.appendChild(metaThemeColor);
            }
            metaThemeColor.setAttribute('content', color);

            // 2. Windows/IE TileColor
            const metaTile = document.querySelector('meta[name="msapplication-TileColor"]');
            if (metaTile) metaTile.setAttribute('content', color);

            // 3. Тело страницы — для overscroll area (Safari iOS bounce, Android nav bar)
            document.documentElement.style.backgroundColor = color;
            document.body.style.backgroundColor = color;

            // 4. Telegram Mini App header/background
            const tg = (window as any).Telegram?.WebApp;
            if (tg) {
                try {
                    if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(color);
                    if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(color);
                } catch { /* ignore */ }
            }
        };

        const getColor = (): string => {
            const path = location.pathname;

            // Точное совпадение по роуту
            if (ROUTE_COLORS[path]) return ROUTE_COLORS[path];

            // Лендинг и все публичные страницы (не /dashboard)
            if (!path.startsWith('/dashboard')) return '#0f172a';

            // Для дашборда — фиксированный цвет (надёжнее чем getComputedStyle)
            return DASHBOARD_COLOR;
        };

        const color = getColor();

        // Применяем сразу
        applyColor(color);

        // Повторно через RAF — после того как React отрисует DOM
        const raf = requestAnimationFrame(() => {
            applyColor(color);
        });

        return () => cancelAnimationFrame(raf);
    }, [location.pathname, resolvedTheme]);

    return null;
}
