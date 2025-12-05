/**
 * useOnlineStatus - Хук для определения статуса интернет-соединения
 * 
 * КРИТИЧНО: Не доверяет navigator.onLine (Safari/WebKit bug)
 * Делает реальную проверку соединения через ping запросы
 * 
 * @returns {boolean} isOnline - true если есть реальное соединение
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Глобальный кэш статуса для всех компонентов
let globalOnlineStatus = true;
const listeners = new Set<(status: boolean) => void>();

// Функция для уведомления всех слушателей
const notifyListeners = (status: boolean) => {
  globalOnlineStatus = status;
  listeners.forEach(listener => listener(status));
};

// Флаг проверки (чтобы не делать параллельные проверки)
let isChecking = false;
let lastCheckTime = 0;
const CHECK_COOLDOWN = 2000; // 2 секунды между проверками

/**
 * Реальная проверка соединения
 * Shared между всеми компонентами
 */
const checkRealConnection = async (): Promise<boolean> => {
  // Избегаем параллельных проверок
  const now = Date.now();
  if (isChecking || (now - lastCheckTime < CHECK_COOLDOWN)) {
    return globalOnlineStatus;
  }

  isChecking = true;
  lastCheckTime = now;

  try {
    // Пытаемся сделать HEAD запрос
    // Используем timestamp чтобы избежать кэша
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды

    const response = await fetch('/?ping=' + Date.now(), {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    isChecking = false;
    
    // Если получили ответ - сеть есть
    const online = response.ok || response.status < 500;
    if (online !== globalOnlineStatus) {
      notifyListeners(online);
    }
    return online;
  } catch (error) {
    isChecking = false;
    
    // При ошибке не спешим объявлять offline
    // Может быть временная проблема
    // Объявляем offline только если было несколько неудач подряд
    return globalOnlineStatus;
  }
};

/**
 * Хук для использования в компонентах
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(globalOnlineStatus);
  const checkTimeoutRef = useRef<number>();

  const updateStatus = useCallback((status: boolean) => {
    setIsOnline(status);
  }, []);

  useEffect(() => {
    // Подписываемся на глобальные изменения
    listeners.add(updateStatus);

    // Делаем начальную проверку
    checkRealConnection().then(updateStatus);

    const handleOnline = async () => {
      const realOnline = await checkRealConnection();
      if (realOnline && !globalOnlineStatus) {
        console.log('[useOnlineStatus] 🌐 Connection restored (verified)');
        notifyListeners(true);
      }
    };

    const handleOffline = async () => {
      // Даже если navigator говорит offline, проверяем реальное соединение
      // Safari/WebKit может врать
      const realOnline = await checkRealConnection();
      if (!realOnline && globalOnlineStatus) {
        console.log('[useOnlineStatus] 📵 Connection lost (verified)');
        notifyListeners(false);
      } else if (realOnline) {
        console.log('[useOnlineStatus] ⚠️ Navigator says offline but connection works (Safari bug)');
        notifyListeners(true);
      }
    };

    // Слушаем события браузера
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // КРИТИЧНО: Периодическая проверка для Safari
    // Где события могут не срабатывать при переключении роутов
    checkTimeoutRef.current = window.setInterval(() => {
      checkRealConnection();
    }, 15000); // Проверяем каждые 15 секунд

    return () => {
      listeners.delete(updateStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkTimeoutRef.current) {
        clearInterval(checkTimeoutRef.current);
      }
    };
  }, [updateStatus]);

  return isOnline;
}

/**
 * Функция для ручной проверки статуса
 * Полезна для компонентов которым нужна проверка по требованию
 */
export async function checkOnlineStatus(): Promise<boolean> {
  return checkRealConnection();
}

