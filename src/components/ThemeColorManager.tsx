import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

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

    useEffect(() => {
        // Publish the authoritative mode so __applyThemeColor__ reads it directly.
        if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
            (window as { __themeMode__?: string }).__themeMode__ = resolvedTheme;
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
