import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Глобальный компонент для прокрутки наверх при смене роута
 * Работает для всех страниц, включая те, которые не используют Layout
 * Используем агрессивную стратегию сброса скролла для гарантии
 */
export function ScrollToTop() {
    const { pathname, key } = useLocation();

    // Отключаем браузерное восстановление скролла
    useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
    }, []);

    // useLayoutEffect срабатывает ДО рендеринга DOM
    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        // Немедленный сброс
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [pathname, key]);

    // useEffect срабатывает ПОСЛЕ рендеринга DOM (на случай динамического контента)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Сброс сразу после рендеринга
        const resetScroll = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };

        resetScroll();

        // Дополнительный сброс после микрозадач (на случай lazy loading/async данных)
        requestAnimationFrame(() => {
            resetScroll();
        });

        // И ещё один сброс через 50мс (на случай тяжёлых компонентов)
        const timeoutId = setTimeout(resetScroll, 50);

        return () => clearTimeout(timeoutId);
    }, [pathname, key]);

    return null;
}
