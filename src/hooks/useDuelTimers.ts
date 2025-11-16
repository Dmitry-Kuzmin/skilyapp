import { useEffect, useRef, useCallback } from 'react';

/**
 * Унифицированный хук для управления таймерами
 * Автоматически очищает все таймеры при размонтировании компонента
 */
export function useDuelTimers() {
  const timersRef = useRef<Set<ReturnType<typeof window.setTimeout>>>(new Set());
  const intervalsRef = useRef<Set<ReturnType<typeof window.setInterval>>>(new Set());

  // Создать таймер с автоматической очисткой
  const setTimeout = useCallback((callback: () => void, delay: number): ReturnType<typeof window.setTimeout> => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // Создать интервал с автоматической очисткой
  const setInterval = useCallback((callback: () => void, delay: number): ReturnType<typeof window.setInterval> => {
    const interval = window.setInterval(callback, delay);
    intervalsRef.current.add(interval);
    return interval;
  }, []);

  // Очистить конкретный таймер
  const clearTimeout = useCallback((timer: ReturnType<typeof window.setTimeout>) => {
    window.clearTimeout(timer);
    timersRef.current.delete(timer);
  }, []);

  // Очистить конкретный интервал
  const clearInterval = useCallback((interval: ReturnType<typeof window.setInterval>) => {
    window.clearInterval(interval);
    intervalsRef.current.delete(interval);
  }, []);

  // Очистить все таймеры
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // Очистить все интервалы
  const clearAllIntervals = useCallback(() => {
    intervalsRef.current.forEach(interval => window.clearInterval(interval));
    intervalsRef.current.clear();
  }, []);

  // Очистить все таймеры и интервалы
  const clearAll = useCallback(() => {
    clearAllTimers();
    clearAllIntervals();
  }, [clearAllTimers, clearAllIntervals]);

  // Автоматическая очистка при размонтировании
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    clearAllTimers,
    clearAllIntervals,
    clearAll,
  };
}

