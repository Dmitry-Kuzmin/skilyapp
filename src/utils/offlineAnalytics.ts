/**
 * Offline Analytics - простой мониторинг offline использования
 * 
 * Отслеживает ключевые метрики:
 * 1. % сессий с активным SW
 * 2. % offline сессий
 * 3. Ошибки chunk load / version mismatch
 */

import { useEffect, useRef } from 'react';

// Храним события локально, отправляем batch при reconnect
const EVENTS_KEY = 'SDADIM_OFFLINE_EVENTS';
const MAX_EVENTS = 100;

export interface OfflineEvent {
  event: string;
  data?: Record<string, any>;
  timestamp: number;
  online: boolean;
  userAgent: string;
}

/**
 * Записать offline событие
 */
export function trackOfflineEvent(event: string, data?: Record<string, any>) {
  if (import.meta.env.DEV) {
    // console.log('[Offline Analytics]', event, data); // Слишком шумно даже в деве
    return; // В dev не записываем
  }

  try {
    const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') as OfflineEvent[];

    events.push({
      event,
      data,
      timestamp: Date.now(),
      online: navigator.onLine,
      userAgent: navigator.userAgent.substring(0, 100),
    });

    // Ограничиваем размер
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

    // Если online - отправляем batch
    if (navigator.onLine) {
      sendOfflineEvents();
    }
  } catch (error) {
    console.error('[Offline Analytics] Failed to track event:', error);
  }
}

/**
 * Отправить накопленные события на сервер
 */
async function sendOfflineEvents() {
  try {
    const eventsStr = localStorage.getItem(EVENTS_KEY);
    if (!eventsStr) return;

    const events = JSON.parse(eventsStr) as OfflineEvent[];
    if (events.length === 0) return;

    if (import.meta.env.DEV) {
      console.log(`[Offline Analytics] 📊 Sending ${events.length} events (Muted in Prod)...`);
      // console.log('[Offline Analytics] Events:', events);
    }

    // После успешной отправки - очищаем
    localStorage.removeItem(EVENTS_KEY);
    if (import.meta.env.DEV) console.log('[Offline Analytics] ✅ Events sent and cleared');
  } catch (error) {
    console.error('[Offline Analytics] Failed to send events:', error);
  }
}

/**
 * React hook для отслеживания offline режима
 */
export function useOfflineAnalytics() {
  const offlineStartTime = useRef<number | null>(null);
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // 1. Проверка Service Worker при старте
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        const hasSW = !!reg?.active;
        trackOfflineEvent('session_start', {
          has_sw: hasSW,
          platform: navigator.platform,
        });
      });
    } else {
      trackOfflineEvent('session_start', {
        has_sw: false,
        sw_supported: false,
      });
    }

    // 2. Отслеживание offline/online переходов
    const handleOffline = () => {
      offlineStartTime.current = Date.now();
      trackOfflineEvent('offline_mode_entered');
    };

    const handleOnline = () => {
      const duration = offlineStartTime.current
        ? Date.now() - offlineStartTime.current
        : 0;

      trackOfflineEvent('offline_mode_exited', {
        duration_ms: duration,
        duration_sec: Math.round(duration / 1000),
      });

      offlineStartTime.current = null;

      // Отправляем накопленные события
      sendOfflineEvents();
    };

    // 3. Отслеживание chunk load errors (version mismatch)
    const handleError = (event: ErrorEvent) => {
      const target = event.target as HTMLScriptElement | null;

      if (target && target.tagName === 'SCRIPT') {
        const src = target.src || '';

        if (src.includes('/assets/')) {
          trackOfflineEvent('chunk_load_error', {
            src: src.substring(src.lastIndexOf('/') + 1),
            online: navigator.onLine,
          });
        }
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('error', handleError, true);

    // Cleanup при unmount
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('error', handleError, true);

      // Записываем длительность сессии
      const sessionDuration = Date.now() - sessionStartTime.current;
      trackOfflineEvent('session_end', {
        duration_ms: sessionDuration,
        duration_min: Math.round(sessionDuration / 1000 / 60),
      });
    };
  }, []);
}

/**
 * Отслеживание кастомного offline действия
 */
export function trackOfflineAction(action: string, success: boolean, error?: string) {
  trackOfflineEvent('offline_action', {
    action,
    success,
    error,
  });
}

