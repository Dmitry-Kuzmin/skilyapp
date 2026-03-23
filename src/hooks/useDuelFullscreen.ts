import { useEffect } from 'react';
import { requestTelegramFullscreen, exitTelegramFullscreen, isVersionAtLeast, getTelegramWebApp } from '@/lib/telegram';

/**
 * Автоматически входит в fullscreen при монтировании компонента и выходит при размонтировании.
 * Используется в DuelBattleFullscreen для иммерсивного режима дуэли.
 * Требует Bot API 8.0+.
 */
export function useDuelFullscreen() {
  useEffect(() => {
    if (!isVersionAtLeast('8.0')) return;

    const entered = requestTelegramFullscreen();
    if (entered) {
      console.log('[useDuelFullscreen] ✅ Fullscreen activated for duel');
    }

    const webApp = getTelegramWebApp() as any;
    const handleFullscreenChanged = () => {
      console.log('[useDuelFullscreen] fullscreenChanged, isFullscreen:', webApp?.isFullscreen);
    };
    const handleFullscreenFailed = () => {
      console.warn('[useDuelFullscreen] fullscreenFailed — device may not support it');
    };

    webApp?.onEvent?.('fullscreenChanged', handleFullscreenChanged);
    webApp?.onEvent?.('fullscreenFailed', handleFullscreenFailed);

    return () => {
      exitTelegramFullscreen();
      webApp?.offEvent?.('fullscreenChanged', handleFullscreenChanged);
      webApp?.offEvent?.('fullscreenFailed', handleFullscreenFailed);
    };
  }, []);
}
