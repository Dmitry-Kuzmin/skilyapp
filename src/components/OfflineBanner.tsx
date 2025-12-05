/**
 * OfflineBanner - Индикатор offline режима
 * 
 * Показывает sticky banner когда нет интернета.
 * Критично для Telegram Mini App, где связь часто нестабильна.
 * 
 * FIX: Использует useOnlineStatus хук для правильной проверки сети
 * (Safari/WebKit может давать неправильные значения navigator.onLine)
 */

import { useEffect, useState, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const [justReconnected, setJustReconnected] = useState(false);
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    // Отслеживаем изменение статуса с offline на online
    if (!prevOnlineRef.current && isOnline) {
      // Переключились с offline на online
      setJustReconnected(true);
      
      // Убираем индикатор "reconnected" через 3 секунды
      const timeout = setTimeout(() => {
        setJustReconnected(false);
      }, 3000);

      prevOnlineRef.current = isOnline;
      return () => clearTimeout(timeout);
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  // Показываем "reconnected" banner на 3 секунды
  if (justReconnected) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 backdrop-blur-xl border-b border-emerald-500/20 animate-in slide-in-from-top duration-300"
        role="alert"
        aria-live="polite"
      >
        <Wifi className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold text-emerald-500 tracking-tight">
          Connected
        </span>
      </div>
    );
  }

  // Не показываем banner если есть сеть
  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 backdrop-blur-xl border-b border-amber-500/20 animate-in slide-in-from-top duration-300"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 text-amber-500 animate-pulse" />
      <span className="text-xs font-semibold text-amber-500 tracking-tight">
        Offline • Using cached data
      </span>
    </div>
  );
};

