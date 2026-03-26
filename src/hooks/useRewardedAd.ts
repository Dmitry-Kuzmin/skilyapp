import { useState, useCallback, useEffect } from 'react';
import { isTelegramMiniApp, getTelegramUser, getTelegramWebApp, isTelegramMobilePlatformName } from '@/lib/telegram';
import { usePremium } from './usePremium';
import { initAdsGram, showAdsGramRewardedVideo } from '@/lib/adsgram';
import { initMonetag, showMonetagRewardedVideo } from '@/lib/monetag';
import { initAdSenseH5, showAdSenseRewardedVideo } from '@/lib/adsense';
import { useUserContext } from '@/contexts/UserContext';

/**
 * Типы наград за просмотр рекламы
 */
export type RewardType =
  | 'coins'           // Монеты
  | 'restore_streak'  // Восстановление streak
  | 'test_attempt'    // Дополнительная попытка теста
  | 'slot_unlock';    // Разблокировка слота

export interface RewardConfig {
  type: RewardType;
  amount?: number; // Для монет
}

/**
 * Хук для работы с Rewarded Video рекламой (AdsGram)
 * 
 * Поддерживает:
 * - Реальный SDK AdsGram
 * - Автоматическую проверку Premium (скрывает рекламу для Premium)
 */
export function useRewardedAd() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPremium } = usePremium();
  const { profileId } = useUserContext();

  /**
   * Проверяет, доступна ли реклама для пользователя
   */
  const isAvailable = useCallback(() => {
    // Premium пользователи не видят рекламу
    if (isPremium) {
      return false;
    }

    // В Telegram Mini App реклама доступна (AdsGram)
    if (isTelegramMiniApp()) {
      return true;
    }

    // В веб-версии используем Monetag Rewarded Interstitial
    return true;
  }, [isPremium]);

  // Инициализация SDK при монтировании (необязательно, но полезно для прогрева)
  useEffect(() => {
    if (!isAvailable()) {
      return;
    }

    const webApp = getTelegramWebApp();
    const isMobileTMA = isTelegramMiniApp() && isTelegramMobilePlatformName(webApp?.platform);

    if (isMobileTMA) {
      const tgUser = getTelegramUser();
      const userId = tgUser?.id?.toString();
      initAdsGram(userId).catch(console.error);
    } else {
      // Monetag disabled — SDK script not loaded, causes console spam
      // initMonetag();
      initAdSenseH5();
    }
  }, [isAvailable]);

  /**
   * Показывает рекламу и возвращает Promise, который резолвится при успешном просмотре
   * @param placement - Название места размещения (например, 'crypto-miner')
   */
  const showAd = useCallback(async (placement?: string): Promise<boolean> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    setLoading(true);
    setError(null);

    // КРИТИЧНО: Крик в консоль для отладки кеша
    console.log("%c !!! AD SHOW ATTEMPT !!! ", "background: #f59e0b; color: #000; font-weight: bold; font-size: 14px;");
    console.log(`[useRewardedAd] 🛡️ showAd triggered for placement: "${placement}"`);

    try {
      let rewarded: boolean;

      const webApp = getTelegramWebApp();
      // Проверяем платформу. Если это десктоп (даже через Telegram Desktop), используем AdSense
      const isMobileTMA = isTelegramMiniApp() && isTelegramMobilePlatformName(webApp?.platform);

      console.log(`[useRewardedAd] Environment check: isMobileTMA=${isMobileTMA}, platform=${webApp?.platform || 'web'}`);

      // В Telegram Mini App на МОБИЛЬНЫХ используем AdsGram (официальный партнер)
      if (isMobileTMA) {
        console.log('[useRewardedAd] 📱 Using AdsGram (Mobile TMA)');
        const tgUser = getTelegramUser();
        const userId = tgUser?.id?.toString();
        rewarded = await showAdsGramRewardedVideo(userId);
      } else {
        // В ВЕБ-ВЕРСИИ ИЛИ НА ДЕСКТОПЕ (включая Telegram Desktop)
        // Для Криптомайнера всегда используем Google AdSense H5
        if (placement?.toLowerCase() === 'crypto-miner') {
          console.log('[useRewardedAd] 💻 Attempting Google AdSense H5 (Desktop/Web)');
          rewarded = await showAdSenseRewardedVideo({ name: 'crypto-miner' });
          console.log(`[useRewardedAd] AdSense Result: ${rewarded}`);
        } else {
          // Monetag disabled — fallback to AdSense for all placements
          console.log('[useRewardedAd] 💻 Using AdSense H5 (fallback, Monetag disabled)');
          rewarded = await showAdSenseRewardedVideo({ name: placement || 'default' });
        }
      }

      setLoading(false);
      return rewarded;
    } catch (err: any) {
      console.error('[useRewardedAd] Error showing ad:', err);

      // Обработка специфических ошибок
      let errorMessage = err.message || 'Не удалось показать рекламу';

      // AdBlock ошибка (Monetag)
      if (err.isAdBlockError || err.message?.includes('AdBlock')) {
        errorMessage = 'AdBlock заблокировал рекламу. Отключите AdBlock, чтобы получить награду.';
        // Если мы в Telegram, уточняем сообщение
        if (isTelegramMiniApp()) {
          errorMessage = 'Ошибка загрузки рекламного модуля. Пожалуйста, убедитесь, что у вас стабильное интернет-соединение и попробуйте еще раз.';
        }
      }
      // NotAllowedError - автовоспроизведение заблокировано (AdsGram)
      else if (err.message?.includes('not allowed') || err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        errorMessage = 'Браузер заблокировал автовоспроизведение. Пожалуйста, нажмите на кнопку еще раз после взаимодействия со страницей.';
      }

      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [isAvailable]);

  /**
   * Сбрасывает состояние (полезно при ошибках)
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    isAvailable: isAvailable(),
    showAd,
    preload: useCallback(() => {
      if (isAvailable() && !isTelegramMobilePlatformName(getTelegramWebApp()?.platform)) {
        showMonetagRewardedVideo({ ymid: profileId || undefined, type: 'preload' }).catch(() => { });
      }
    }, [isAvailable, profileId]),
    reset,
  };
}
