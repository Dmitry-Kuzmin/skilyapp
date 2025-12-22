/**
 * Smart Dynamic Header Hook
 * 
 * Поведение:
 * - Скролл ВНИЗ > 150px → хедер плавно уезжает вверх
 * - Скролл ВВЕРХ → хедер мгновенно выезжает обратно
 * - При прокрутке > 10px → включается стеклянный эффект
 */
import { useState, useEffect, useCallback } from 'react';

interface SmartHeaderState {
    /** Хедер скрыт (уехал вверх) */
    hidden: boolean;
    /** Контент прокручен (нужен стеклянный эффект) */
    isScrolled: boolean;
    /** Текущая позиция скролла */
    scrollY: number;
}

interface UseSmartHeaderOptions {
    /** Порог для скрытия хедера при скролле вниз (default: 150) */
    hideThreshold?: number;
    /** Порог для включения стеклянного эффекта (default: 10) */
    glassThreshold?: number;
    /** Отключить smart поведение (хедер всегда виден) */
    disabled?: boolean;
}

export function useSmartHeader(options: UseSmartHeaderOptions = {}): SmartHeaderState {
    const {
        hideThreshold = 150,
        glassThreshold = 10,
        disabled = false,
    } = options;

    const [hidden, setHidden] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [scrollY, setScrollY] = useState(0);
    const [prevScrollY, setPrevScrollY] = useState(0);

    const handleScroll = useCallback(() => {
        if (disabled) {
            setHidden(false);
            setIsScrolled(false);
            return;
        }

        const currentScrollY = window.scrollY;

        // 1. Стеклянный эффект: включаем если прокрутили > glassThreshold px
        setIsScrolled(currentScrollY > glassThreshold);

        // 2. Логика скрытия хедера
        // Скроллим вниз И прокрутили уже больше hideThreshold px → скрываем
        if (currentScrollY > prevScrollY && currentScrollY > hideThreshold) {
            setHidden(true);
        }
        // Скроллим вверх → показываем
        else if (currentScrollY < prevScrollY) {
            setHidden(false);
        }

        setScrollY(currentScrollY);
        setPrevScrollY(currentScrollY);
    }, [disabled, hideThreshold, glassThreshold, prevScrollY]);

    useEffect(() => {
        // Начальное состояние
        handleScroll();

        // Используем passive для производительности
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);

    return { hidden, isScrolled, scrollY };
}

export default useSmartHeader;
