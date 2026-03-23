import { useEffect } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

/**
 * Автоматически входит в fullscreen при монтировании и выходит при размонтировании.
 * Используется в DuelBattleFullscreen для иммерсивного режима дуэли.
 * Не требует проверки версии — просто проверяем наличие метода.
 */
export function useDuelFullscreen() {
  useEffect(() => {
    const webApp = getTelegramWebApp() as any;
    if (!webApp) return;

    if (typeof webApp.requestFullscreen !== 'function') {
      console.log('[useDuelFullscreen] requestFullscreen не поддерживается этой версией Telegram');
      return;
    }

    try {
      webApp.requestFullscreen();
      console.log('[useDuelFullscreen] ✅ Fullscreen запрошен');
    } catch (e) {
      console.warn('[useDuelFullscreen] requestFullscreen error:', e);
    }

    const handleChanged = () => {
      console.log('[useDuelFullscreen] fullscreenChanged, isFullscreen:', webApp.isFullscreen);
    };
    const handleFailed = () => {
      console.warn('[useDuelFullscreen] fullscreenFailed — устройство не поддерживает');
    };

    webApp.onEvent?.('fullscreenChanged', handleChanged);
    webApp.onEvent?.('fullscreenFailed', handleFailed);

    return () => {
      try {
        if (typeof webApp.exitFullscreen === 'function') {
          webApp.exitFullscreen();
          console.log('[useDuelFullscreen] ✅ Fullscreen завершён');
        }
      } catch (e) {
        console.warn('[useDuelFullscreen] exitFullscreen error:', e);
      }
      webApp.offEvent?.('fullscreenChanged', handleChanged);
      webApp.offEvent?.('fullscreenFailed', handleFailed);
    };
  }, []);
}
