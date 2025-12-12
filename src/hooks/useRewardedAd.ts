import { useState, useCallback } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePremium } from './usePremium';

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
 * Интерфейс для AdsGram SDK (будет реализован после подключения SDK)
 */
interface AdsGramSDK {
  loadRewardedVideo: (unitId: string) => Promise<void>;
  showRewardedVideo: () => Promise<boolean>;
  isLoaded: () => boolean;
  onRewarded: (callback: () => void) => void;
  onError: (callback: (error: any) => void) => void;
}

/**
 * Конфигурация для тестового режима
 */
const TEST_MODE_CONFIG = {
  enabled: true, // Включен по умолчанию для разработки
  testUnitId: 'test_rewarded_video',
  simulateDelay: 2000, // Симулируем задержку загрузки (2 сек)
};

/**
 * Хук для работы с Rewarded Video рекламой (AdsGram)
 * 
 * Поддерживает:
 * - Тестовый режим (для разработки)
 * - Реальный SDK AdsGram (после подключения)
 * - Автоматическую проверку Premium (скрывает рекламу для Premium)
 */
export function useRewardedAd() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdReady, setIsAdReady] = useState(false);
  const { isPremium } = usePremium();

  /**
   * Проверяет, доступна ли реклама для пользователя
   */
  const isAvailable = useCallback(() => {
    // Premium пользователи не видят рекламу
    if (isPremium) {
      return false;
    }

    // В Telegram Mini App реклама доступна
    if (isTelegramMiniApp()) {
      return true;
    }

    // В веб-версии можно показывать рекламу (если будет подключена другая сеть)
    // Пока возвращаем false для веб-версии
    return false;
  }, [isPremium]);

  /**
   * Загружает рекламу (тестовый режим или реальный SDK)
   */
  const loadAd = useCallback(async (unitId?: string): Promise<void> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    setLoading(true);
    setError(null);

    try {
      // ТЕСТОВЫЙ РЕЖИМ: Симулируем загрузку рекламы
      if (TEST_MODE_CONFIG.enabled) {
        await new Promise(resolve => setTimeout(resolve, TEST_MODE_CONFIG.simulateDelay));
        setIsAdReady(true);
        setLoading(false);
        return;
      }

      // РЕАЛЬНЫЙ SDK: Здесь будет интеграция с AdsGram SDK
      // TODO: После получения доступа к AdsGram SDK, раскомментировать:
      /*
      if (typeof window !== 'undefined' && (window as any).AdsGram) {
        const sdk = (window as any).AdsGram as AdsGramSDK;
        const adUnitId = unitId || TEST_MODE_CONFIG.testUnitId;
        await sdk.loadRewardedVideo(adUnitId);
        setIsAdReady(true);
      } else {
        throw new Error('AdsGram SDK не найден');
      }
      */
      
      setLoading(false);
    } catch (err: any) {
      console.error('[useRewardedAd] Error loading ad:', err);
      setError(err.message || 'Не удалось загрузить рекламу');
      setIsAdReady(false);
      setLoading(false);
      throw err;
    }
  }, [isAvailable]);

  /**
   * Показывает рекламу и возвращает Promise, который резолвится при успешном просмотре
   */
  const showAd = useCallback(async (unitId?: string): Promise<boolean> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    // Если реклама не загружена, загружаем её
    if (!isAdReady && !TEST_MODE_CONFIG.enabled) {
      await loadAd(unitId);
    }

    setLoading(true);
    setError(null);

    try {
      // ТЕСТОВЫЙ РЕЖИМ: Симулируем показ рекламы
      if (TEST_MODE_CONFIG.enabled) {
        // Симулируем просмотр видео (3 секунды)
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIsAdReady(false); // После показа нужно перезагрузить
        setLoading(false);
        return true; // Возвращаем success
      }

      // РЕАЛЬНЫЙ SDK: Здесь будет показ реальной рекламы
      // TODO: После получения доступа к AdsGram SDK:
      /*
      if (typeof window !== 'undefined' && (window as any).AdsGram) {
        const sdk = (window as any).AdsGram as AdsGramSDK;
        
        return new Promise((resolve, reject) => {
          sdk.onRewarded(() => {
            setIsAdReady(false); // После показа нужно перезагрузить
            setLoading(false);
            resolve(true);
          });
          
          sdk.onError((error) => {
            setError(error.message || 'Ошибка при показе рекламы');
            setLoading(false);
            reject(error);
          });
          
          sdk.showRewardedVideo();
        });
      }
      */

      throw new Error('SDK не подключен');
    } catch (err: any) {
      console.error('[useRewardedAd] Error showing ad:', err);
      setError(err.message || 'Не удалось показать рекламу');
      setLoading(false);
      throw err;
    }
  }, [isAvailable, isAdReady, loadAd]);

  /**
   * Сбрасывает состояние (полезно при ошибках)
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setIsAdReady(false);
  }, []);

  return {
    loading,
    error,
    isAdReady,
    isAvailable: isAvailable(),
    loadAd,
    showAd,
    reset,
  };
}

