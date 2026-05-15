import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

const MARKETING_RE = /^\/(curso|pricing|about|partners|blog|article|promo|course-payment|ru|es|en)(\/|$)/;
const ALWAYS_DARK_RE = /^\/(legal|terms|privacy|help|login|demo)(\/|$)/;

const isForcedDarkRoute = (pathname: string) => {
    return pathname === '/' || MARKETING_RE.test(pathname) || ALWAYS_DARK_RE.test(pathname);
};

/**
 * Bridges React's authoritative theme state into the inline-script applier.
 *
 * The inline script in index.html (window.__applyThemeColor__) is the single
 * source of truth for meta[theme-color] + html bg. It guesses the mode from
 * html.class / localStorage before React mounts. Once React mounts, THIS
 * component writes the exact resolved theme to window.__themeMode__ so the
 * inline applier doesn't have to guess anymore.
 */
export const ThemeColorManager = () => {
    const { pathname } = useLocation();
    const { resolvedTheme } = useTheme();

    useLayoutEffect(() => {
        const forcedDark = isForcedDarkRoute(pathname);
        const mode = forcedDark
            ? 'dark'
            : (resolvedTheme === 'light' || resolvedTheme === 'dark' ? resolvedTheme : 'dark');

        // Publish the authoritative mode so __applyThemeColor__ reads it directly.
        (window as { __themeMode__?: string }).__themeMode__ = mode;

        // Some routes are intentionally dark marketing/auth surfaces. They must
        // force the actual Tailwind theme class too, not only the page background,
        // otherwise bg-card/text-foreground components render in light mode on a
        // dark shell when the stored app theme is light/system-light.
        const html = document.documentElement;
        if (forcedDark) {
            html.classList.remove('light');
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove(mode === 'dark' ? 'light' : 'dark');
            html.classList.add(mode);
            html.style.colorScheme = mode;
        }

        const apply = (window as { __applyThemeColor__?: () => void }).__applyThemeColor__;
        if (typeof apply !== 'function') return;
        apply();
        // Telegram's expand() resets header/bottom colors ~300ms after mount.
        const t = setTimeout(apply, 500);
        return () => clearTimeout(t);
    }, [pathname, resolvedTheme]);

    // Forward Telegram's themeChanged event.
    useEffect(() => {
        const tg = (window as { Telegram?: { WebApp?: { onEvent?: unknown; offEvent?: unknown } } }).Telegram?.WebApp;
        const apply = (window as { __applyThemeColor__?: () => void }).__applyThemeColor__;
        if (!tg?.onEvent || typeof apply !== 'function') return;
        (tg.onEvent as (event: string, handler: () => void) => void)('themeChanged', apply);
        return () => (tg.offEvent as ((event: string, handler: () => void) => void) | undefined)?.('themeChanged', apply);
    }, []);

    return null;
};
