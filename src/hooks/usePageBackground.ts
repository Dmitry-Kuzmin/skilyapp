import { useEffect } from 'react';

/**
 * Override the ThemeColorManager background color for this specific page.
 * On unmount, automatically resets to route-default.
 *
 * @example
 *   // In a page component with a unique dark hero:
 *   usePageBackground('#1a1a2e');
 */
export function usePageBackground(hex: string | null): void {
    useEffect(() => {
        if (!hex) return;
        window.dispatchEvent(new CustomEvent('page-bg', { detail: hex }));
        return () => {
            window.dispatchEvent(new CustomEvent('page-bg', { detail: null }));
        };
    }, [hex]);
}
