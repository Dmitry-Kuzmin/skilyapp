import { useState, useEffect, useCallback } from 'react';
import { addToTelegramHomeScreen, checkTelegramHomeScreenStatus, isVersionAtLeast, getTelegramWebApp } from '@/lib/telegram';

type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

/**
 * Управление ярлыком мини-аппа на домашнем экране (Bot API 8.0+).
 *
 * Использование:
 *   const { status, isSupported, addToHomeScreen } = useTelegramHomeScreen();
 *   if (isSupported && status === 'missed') addToHomeScreen();
 */
export function useTelegramHomeScreen() {
  const [status, setStatus] = useState<HomeScreenStatus>('unknown');

  const isSupported = isVersionAtLeast('8.0') && typeof (getTelegramWebApp() as any)?.addToHomeScreen === 'function';

  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    const webApp = getTelegramWebApp() as any;

    const handleChecked = (params: { status: string }) => {
      setStatus((params?.status as HomeScreenStatus) || 'unknown');
    };
    const handleAdded = () => {
      setStatus('added');
    };

    webApp?.onEvent?.('homeScreenChecked', handleChecked);
    webApp?.onEvent?.('homeScreenAdded', handleAdded);

    // Запрашиваем статус сразу
    checkTelegramHomeScreenStatus();

    return () => {
      webApp?.offEvent?.('homeScreenChecked', handleChecked);
      webApp?.offEvent?.('homeScreenAdded', handleAdded);
    };
  }, [isSupported]);

  const addToHomeScreen = useCallback(() => {
    addToTelegramHomeScreen();
  }, []);

  return { status, isSupported, addToHomeScreen };
}
