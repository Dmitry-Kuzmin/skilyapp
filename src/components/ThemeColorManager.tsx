import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ThemeColorManager (Chameleon Protocol v7 — CSS-First)
 *
 * Стратегия:
 * 1. Обновляет CSS-переменную --background (HSL).
 *    → html { background-color: hsl(var(--background)) } в index.css автоматически
 *      обновит фон для ВСЕГО документа включая области overscroll (Edge-to-Edge).
 *    → body с @apply bg-background тоже реагирует через CSS, БЕЗ лишних JS-ререндеров.
 *    → Нижний navbar с bg-background/95 автоматически адаптируется.
 * 2. Обновляет meta theme-color → цвет вкладки/адресной строки браузера.
 * 3. Синхронизирует Telegram WebApp (через window напрямую — обходим проблемы типов).
 *
 * Никаких getComputedStyle, никаких !important через JS, никакой борьбы с CSS.
 */

// Лендинг: тёмно-синий slate-900
const LANDING = { hex: '#0f172a', hsl: '222 47% 11%' } as const;
// Приложение: почти чёрный zinc-950
const APP = { hex: '#09090b', hsl: '240 10% 3.9%' } as const;

const APP_PREFIXES = [
    '/dashboard', '/tests', '/learning', '/games',
    '/profile', '/settings', '/purchase', '/topic',
    '/subtopic', '/test/', '/admin', '/partner',
] as const;

const EXACT_LANDING_PATHS = new Set([
    '/', '/landing', '/landing-ru', '/russia',
    '/landing-es', '/spain', '/login',
    '/auth/callback', '/auth/telegram/callback',
]);

function getThemeForPath(path: string) {
    if (EXACT_LANDING_PATHS.has(path)) return LANDING;
    if (APP_PREFIXES.some(prefix => path.startsWith(prefix))) return APP;
    return LANDING; // По умолчанию — лендинг
}

export const ThemeColorManager = () => {
    const location = useLocation();

    const theme = useMemo(
        () => getThemeForPath(location.pathname),
        [location.pathname]
    );

    useEffect(() => {
        const { hex, hsl } = theme;

        // ── 1. CSS переменная ──────────────────────────────────────────────────
        // Обновляем --background: html и body подхватят через CSS-правила автоматически.
        // Это CSS-натив подход — браузер сам перекрасит все bg-background элементы.
        document.documentElement.style.setProperty('--background', hsl);

        // ── 2. Meta theme-color ──────────────────────────────────────────────
        // Красит адресную строку / вкладку браузера на Android Chrome и Safari iOS.
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', hex);

        // ── 3. Telegram WebApp ───────────────────────────────────────────────
        // Используем window напрямую (обходим проблемы с типами)
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
            try {
                if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(hex);
                if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(hex);
                if (typeof tg.setBottomBarColor === 'function') tg.setBottomBarColor(hex);
            } catch {
                // Telegram может не поддерживать эти методы — игнорируем
            }
        }

        if (import.meta.env.DEV) {
            console.log(`[Chameleon v7] ${location.pathname} → ${hex}`);
        }
    }, [theme, location.pathname]);

    return null;
};
