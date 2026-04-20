/**
 * pageTheme — helpers for per-page background overrides.
 * ThemeColorManager listens for 'page-bg' window CustomEvents.
 * Pages use the usePageBackground hook (src/hooks/usePageBackground.ts).
 */
export function setPageBackground(hex: string | null): void {
    window.dispatchEvent(new CustomEvent('page-bg', { detail: hex }));
}
