/**
 * OfflineBanner - Индикатор offline режима
 * 
 * Показывает тонкий sticky banner когда нет интернета.
 * Критично для Telegram Mini App, где связь часто нестабильна.
 */

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineBanner] 🌐 Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineBanner] 📵 Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Не показываем banner если есть сеть
  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 backdrop-blur-xl border-b border-amber-500/20"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-medium text-amber-500 tracking-tight">
        Offline mode. Using cached data.
      </span>
    </div>
  );
};

