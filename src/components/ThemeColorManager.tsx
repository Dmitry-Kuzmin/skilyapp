import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLocation } from 'react-router-dom';

export function ThemeColorManager() {
    const { resolvedTheme } = useTheme();
    const location = useLocation();

    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');

        // Умная детекция цвета фона страницы
        const detectPageColor = (): string => {
            // Пробуем взять цвет с body или элемента с классом bg-background
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            const bgColor = computedStyle.backgroundColor;

            // Если нашли реальный цвет (не transparent/rgba(0,0,0,0))
            if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                return rgbToHex(bgColor);
            }

            // Fallback на тему
            return resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
        };

        // Конвертация rgb(a) в hex
        const rgbToHex = (rgb: string): string => {
            const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }
            // Если не смогли распарсить - fallback
            return resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
        };

        // Небольшая задержка для рендеринга страницы
        const timer = setTimeout(() => {
            const color = detectPageColor();

            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', color);
            } else {
                const meta = document.createElement('meta');
                meta.name = 'theme-color';
                meta.content = color;
                document.head.appendChild(meta);
            }

            // Also update msapplication-TileColor
            const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
            if (metaTileColor) {
                metaTileColor.setAttribute('content', color);
            }
        }, 100); // Даем странице отрендериться

        return () => clearTimeout(timer);
    }, [resolvedTheme, location.pathname]); // Обновляем при смене роута

    return null;
}
