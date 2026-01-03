import { useEffect } from 'react';

interface UseTestTimerProps {
    tickTimer: () => void;
}

/**
 * Хук для управления глобальным таймером теста
 * 
 * Тикает каждую секунду и вызывает examStore.tickTimer()
 * Стор сам решает что делать с тиком (countdown/countup)
 */
export const useTestTimer = ({ tickTimer }: UseTestTimerProps) => {
    useEffect(() => {
        const interval = setInterval(() => {
            tickTimer();
        }, 1000);

        return () => clearInterval(interval);
    }, [tickTimer]);
};
