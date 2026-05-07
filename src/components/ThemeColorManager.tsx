import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from "next-themes";

// Route → background color. More specific prefixes must come first.
const ROUTE_COLORS: Array<{
    prefix: string;
    dark:  { hex: string; hsl: string };
    light: { hex: string; hsl: string };
}> = [
    { prefix: '/test/',     dark: { hex: '#0d1117', hsl: '213 43% 8%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/games',     dark: { hex: '#0d1117', hsl: '213 43% 8%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/dashboard', dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/tests',     dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/learning',  dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/profile',   dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    // Marketing pages — always dark
    { prefix: '/pricing',   dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/about',     dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/curso',     dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/partners',  dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#060a14', hsl: '225 55% 6%'  } },
    { prefix: '/blog',      dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/article',   dark: { hex: '#060a14', hsl: '225 55% 6%'  }, light: { hex: '#f8fafc', hsl: '210 40% 98%' } },
    { prefix: '/',          dark: { hex: '#0f172a', hsl: '222 47% 11%' }, light: { hex: '#ffffff', hsl: '0 0% 100%'   } },
];

const FORCE_DARK_PREFIXES = ['/pricing', '/about', '/curso', '/partners', '/legal', '/terms', '/privacy'];

function getColor(pathname: string, resolvedTheme: string | undefined) {
    const forceDark = FORCE_DARK_PREFIXES.some(p => pathname.startsWith(p));
    const mode: 'dark' | 'light' = forceDark || resolvedTheme !== 'light' ? 'dark' : 'light';

    const entry = ROUTE_COLORS.find(r =>
        r.prefix === '/' ? pathname === '/' : pathname.startsWith(r.prefix)
    ) ?? ROUTE_COLORS[ROUTE_COLORS.length - 1];

    return { mode, ...entry[mode] };
}

function applyColors(hex: string, hsl: string, mode: 'dark' | 'light'): void {
    document.documentElement.style.setProperty('--background', hsl);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.body.classList.toggle('dark', mode === 'dark');

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex);

    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    try {
        if (typeof tg.setHeaderColor    === 'function') tg.setHeaderColor(hex);
        if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(hex);
        if (typeof tg.setBottomBarColor  === 'function') tg.setBottomBarColor(hex);
    } catch { /* ignore */ }
}

export const ThemeColorManager = () => {
    const { pathname } = useLocation();
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        const { hex, hsl, mode } = getColor(pathname, resolvedTheme);

        // Apply immediately (CSS + meta)
        applyColors(hex, hsl, mode);

        // Retry after 500ms: TelegramContext calls ready()+expand() async after this
        // effect runs. expand() can reset Telegram's header/bottom colors to defaults,
        // so we re-apply once the Telegram UI has settled.
        const retry = setTimeout(() => applyColors(hex, hsl, mode), 500);
        return () => clearTimeout(retry);
    }, [pathname, resolvedTheme]);

    // Re-apply when user switches Telegram's own theme (dark ↔ light)
    useEffect(() => {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg?.onEvent) return;

        const handler = () => {
            const { hex, hsl, mode } = getColor(pathname, resolvedTheme);
            applyColors(hex, hsl, mode);
        };

        tg.onEvent('themeChanged', handler);
        return () => tg.offEvent?.('themeChanged', handler);
    }, [pathname, resolvedTheme]);

    return null;
};
