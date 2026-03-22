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
    '/pricing', '/about', '/terms', '/privacy',
    '/subscription-terms', '/legal', '/purchase',
    '/success', '/cancel', '/inventory', '/blog', '/article'
] as const;

const EXACT_LANDING_PATHS = new Set([
    '/', '/landing', '/landing-ru', '/russia',
    '/landing-es', '/spain', '/login',
    '/auth/callback', '/auth/telegram/callback',
]);

const ALWAYS_DARK_PATHS = [
    '/pricing', '/about', '/legal', '/terms', '/privacy',
    '/subscription-terms', '/success', '/cancel'
];

function getThemePalette(path: string, mode: 'light' | 'dark') {
    // FORCE DARK for premium/marketing pages
    const effectiveMode = ALWAYS_DARK_PATHS.some(p => path.startsWith(p)) ? 'dark' : mode;
    const palette = THEMES[effectiveMode] || THEMES.dark;
    
    if (EXACT_LANDING_PATHS.has(path)) return palette.landing;
    if (APP_PREFIXES.some(prefix => path.startsWith(prefix))) return palette.app;
    
    return palette.landing;
}

export const ThemeColorManager = () => {
    const location = useLocation();
    const { resolvedTheme } = useTheme();
    
    // Определяем эффективную тему (fallback на dark, если не определено)
    const mode = (resolvedTheme === 'light' ? 'light' : 'dark');

    // КРИТИЧНО: Используем ту же логику что и в getThemePalette для синхронизации классов
    const effectiveMode = ALWAYS_DARK_PATHS.some(p => location.pathname.startsWith(p)) ? 'dark' : mode;

    const colors = useMemo(
        () => getThemePalette(location.pathname, mode),
        [location.pathname, mode]
    );

    useEffect(() => {
        const { hex, hsl } = colors;

        // ── 1. CSS переменная ──────────────────────────────────────────────────
        document.documentElement.style.setProperty('--background', hsl);

        // ── 2. Синхронизация .dark класса ─────────────────────────────────────
        // Если мы в принудительно темном режиме — добавляем класс .dark
        if (effectiveMode === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }

        // ── 3. Meta theme-color ──────────────────────────────────────────────
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', hex);

        // ── 4. Telegram WebApp ───────────────────────────────────────────────
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
            console.log(`[Chameleon v8] ${location.pathname} [${effectiveMode}] → ${hex}`);
        }
    }, [colors, location.pathname, effectiveMode]);

    return null;
};

