import { useEffect,
  useRef} from 'react';
import { useTheme } from 'next-themes';
import { useLocation } from 'react-router-dom';

/**
 * ThemeColorManager - Динамически управляет цветом браузерной панели (theme-color).
 * Адаптируется под текущий фон страницы (Chameleon Effect).
 * @see RULES_LAYOUT.md - RULE 3: The "Chameleon" Protocol
 */
export function ThemeColorManager() {
    const { resolvedTheme } = useTheme();
    const location = useLocation();
    const lastColorRef = useRef<string | null>(null);

    useEffect(() => {
        // Функция для обновления мета-тега и цвета Telegram
        const updateThemeColor = (color: string) => {
            if (!color || color === lastColorRef.current) return;
            lastColorRef.current = color;

            // 1. Обновляем <meta name="theme-color">
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', color);
            }

            // 2. Обновляем msapplication-TileColor для Windows
            const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
            if (metaTileColor) {
                metaTileColor.setAttribute('content', color);
            }

            // 3. Обновляем заголовок Telegram (если мы в Mini App)
            if (window.Telegram?.WebApp) {
                try {
                    const tg = window.Telegram.WebApp;
                    // setHeaderColor принимает HEX или ключевые слова 'bg_color' / 'secondary_bg_color'
                    if (typeof tg.setHeaderColor === 'function') {
                        tg.setHeaderColor(color);
                    }
                    if (typeof tg.setBackgroundColor === 'function') {
                        tg.setBackgroundColor(color);
                    }
                } catch (e) {
                    // Fail silently in production
                    if (import.meta.env.DEV) console.warn('[ThemeColorManager] Failed to set TG colors:', e);
                }
            }

            if (import.meta.env.DEV) {
                console.log('[ThemeColorManager] 🦎 Applied color:', color, 'for route:', location.pathname);
            }
        };

        // Логика определения цвета
        const detectColor = (): string => {
            // КРИТИЧНО: Приоритеты для конкретных роутов (Landing и т.д.)
            if (location.pathname === '/' || location.pathname === '/landing' || !location.pathname.startsWith('/dashboard')) {
                return '#0f172a';
            }

            const bodyStyle = window.getComputedStyle(document.body);
            let bgColor = bodyStyle.backgroundColor;

            if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                const firstChild = document.querySelector('#root > div');
                if (firstChild) {
                    bgColor = window.getComputedStyle(firstChild).backgroundColor;
                }
            }

            if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                return resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
            }

            return rgbToHex(bgColor);
        };

        // 1. Мгновенная попытка
        updateThemeColor(detectColor());

        // 2. Попытка через RAF (когда DOM обновился)
        const rafId = requestAnimationFrame(() => {
            updateThemeColor(detectColor());

            // 3. Отложенная попытка (на случай анимаций смены темы)
            const timerId = setTimeout(() => {
                updateThemeColor(detectColor());
            }, 500);

            return () => clearTimeout(timerId);
        });

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [resolvedTheme, location.pathname]);

    return null;
}

/**
 * Вспомогательная функция для преобразования rgb/rgba в hex
 * Браузеры всегда возвращают rgb() через getComputedStyle
 */
function rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;

    // Регулярка для rgb(r, g, b) или rgba(r, g, b, a)
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
    if (!match) return rgb;

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    // Если это RGBA и альфа-канал близок к 0, считаем прозрачным
    const a = match[4] ? parseFloat(match[4]) : 1;
    if (a < 0.1) return '';

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
