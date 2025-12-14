import { useState, useCallback, useEffect } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePremium } from './usePremium';
import { initAdsGram, showAdsGramRewardedVideo } from '@/lib/adsgram';
import { initMonetag, initMonetagTMA, showMonetagRewardedVideo, showMonetagRewardedVideoTMA } from '@/lib/monetag';

/**
 * Типы наград за просмотр рекламы
 */
export type RewardType = 
  | 'coins'           // Монеты
  | 'restore_streak'  // Восстановление streak
  | 'test_attempt';   // Дополнительная попытка теста

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

  // Инициализация SDK при монтировании
  useEffect(() => {
    if (!isAvailable()) {
      return;
    }

    // В Telegram Mini App используем AdsGram и Monetag (оба для fallback)
    if (isTelegramMiniApp()) {
      // Инициализируем AdsGram
      const checkAdsGramSDK = () => {
        if (typeof window !== 'undefined' && window.Adsgram) {
          initAdsGram();
        } else {
          // Проверяем каждые 100мс до 5 секунд
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (window.Adsgram || attempts > 50) {
              clearInterval(interval);
              if (window.Adsgram) {
                initAdsGram();
              }
            }
          }, 100);
        }
      };

      // Инициализируем Monetag для TMA
      initMonetagTMA();

      // Если DOM уже загружен
      if (document.readyState === 'complete') {
        checkAdsGramSDK();
      } else {
        window.addEventListener('load', checkAdsGramSDK);
        return () => window.removeEventListener('load', checkAdsGramSDK);
      }
    } else {
      // В веб-версии используем Monetag
      initMonetag();
    }
  }, [isAvailable]);

  /**
   * Показывает рекламу и возвращает Promise, который резолвится при успешном просмотре
   */
  const showAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    setLoading(true);
    setError(null);

    try {
      let rewarded: boolean;
      
      // В Telegram Mini App используем Monetag Rewarded Interstitial (приоритет) или AdsGram (fallback)
      if (isTelegramMiniApp()) {
        try {
          // Пробуем Monetag Rewarded Interstitial (возвращает Promise)
          rewarded = await showMonetagRewardedVideoTMA();
        } catch (monetagError: any) {
          console.warn('[useRewardedAd] Monetag TMA failed, trying AdsGram fallback:', monetagError);
          // Fallback на AdsGram, если Monetag не работает
          rewarded = await showAdsGramRewardedVideo();
        }
      } else {
        // В веб-версии используем Monetag Native Banner
        rewarded = await showMonetagRewardedVideo();
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
    reset,
  };
}
