/**
 * pageTheme — lightweight bus for per-page background color overrides.
 *
 * Pages call setPageBackground(hex) on mount (reset to null on unmount).
 * ThemeColorManager subscribes and forwards the color to Telegram API + meta tag.
 *
 * Usage in a page:
 *   import { usePageBackground } from '@/lib/pageTheme';
 *   usePageBackground('#1a1a2e'); // matches the page's hero gradient
 */

type Listener = (hex: string | null) => void;
const listeners = new Set<Listener>();
let currentOverride: string | null = null;

export function setPageBackground(hex: string | null): void {
  currentOverride = hex;
  listeners.forEach((fn) => fn(hex));
}

export function getPageBackground(): string | null {
  return currentOverride;
}

export function subscribePageBackground(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
