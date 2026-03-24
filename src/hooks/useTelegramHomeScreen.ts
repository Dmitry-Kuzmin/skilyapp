import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTelegramWebApp, isVersionAtLeast } from '@/lib/telegram';

type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

/**
 * Управление ярлыком мини-аппа на домашнем экране (Bot API 8.0+).
 */
export function useTelegramHomeScreen() {
  const [status, setStatus] = useState<HomeScreenStatus>('unknown');
  
  // Получаем webApp динамически
  const webApp = useMemo(() => getTelegramWebApp() as any, []);
  
  // Проверка поддержки: Bot API 8.0+ и наличие методов
  const isSupported = useMemo(() => {
    if (!webApp) return false;
    // Обязательно проверяем версию, так как в некоторых клиентах методы могут быть заглушками
    const versionSupported = isVersionAtLeast('8.0');
    const methodsExist = typeof webApp.addToHomeScreen === 'function' && 
                         typeof webApp.checkHomeScreenStatus === 'function';
    
    return versionSupported && methodsExist;
  }, [webApp]);

  useEffect(() => {
    if (!isSupported || !webApp) {
      if (!isSupported) setStatus('unsupported');
      return;
    }

    console.log('[useTelegramHomeScreen] Initializing with isSupported=true');

    const handleChecked = (params: { status: string }) => {
      const s = params?.status as HomeScreenStatus;
      console.log('[useTelegramHomeScreen] homeScreenChecked event:', s);
      setStatus(s || 'unknown');
    };

    const handleAdded = () => {
      console.log('[useTelegramHomeScreen] homeScreenAdded event');
      setStatus('added');
    };

    try {
      webApp.onEvent('homeScreenChecked', handleChecked);
      webApp.onEvent('homeScreenAdded', handleAdded);

      // Запрашиваем статус
      console.log('[useTelegramHomeScreen] Calling checkHomeScreenStatus...');
      webApp.checkHomeScreenStatus();
    } catch (e) {
      console.error('[useTelegramHomeScreen] Setup error:', e);
    }

    // Fallback: если через 5 секунд статус всё ещё 'unknown' — считаем что можно предложить
    const fallback = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'unknown') {
          console.log('[useTelegramHomeScreen] Fallback triggered: status unknown -> missed');
          return 'missed';
        }
        return prev;
      });
    }, 5000);

    return () => {
      clearTimeout(fallback);
      try {
        webApp.offEvent('homeScreenChecked', handleChecked);
        webApp.offEvent('homeScreenAdded', handleAdded);
      } catch (e) {
        // ignore
      }
    };
  }, [isSupported, webApp]);

  const addToHomeScreen = useCallback(() => {
    if (!isSupported || !webApp) {
      console.warn('[useTelegramHomeScreen] Cannot addToHomeScreen: not supported or no webApp');
      return false;
    }

    try {
      console.log('[useTelegramHomeScreen] Calling webApp.addToHomeScreen()...');
      webApp.addToHomeScreen();
      return true;
    } catch (e) {
      console.error('[useTelegramHomeScreen] addToHomeScreen error:', e);
      return false;
    }
  }, [isSupported, webApp]);

  return { status, isSupported, addToHomeScreen };
}
