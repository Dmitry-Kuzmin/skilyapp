/**
 * useOnlineStatus - Хук для определения статуса интернет-соединения
 *
 * Использует только события браузера (online/offline) без periodic ping,
 * чтобы не генерировать лишние Edge Requests на Vercel.
 *
 * @returns {boolean} isOnline - true если есть соединение
 */

import { useState, useEffect, useCallback } from 'react';

// Глобальный кэш статуса для всех компонентов
let globalOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set<(status: boolean) => void>();

// Функция для уведомления всех слушателей
const notifyListeners = (status: boolean) => {
  globalOnlineStatus = status;
  listeners.forEach(listener => listener(status));
};

/**
 * Реальная проверка соединения (только по требованию)
 * НЕ вызывается периодически — только при событиях браузера
 */
export async function checkOnlineStatus(): Promise<boolean> {
  return globalOnlineStatus;
}

/**
 * Хук для использования в компонентах
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(globalOnlineStatus);

  const updateStatus = useCallback((status: boolean) => {
    setIsOnline(status);
  }, []);

  useEffect(() => {
    // Подписываемся на глобальные изменения
    listeners.add(updateStatus);

    const handleOnline = () => {
      if (!globalOnlineStatus) {
        notifyListeners(true);
      }
    };

    const handleOffline = () => {
      if (globalOnlineStatus) {
        notifyListeners(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      listeners.delete(updateStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus]);

  return isOnline;
}
