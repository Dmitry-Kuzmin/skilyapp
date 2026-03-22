import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from "next-themes";

/**
 * ThemeColorManager (Chameleon Protocol v8 — Dynamic Theme Support)
 *
 * Стратегия:
 * 1. Определяет текущую тему (light/dark) через next-themes.
 * 2. Обновляет CSS-переменную --background (HSL).
 * 3. Синхронизирует мета-теги и Telegram WebApp.
 */

// Цветовые схемы
const THEMES = {
    dark: {
        landing: { hex: '#0f172a', hsl: '222 47% 11%' },
        app: { hex: '#0f172a', hsl: '222 47% 11%' }
    },
    light: {
        landing: { hex: '#ffffff', hsl: '0 0% 100%' },
        app: { hex: '#f8fafc', hsl: '210 40% 98%' } // Airy Slate-50 background
    }
} as const;

const APP_PREFIXES = [
    '/dashboard', '/tests', '/learning', '/games',
    '/profile', '/settings', '/purchase', '/topic',
    '/subtopic', '/test/', '/admin', '/partner',
] as const;

const EXACT_LANDING_PATHS = new Set([
    '/', '/landing', '/landing-ru', '/russia',
    '/landing-es', '/spain', '/login',
    '/auth/callback', '/auth/telegram/callback',
]);

function getThemePalette(path: string, mode: 'light' | 'dark') {
    const palette = THEMES[mode] || THEMES.dark;
    
    if (EXACT_LANDING_PATHS.has(path)) return palette.landing;
    if (APP_PREFIXES.some(prefix => path.startsWith(prefix))) return palette.app;
    
    return palette.landing;
}

export const ThemeColorManager = () => {
    const location = useLocation();
    const { resolvedTheme } = useTheme();
    
    // Определяем эффективную тему (fallback на dark, если не определено)
    const mode = (resolvedTheme === 'light' ? 'light' : 'dark');

    const colors = useMemo(
        () => getThemePalette(location.pathname, mode),
        [location.pathname, mode]
    );

    useEffect(() => {
        const { hex, hsl } = colors;

        // ── 1. CSS переменная ──────────────────────────────────────────────────
        document.documentElement.style.setProperty('--background', hsl);

        // ── 2. Meta theme-color ──────────────────────────────────────────────
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', hex);

        // ── 3. Telegram WebApp ───────────────────────────────────────────────
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
            try {
                if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(hex);
                if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(hex);
                if (typeof tg.setBottomBarColor === 'function') tg.setBottomBarColor(hex);
            } catch {
                // Игнорируем ошибки API Telegram
            }
        }

        if (import.meta.env.DEV) {
            console.log(`[Chameleon v8] ${location.pathname} [${mode}] → ${hex}`);
        }
    }, [colors, location.pathname, mode]);

    return null;
};

