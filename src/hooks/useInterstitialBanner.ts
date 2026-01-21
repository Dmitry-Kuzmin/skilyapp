/**
 * Хук для управления показом Monetag Native Banner (Interstitial)
 * 
 * Использование:
 * - При переходе между разделами (Tests -> Games, Games -> Duel)
 * - После закрытия результатов теста/дуэли (при возврате на дашборд)
 * - При первом входе (опционально)
 * - НЕ показывается в Telegram Mini App
 * - НЕ показывается Premium пользователям
 * - Показывается максимум один раз за сессию
 */

import { useEffect, useRef } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePremium } from './usePremium';

const INTERSTITIAL_ZONE_ID = '10323437';
const INTERSTITIAL_SCRIPT_URL = 'https://groleegni.net/vignette.min.js';
const SESSION_STORAGE_KEY = 'monetag_interstitial_shown';

/**
 * Проверяет, был ли уже показан Interstitial Banner в текущей сессии
 */
function hasInterstitialBeenShown(): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
}

/**
 * Помечает Interstitial Banner как показанный в текущей сессии
 */
function markInterstitialAsShown(): void {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  }
}

/**
 * Загружает и показывает Interstitial Banner
 * @param isPremium - флаг премиум статуса пользователя
 */
function showInterstitialBanner(isPremium: boolean): void {
  // Не показываем Premium пользователям
  if (isPremium) {
    console.log('[Interstitial] Skipping - user has Premium subscription');
    return;
  }

  // Не показываем на localhost (чтобы не мешать разработке и не ломать IndexedDB)
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    console.log('[Interstitial] Skipping - localhost development environment');
    return;
  }

  // Не показываем в Telegram Mini App
  if (isTelegramMiniApp()) {
    console.log('[Interstitial] Skipping - running in Telegram Mini App');
    return;
  }

  // Проверяем, был ли уже показан в этой сессии
  if (hasInterstitialBeenShown()) {
    console.log('[Interstitial] Skipping - already shown in this session');
    return;
  }

  // Проверяем, не загружен ли уже скрипт
  const existingScript = document.querySelector(`script[src="${INTERSTITIAL_SCRIPT_URL}"]`);
  if (existingScript) {
    console.log('[Interstitial] Script already loaded');
    return;
  }

  try {
    // Загружаем скрипт Interstitial Banner
    const script = document.createElement('script');
    script.dataset.zone = INTERSTITIAL_ZONE_ID;
    script.src = INTERSTITIAL_SCRIPT_URL;

    // Добавляем в DOM (Monetag сам обработает показ)
    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (target) {
      target.appendChild(script);
      console.log('[Interstitial] ✅ Banner script loaded');
      markInterstitialAsShown();
    }
  } catch (error) {
    console.error('[Interstitial] Error loading banner:', error);
  }
}

/**
 * Хук для показа Interstitial Banner
 * 
 * @param show - показывать ли баннер (например, при переходе между разделами)
 * @param delay - задержка перед показом в миллисекундах (по умолчанию 300ms)
 */
export function useInterstitialBanner(show: boolean, delay: number = 300): void {
  const { isPremium } = usePremium();
  const hasShownRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Очищаем предыдущий timeout при изменении show
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Не показываем Premium пользователям
    if (isPremium) {
      return;
    }

    if (show && !hasShownRef.current) {
      // Показываем с задержкой (чтобы переход был плавным)
      timeoutRef.current = setTimeout(() => {
        showInterstitialBanner(isPremium);
        hasShownRef.current = true;
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, delay, isPremium]);
}

/**
 * Утилита для показа Interstitial Banner программно (без хука)
 * @param isPremium - флаг премиум статуса пользователя
 */
export function triggerInterstitialBanner(isPremium: boolean, delay: number = 300): void {
  setTimeout(() => {
    showInterstitialBanner(isPremium);
  }, delay);
}


