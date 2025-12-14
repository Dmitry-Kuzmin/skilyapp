/**
 * Хук для управления показом Monetag Vignette Banner
 * 
 * Использование:
 * - После завершения теста/дуэли
 * - При первом входе в сессию (опционально)
 * - НЕ показывается в Telegram Mini App
 * - НЕ показывается Premium пользователям
 * - Показывается максимум один раз за сессию
 */

import { useEffect, useRef } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePremium } from './usePremium';

const VIGNETTE_ZONE_ID = '10323401';
const VIGNETTE_SCRIPT_URL = 'https://gizokraijaw.net/vignette.min.js';
const SESSION_STORAGE_KEY = 'monetag_vignette_shown';

/**
 * Проверяет, был ли уже показан Vignette Banner в текущей сессии
 */
function hasVignetteBeenShown(): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
}

/**
 * Помечает Vignette Banner как показанный в текущей сессии
 */
function markVignetteAsShown(): void {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  }
}

/**
 * Загружает и показывает Vignette Banner
 * @param isPremium - флаг премиум статуса пользователя
 */
function showVignetteBanner(isPremium: boolean): void {
  // Не показываем Premium пользователям
  if (isPremium) {
    console.log('[Vignette] Skipping - user has Premium subscription');
    return;
  }

  // Не показываем в Telegram Mini App
  if (isTelegramMiniApp()) {
    console.log('[Vignette] Skipping - running in Telegram Mini App');
    return;
  }

  // Проверяем, был ли уже показан в этой сессии
  if (hasVignetteBeenShown()) {
    console.log('[Vignette] Skipping - already shown in this session');
    return;
  }

  // Проверяем, не загружен ли уже скрипт
  const existingScript = document.querySelector(`script[src="${VIGNETTE_SCRIPT_URL}"]`);
  if (existingScript) {
    console.log('[Vignette] Script already loaded');
    return;
  }

  try {
    // Загружаем скрипт Vignette Banner
    const script = document.createElement('script');
    script.dataset.zone = VIGNETTE_ZONE_ID;
    script.src = VIGNETTE_SCRIPT_URL;
    
    // Добавляем в DOM (Monetag сам обработает показ)
    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (target) {
      target.appendChild(script);
      console.log('[Vignette] ✅ Banner script loaded');
      markVignetteAsShown();
    }
  } catch (error) {
    console.error('[Vignette] Error loading banner:', error);
  }
}

/**
 * Хук для показа Vignette Banner
 * 
 * @param show - показывать ли баннер (например, после завершения теста)
 * @param delay - задержка перед показом в миллисекундах (по умолчанию 500ms)
 */
export function useVignetteBanner(show: boolean, delay: number = 500): void {
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
      // Показываем с задержкой (чтобы не перекрывать результаты сразу)
      timeoutRef.current = setTimeout(() => {
        showVignetteBanner(isPremium);
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
 * Утилита для показа Vignette Banner программно (без хука)
 * @param isPremium - флаг премиум статуса пользователя
 */
export function triggerVignetteBanner(isPremium: boolean, delay: number = 500): void {
  setTimeout(() => {
    showVignetteBanner(isPremium);
  }, delay);
}

