import { useState, useEffect, useCallback } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

/**
 * Управление ярлыком мини-аппа на домашнем экране (Bot API 8.0+).
 * Не требует проверки версии — просто проверяем наличие методов.
 */
export function useTelegramHomeScreen() {
  const webApp = getTelegramWebApp() as any;
  const isSupported = typeof webApp?.addToHomeScreen === 'function';

  const [status, setStatus] = useState<HomeScreenStatus>(isSupported ? 'unknown' : 'unsupported');

  useEffect(() => {
    if (!isSupported) return;

    const handleChecked = (params: { status: string }) => {
      const s = params?.status as HomeScreenStatus;
      console.log('[useTelegramHomeScreen] homeScreenChecked:', s);
      setStatus(s || 'unknown');
    };
    const handleAdded = () => {
      console.log('[useTelegramHomeScreen] homeScreenAdded');
      setStatus('added');
    };

    webApp?.onEvent?.('homeScreenChecked', handleChecked);
    webApp?.onEvent?.('homeScreenAdded', handleAdded);

    // Запрашиваем статус
    try {
      webApp?.checkHomeScreenStatus?.();
    } catch (e) {
      console.warn('[useTelegramHomeScreen] checkHomeScreenStatus error:', e);
    }

    // Fallback: если через 5 секунд статус всё ещё 'unknown' (событие не пришло
    // или Telegram вернул unknown) — считаем что приложение ещё не добавлено
    const fallback = setTimeout(() => {
      setStatus(prev => prev === 'unknown' ? 'missed' : prev);
    }, 5000);

    return () => {
      clearTimeout(fallback);
      webApp?.offEvent?.('homeScreenChecked', handleChecked);
      webApp?.offEvent?.('homeScreenAdded', handleAdded);
    };
  }, [isSupported]);

  const addToHomeScreen = useCallback(() => {
    try {
      webApp?.addToHomeScreen?.();
    } catch (e) {
      console.warn('[useTelegramHomeScreen] addToHomeScreen error:', e);
    }
  }, [webApp]);

  return { status, isSupported, addToHomeScreen };
}
