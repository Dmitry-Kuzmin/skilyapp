import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

/**
 * Triggers the global theme-color applier defined in index.html.
 *
 * All actual logic — color resolution, meta tag updates, Telegram colors,
 * iOS Safari quirks — lives in the inline script in index.html (window.__applyThemeColor__).
 * That script reacts on its own to: route changes (history API patches),
 * theme changes (MutationObserver on html.class), system theme, and page lifecycle events.
 *
 * This component exists as a belt-and-suspenders: explicit triggers from React in case
 * a transition is missed (e.g. when next-themes mounts and the class first appears).
 */
export const ThemeColorManager = () => {
    const { pathname } = useLocation();
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        const apply = (window as { __applyThemeColor__?: () => void }).__applyThemeColor__;
        if (typeof apply !== 'function') return;
        apply();
        // Telegram's expand() can reset header/bottom colors a few hundred ms in.
        const t = setTimeout(apply, 500);
        return () => clearTimeout(t);
    }, [pathname, resolvedTheme]);

    // Forward Telegram's themeChanged event to the global applier.
    useEffect(() => {
        const tg = (window as { Telegram?: { WebApp?: { onEvent?: unknown; offEvent?: unknown } } }).Telegram?.WebApp;
        const apply = (window as { __applyThemeColor__?: () => void }).__applyThemeColor__;
        if (!tg?.onEvent || typeof apply !== 'function') return;
        (tg.onEvent as (event: string, handler: () => void) => void)('themeChanged', apply);
        return () => (tg.offEvent as ((event: string, handler: () => void) => void) | undefined)?.('themeChanged', apply);
    }, []);

    return null;
};
