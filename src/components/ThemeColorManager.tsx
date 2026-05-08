import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

/**
 * Single source of truth for page background color.
 *
 * On every route/theme change updates:
 *   - CSS var --background (drives html/body bg via Tailwind bg-background)
 *   - <meta name="theme-color">  (browser tab / address bar)
 *   - Telegram WebApp header / background / bottom bar
 */

type ColorPair = { hex: string; hsl: string };

const APP_DARK:  ColorPair = { hex: '#0f172a', hsl: '222 47% 11%' };
const APP_LIGHT: ColorPair = { hex: '#f8fafc', hsl: '210 40% 98%' };
const MARKETING: ColorPair = { hex: '#060a14', hsl: '225 55% 6%'  };

// These routes always use the dark theme, regardless of system preference
const ALWAYS_DARK = [
    '/curso', '/pricing', '/about', '/partners', '/blog', '/article',
    '/legal', '/terms', '/privacy', '/promo', '/course-payment',
    '/help', '/ru', '/es', '/en', '/',
];

// These routes use MARKETING color instead of APP color
const MARKETING_ROUTES = [
    '/curso', '/pricing', '/about', '/partners', '/blog', '/article',
    '/promo', '/course-payment', '/ru', '/es', '/en',
];

function matchPrefix(path: string, prefix: string) {
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(prefix + '/');
}

function resolve(path: string, mode: 'light' | 'dark'): { color: ColorPair; mode: 'light' | 'dark' } {
    const forceDark = ALWAYS_DARK.some(p => matchPrefix(path, p));
    const effectiveMode: 'light' | 'dark' = forceDark ? 'dark' : mode;
    const isMarketing = MARKETING_ROUTES.some(p => matchPrefix(path, p));
    return {
        color: isMarketing ? MARKETING : effectiveMode === 'light' ? APP_LIGHT : APP_DARK,
        mode: effectiveMode,
    };
}

function setMetaThemeColor(hex: string) {
    // iOS Safari ignores setAttribute('content') updates on existing meta[theme-color]
    // in many cases (known WebKit bug). Removing and re-creating forces a re-read.
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = hex;
    document.head.appendChild(meta);
}

function apply(color: ColorPair, mode: 'light' | 'dark') {
    const html = document.documentElement;
    html.style.setProperty('--background', color.hsl);
    // Inline backgroundColor: Safari reads this for overscroll/pull-to-refresh
    // and won't pick up a CSS-variable-driven rule reliably across reloads.
    html.style.backgroundColor = color.hex;
    html.classList.toggle('dark', mode === 'dark');
    html.classList.toggle('light', mode === 'light');
    if (document.body) document.body.style.backgroundColor = color.hex;

    setMetaThemeColor(color.hex);

    const tg = (window as { Telegram?: { WebApp?: Record<string, unknown> } }).Telegram?.WebApp;
    if (!tg) return;
    try {
        (tg.setHeaderColor    as ((c: string) => void) | undefined)?.(color.hex);
        (tg.setBackgroundColor as ((c: string) => void) | undefined)?.(color.hex);
        (tg.setBottomBarColor  as ((c: string) => void) | undefined)?.(color.hex);
    } catch { /* ignore */ }
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
        // Re-apply after 500ms: Telegram's expand() resets header/bottom colors,
        // so we need to set them again after the Telegram UI settles.
        const retry = setTimeout(() => apply(color, effectiveMode), 500);
        return () => clearTimeout(retry);
    }, [color, effectiveMode]);

    // Re-apply if Telegram switches its own dark/light theme
    useEffect(() => {
        const tg = (window as { Telegram?: { WebApp?: { onEvent?: unknown; offEvent?: unknown } } }).Telegram?.WebApp;
        if (!tg?.onEvent) return;
        const handler = () => apply(color, effectiveMode);
        (tg.onEvent as (event: string, handler: () => void) => void)('themeChanged', handler);
        return () => (tg.offEvent as ((event: string, handler: () => void) => void) | undefined)?.('themeChanged', handler);
    }, [color, effectiveMode]);

    return null;
};
