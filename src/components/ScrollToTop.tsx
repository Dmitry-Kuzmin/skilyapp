import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Глобальный компонент для прокрутки наверх при смене роута
 * Работает для всех страниц, включая те, которые не используют Layout
 */
export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // ОПТИМИЗАЦИЯ SSG: Проверка window для безопасности
        if (typeof window === 'undefined') return;

        // Используем requestAnimationFrame для плавности и избежания конфликтов с рендерингом
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
    }, [pathname]);

    return null;
}
