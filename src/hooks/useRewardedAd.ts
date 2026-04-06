import { useState, useCallback, useEffect } from 'react';
import { isTelegramMiniApp, getTelegramUser, getTelegramWebApp, isTelegramMobilePlatformName } from '@/lib/telegram';
import { usePremium } from './usePremium';
import { initAdsGram, showAdsGramRewardedVideo } from '@/lib/adsgram';
import { useUserContext } from '@/contexts/UserContext';

export type RewardType =
  | 'coins'
  | 'restore_streak'
  | 'test_attempt'
  | 'slot_unlock';

export interface RewardConfig {
  type: RewardType;
  amount?: number;
}

export function useRewardedAd() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPremium } = usePremium();
  const { profileId } = useUserContext();

  const isAvailable = useCallback(() => {
    if (isPremium) return false;
    if (isTelegramMiniApp()) return true;
    return false;
  }, [isPremium]);

  useEffect(() => {
    if (!isAvailable()) return;

    const webApp = getTelegramWebApp();
    const isMobileTMA = isTelegramMiniApp() && isTelegramMobilePlatformName(webApp?.platform);

    if (isMobileTMA) {
      const tgUser = getTelegramUser();
      const userId = tgUser?.id?.toString();
      initAdsGram(userId).catch(console.error);
    }
  }, [isAvailable]);

  const showAd = useCallback(async (placement?: string): Promise<boolean> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    setLoading(true);
    setError(null);

    try {
      const webApp = getTelegramWebApp();
      const isMobileTMA = isTelegramMiniApp() && isTelegramMobilePlatformName(webApp?.platform);

      if (!isMobileTMA) {
        setLoading(false);
        return false;
      }

      const tgUser = getTelegramUser();
      const userId = tgUser?.id?.toString();
      const rewarded = await showAdsGramRewardedVideo(userId);

      setLoading(false);
      return rewarded;
    } catch (err: any) {
      console.error('[useRewardedAd] Error showing ad:', err);

      let errorMessage = err.message || 'Не удалось показать рекламу';

      if (err.message?.includes('not allowed') || err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        errorMessage = 'Браузер заблокировал автовоспроизведение. Пожалуйста, нажмите на кнопку ещё раз.';
      }

      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [isAvailable]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    isAvailable: isAvailable(),
    showAd,
    preload: useCallback(() => {}, []),
    reset,
  };
}
