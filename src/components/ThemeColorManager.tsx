import { useEffect } from 'react';
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

    useEffect(() => {
        // Функция для обновления мета-тега и цвета Telegram
        const updateThemeColor = (color: string) => {
            if (!color) return;

            // 1. Обновляем <meta name="theme-color">
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', color);
            } else {
                const meta = document.createElement('meta');
                meta.name = 'theme-color';
                meta.content = color;
                document.head.appendChild(meta);
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
                    console.warn('[ThemeColorManager] Failed to set TG colors:', e);
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
                // Если мы на лендинге или любой внешней странице (не в приложении)
                // Используем глубокий синий фон лендинга
                return '#0f172a';
            }

            // Для всех остальных страниц (внутри /dashboard/*) стараемся определить динамически
            const bodyStyle = window.getComputedStyle(document.body);
            let bgColor = bodyStyle.backgroundColor;

            // Если body прозрачный (бывает при использовании градиентов или в начале рендера)
            if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                // Пытаемся найти первый дочерний элемент в #root
                const firstChild = document.querySelector('#root > div');
                if (firstChild) {
                    bgColor = window.getComputedStyle(firstChild).backgroundColor;
                }
            }

            // Если не удалось определить динамически или это прозрачный фон — используем fallback
            if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                return resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
            }

            // Преобразуем RGB/RGBA в HEX для лучшей поддержки браузерами
            return rgbToHex(bgColor);
        };

        // 1. Мгновенная попытка (для статических страниц)
        const initialColor = detectColor();
        updateThemeColor(initialColor);

        // 2. Попытка через RAF (когда DOM обновился)
        const rafId = requestAnimationFrame(() => {
            const rafColor = detectColor();
            updateThemeColor(rafColor);

            // 3. Отложенная попытка (на случай анимаций смены темы или ленивой загрузки)
            const timerId = setTimeout(() => {
                const finalColor = detectColor();
                updateThemeColor(finalColor);
            }, 500); // 500мс достаточно для большинства переходов

            return () => clearTimeout(timerId);
        });

        return () => cancelAnimationFrame(rafId);
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
