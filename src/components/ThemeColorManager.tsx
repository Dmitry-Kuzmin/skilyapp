import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from "next-themes";

/**
 * ThemeColorManager (Chameleon Protocol v10 — Global Adaptive)
 *
 * Strategy:
 * 1. Map each route prefix to a specific background color (dark + light).
 * 2. Apply to: CSS --background var, .dark class, meta theme-color, Telegram API.
 * 3. Pages that need a custom color call usePageBackground(hex) from @/hooks/usePageBackground.
 *    That hook dispatches a 'page-bg' window event which we catch here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PER-ROUTE COLOR MAP  (dark / light)
// Add new routes here when a page has a unique background.
// More specific prefixes must come FIRST.
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_COLORS: Array<{
    prefix: string;
    dark: { hex: string; hsl: string };
    light: { hex: string; hsl: string };
}> = [
    // Landing / marketing pages with deep black
    { prefix: '/curso',   dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/pricing', dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/about',   dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/partners',dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/blog',    dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/article', dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },

    // App sections — all dark navy, future: differentiate per section
    { prefix: '/dashboard', dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/tests',     dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/test/',     dark: { hex: '#0d1117', hsl: '213 43% 8%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/learning',  dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/games',     dark: { hex: '#0d1117', hsl: '213 43% 8%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/profile',   dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },

    // Exact landing paths
    { prefix: '/',          dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#ffffff', hsl: '0 0% 100%'   } },
];

// Paths that are always forced dark regardless of system theme
const ALWAYS_DARK = ['/pricing', '/about', '/curso', '/partners', '/legal', '/terms', '/privacy'];

function resolveColor(path: string, mode: 'light' | 'dark') {
    const effectiveMode = ALWAYS_DARK.some(p => path.startsWith(p)) ? 'dark' : mode;

    const match = ROUTE_COLORS.find(r =>
        r.prefix === '/'
            ? path === '/'
            : path === r.prefix || path.startsWith(r.prefix + '/')
    );

    const colors = (match ?? ROUTE_COLORS[ROUTE_COLORS.length - 1])[effectiveMode];
    return { ...colors, effectiveMode };
}

function applyToDOM(hex: string, hsl: string, effectiveMode: 'dark' | 'light') {
    // 1. CSS variable
    document.documentElement.style.setProperty('--background', hsl);

    // 2. Dark class
    if (effectiveMode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    }

    // 3. Meta theme-color (browser chrome / PWA)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', hex);

    // 4. Telegram Mini App — header + background + bottom bar
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
        try {
            if (typeof tg.setHeaderColor    === 'function') tg.setHeaderColor(hex);
            if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(hex);
            if (typeof tg.setBottomBarColor  === 'function') tg.setBottomBarColor(hex);
        } catch { /* ignore */ }
    }

    if (import.meta.env.DEV) {
        console.log(`[Chameleon v10] → ${hex} (${hsl}) [${effectiveMode}]`);
    }
}

export const ThemeColorManager = () => {
    const location = useLocation();
    const { resolvedTheme } = useTheme();

    const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';

    const { hex, hsl, effectiveMode } = useMemo(
        () => resolveColor(location.pathname, mode),
        [location.pathname, mode]
    );

    // Apply on route change or theme change
    useEffect(() => {
        applyToDOM(hex, hsl, effectiveMode);
    }, [hex, hsl, effectiveMode]);

    // Listen for per-page override events (from usePageBackground hook)
    useEffect(() => {
        const handler = (e: Event) => {
            const overrideHex = (e as CustomEvent<string | null>).detail;
            if (overrideHex) {
                applyToDOM(overrideHex, hsl, effectiveMode);
            } else {
                // Page unmounted — restore route default
                applyToDOM(hex, hsl, effectiveMode);
            }
        };
        window.addEventListener('page-bg', handler);
        return () => window.removeEventListener('page-bg', handler);
    }, [hex, hsl, effectiveMode]);

    return null;
};
