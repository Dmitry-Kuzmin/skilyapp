/**
 * OfflineBanner - Индикатор offline режима
 * 
 * Показывает sticky banner когда нет интернета.
 * Критично для Telegram Mini App, где связь часто нестабильна.
 */

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Логируем начальное состояние
    console.log('[OfflineBanner] Initial state:', {
      online: navigator.onLine,
      userAgent: navigator.userAgent.substring(0, 50),
    });

    const handleOnline = () => {
      console.log('[OfflineBanner] 🌐 Connection restored');
      setIsOnline(true);
      setJustReconnected(true);
      
      // Убираем индикатор "reconnected" через 3 секунды
      setTimeout(() => {
        setJustReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      console.log('[OfflineBanner] 📵 Connection lost - switching to offline mode');
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

