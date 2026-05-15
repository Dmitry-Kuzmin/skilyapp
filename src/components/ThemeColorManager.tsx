import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

// Marketing/landing and auth routes are intentionally dark regardless of user theme.
const FORCED_DARK_RE = /^\/(curso|pricing|about|partners|blog|article|promo|course-payment|ru|es|en|legal|terms|privacy|help|login|demo)(\/|$)/;

const isForcedDark = (pathname: string) =>
    pathname === '/' || FORCED_DARK_RE.test(pathname);

/**
 * Bridges React's authoritative theme state into the inline-script applier.
 *
 * Also forces `dark` class on marketing and auth routes so Tailwind dark
 * variants apply correctly even when the user's stored preference is light.
 *
 * ⚠️ Safe with the ORIGINAL index.html __applyThemeColor__ (conditional add).
 * Would loop if index.html always does classList.remove/add unconditionally.
 */
export const ThemeColorManager = () => {
    const { pathname } = useLocation();
    const { resolvedTheme } = useTheme();

    useLayoutEffect(() => {
        const forcedDark = isForcedDark(pathname);
        const mode = forcedDark
            ? 'dark'
            : (resolvedTheme === 'light' || resolvedTheme === 'dark' ? resolvedTheme : 'dark');

        (window as { __themeMode__?: string }).__themeMode__ = mode;

        // Sync html class so Tailwind dark: variants work correctly.
        // apply() (called below) uses the original conditional-add logic from
        // index.html, so it won't change classList again → no MutationObserver loop.
        const html = document.documentElement;
        html.classList.remove(mode === 'dark' ? 'light' : 'dark');
        html.classList.add(mode);
        html.style.colorScheme = mode;

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
