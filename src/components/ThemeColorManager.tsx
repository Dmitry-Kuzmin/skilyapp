import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

/**
 * Single source of truth for page background color.
 *
 * On every route/theme change synchronously updates:
 *   - CSS var --background (drives html/body bg + Tailwind bg-background)
 *   - <meta name="theme-color">  (browser tab / address bar)
 *   - Telegram WebApp header/background/bottom bar
 *
 * Pages with a unique bg call usePageBackground(hex); the override resets on unmount.
 */

type ColorPair = { hex: string; hsl: string };
type RouteColor = { match: (path: string) => boolean; dark: ColorPair; light: ColorPair };

// Default app color (dashboard, tests, learning, profile, etc.)
const APP_DARK: ColorPair = { hex: '#0f172a', hsl: '222 47% 11%' };
const APP_LIGHT: ColorPair = { hex: '#f8fafc', hsl: '210 40% 98%' };

// Marketing / landing color (deep black-blue)
const MARKETING: ColorPair = { hex: '#060a14', hsl: '225 55% 6%' };

// Pages that ignore system theme and stay dark
const ALWAYS_DARK_PREFIXES = [
    '/curso', '/pricing', '/about', '/partners', '/blog', '/article',
    '/legal', '/terms', '/privacy', '/promo', '/course-payment',
    '/ru', '/es', '/en', '/',
];

// Routes whose marketing/dark bg differs from the app default
const MARKETING_PREFIXES = [
    '/curso', '/pricing', '/about', '/partners', '/blog', '/article',
    '/promo', '/course-payment', '/ru', '/es', '/en',
];

function startsWith(path: string, prefix: string): boolean {
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(prefix + '/');
}

function resolve(path: string, mode: 'light' | 'dark'): { color: ColorPair; mode: 'light' | 'dark' } {
    const forcedDark = ALWAYS_DARK_PREFIXES.some(p => startsWith(path, p));
    const effectiveMode: 'light' | 'dark' = forcedDark ? 'dark' : mode;
    const isMarketing = MARKETING_PREFIXES.some(p => startsWith(path, p));

    if (isMarketing) return { color: MARKETING, mode: effectiveMode };
    return { color: effectiveMode === 'light' ? APP_LIGHT : APP_DARK, mode: effectiveMode };
}

function apply(color: ColorPair, mode: 'light' | 'dark') {
    document.documentElement.style.setProperty('--background', color.hsl);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.classList.toggle('light', mode === 'light');

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color.hex);

    const tg = (window as { Telegram?: { WebApp?: Record<string, unknown> } }).Telegram?.WebApp;
    if (tg) {
        try {
            (tg.setHeaderColor as ((c: string) => void) | undefined)?.(color.hex);
            (tg.setBackgroundColor as ((c: string) => void) | undefined)?.(color.hex);
            (tg.setBottomBarColor as ((c: string) => void) | undefined)?.(color.hex);
        } catch { /* ignore */ }
    }
}

export const ThemeColorManager = () => {
    const { pathname } = useLocation();
    const { resolvedTheme } = useTheme();
    const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';

    const { color, mode: effectiveMode } = useMemo(
        () => resolve(pathname, mode),
        [pathname, mode],
    );

    useEffect(() => {
        apply(color, effectiveMode);
    }, [color, effectiveMode]);

    useEffect(() => {
        const handler = (e: Event) => {
            const override = (e as CustomEvent<string | null>).detail;
            if (override) {
                apply({ hex: override, hsl: color.hsl }, effectiveMode);
            } else {
                apply(color, effectiveMode);
            }
        };
        window.addEventListener('page-bg', handler);
        return () => window.removeEventListener('page-bg', handler);
    }, [color, effectiveMode]);

    return null;
};
