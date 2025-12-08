/**
 * ReconnectHandler - Обрабатывает восстановление соединения с задержкой
 * Предотвращает мерцания при автоматическом refetch всех запросов
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function ReconnectHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let reconnectTimeout: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      // ОПТИМИЗАЦИЯ: Задержка 1 секунда для плавности
      // Это позволяет пользователю увидеть, что соединение восстановлено
      // без мерцания от мгновенного refetch всех запросов
      reconnectTimeout = setTimeout(() => {
        // Refetch только устаревших запросов (stale)
        queryClient.refetchQueries({
          type: 'active',
          stale: true, // Только устаревшие данные
        });
      }, 1000);
    };

    const handleOffline = () => {
      // Отменяем pending refetch если соединение потеряно
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Проверяем начальное состояние
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient]);

  return null;
}

