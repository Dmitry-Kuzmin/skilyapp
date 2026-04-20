import { useEffect } from 'react';
import { setPageBackground } from '@/lib/pageTheme';

/**
 * Tell ThemeColorManager + Telegram the dominant background color for this page.
 * Pass null or omit to reset to the route-default.
 *
 * @example
 *   usePageBackground('#1a1a2e');
 */
export function usePageBackground(hex: string | null): void {
  useEffect(() => {
    if (!hex) return;
    setPageBackground(hex);
    return () => setPageBackground(null);
  }, [hex]);
}
