import { useEffect } from 'react';

/**
 * Хук для отложенной инициализации некритичных операций
 * Использует requestIdleCallback для выполнения задач когда браузер "отдохнет"
 * 
 * Решает проблему Long Tasks - тяжелые операции не блокируют UI
 */
export function useIdleInitialization() {
  useEffect(() => {
    // Проверяем поддержку requestIdleCallback
    const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window;
    
    // Fallback для браузеров без requestIdleCallback
    const scheduleIdle = (callback: () => void, timeout = 2000) => {
      if (hasIdleCallback) {
        window.requestIdleCallback(callback, { timeout });
      } else {
        // Fallback: выполняем через setTimeout с задержкой
        setTimeout(callback, 100);
      }
    };

    // Отложенная инициализация некритичных операций
    scheduleIdle(() => {
      // Предзагрузка Paddle SDK (не критично для первого рендера)
      if (import.meta.env.DEV) {
        console.debug('[useIdleInitialization] Preloading non-critical assets...');
      }

      // Инициализация аналитики (не блокирует UI)
      try {
        // Можно добавить другие тяжелые операции здесь
        // Например: preloadHeavyAssets(), initAnalytics(), etc.
      } catch (error) {
        console.warn('[useIdleInitialization] Failed to initialize idle tasks:', error);
      }
    }, 2000); // Максимальная задержка 2 секунды
  }, []);
}

