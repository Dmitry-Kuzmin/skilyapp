import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLocation } from 'react-router-dom';

export function ThemeColorManager() {
    const { resolvedTheme } = useTheme();
    const location = useLocation();

    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');

        // КРИТИЧНО: Фиксированные, проверенные цвета
        // #09090b - zinc-950, основной фон приложения
        const DARK_COLOR = '#09090b';   // Matches index.css body background
        const LIGHT_COLOR = '#ffffff';  // White for light mode

        // Определяем цвет на основе темы (без автодетекции, которая глючит)
        let color = resolvedTheme === 'dark' ? DARK_COLOR : LIGHT_COLOR;

        // Устанавливаем theme-color сразу, синхронно
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        } else {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = color;
            document.head.appendChild(meta);
        }

        // Also update msapplication-TileColor для Windows
        const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
        if (metaTileColor) {
            metaTileColor.setAttribute('content', color);
        }

        // DEBUG: Логируем для проверки
        if (import.meta.env.DEV) {
            console.log('[ThemeColorManager] Set theme-color:', color, 'for route:', location.pathname);
        }

    }, [resolvedTheme, location.pathname]); // Обновляем при смене темы или роута

    return null;
}
