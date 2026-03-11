import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram';

/**
 * ThemeColorManager (Chameleon Protocol v6)
 * 
 * ОПТИМИЗИРОВАНО:
 * 1. Детерминированное определение цветов по роутам (никаких getComputedStyle).
 * 2. Синхронизация --background CSS переменной (Tailwind bg-background).
 * 3. Синхронизация meta theme-color для вкладок браузера.
 * 4. Синхронизация Telegram WebApp (header_color и background_color).
 * 5. Прямое управление html/body для Edge-to-Edge эффекта.
 */

const LANDING_BLUE = '#0f172a';
const LANDING_BLUE_HSL = '222 47% 11.2%';

const DASHBOARD_BLACK = '#09090b';
const DASHBOARD_BLACK_HSL = '240 10% 3.9%';

const ROUTE_COLOR_MAP: Record<string, { hex: string; hsl: string }> = {
    // Лендинги
    '/': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/landing': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/landing-ru': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/russia': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/landing-es': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/spain': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    
    // Авторизация
    '/login': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/auth/callback': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
    '/auth/telegram/callback': { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL },
};

export const ThemeColorManager = () => {
    const location = useLocation();

    // Определяем основной цвет темы для текущего пути
    const themeData = useMemo(() => {
        const path = location.pathname;
        
        // 1. Проверяем точное совпадение
        if (ROUTE_COLOR_MAP[path]) return ROUTE_COLOR_MAP[path];
        
        // 2. Если это /dashboard или любая внутренняя страница приложения — DASHBOARD_BLACK
        if (path.startsWith('/dashboard') || 
            path.startsWith('/tests') || 
            path.startsWith('/learning') || 
            path.startsWith('/games') || 
            path.startsWith('/profile') ||
            path.startsWith('/settings') ||
            path.startsWith('/purchase')) {
            return { hex: DASHBOARD_BLACK, hsl: DASHBOARD_BLACK_HSL };
        }

        // 3. По умолчанию для всех остальных страниц (включая 404 на лендинге)
        return { hex: LANDING_BLUE, hsl: LANDING_BLUE_HSL };
    }, [location.pathname]);

    useEffect(() => {
        const { hex: color, hsl } = themeData;

        // КРИТИЧНО: Обновляем CSS-переменную --background для Tailwind
        // Это заставляет все компоненты с bg-background адаптироваться мгновенно
        document.documentElement.style.setProperty('--background', hsl);
        
        // КРИТИЧНО: Устанавливаем фон для html и body (предотвращает белые полосы при скролле)
        document.documentElement.style.backgroundColor = color;
        document.body.style.backgroundColor = color;

        // СИНХРОНИЗАЦИЯ: Meta Theme Color (цвет вкладки в браузере)
        const updateMeta = (name: string, value: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', value);
        };

        updateMeta('theme-color', color);
        updateMeta('msapplication-TileColor', color);
        updateMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

        // СИНХРОНИЗАЦИЯ: Telegram WebApp UI
        if (isTelegramMiniApp()) {
            const tg = getTelegramWebApp();
            if (tg) {
                try {
                    // Устанавливаем цвета для UI Telegram
                    if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(color as any);
                    if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(color as any);
                    
                    // Сообщаем Telegram о смене темы (важно для некоторых версий)
                    if (tg.setBottomBarColor) {
                        tg.setBottomBarColor(color);
                    }
                } catch (e) {
                    console.warn('[ThemeColorManager] Failed to sync with Telegram UI:', e);
                }
            }
        }

        // КРИТИЧНО: Логируем для отладки в dev
        if (import.meta.env.DEV) {
            console.log(`[Chameleon] Theme synchronized: ${location.pathname} -> ${color} (${hsl})`);
        }

    }, [themeData, location.pathname]);

    return null;
};
