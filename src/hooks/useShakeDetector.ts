import { useEffect, useRef, useCallback } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

interface ShakeDetectorOptions {
  /** Порог ускорения для определения встряхивания (м/с²). По умолчанию 15. */
  threshold?: number;
  /** Минимальный интервал между срабатываниями (мс). По умолчанию 1000. */
  cooldown?: number;
  /** Использовать Telegram Gyroscope API если доступен. По умолчанию true. */
  preferTelegramApi?: boolean;
}

/**
 * Определяет встряхивание телефона и вызывает callback.
 *
 * Стратегия:
 * 1. Telegram Gyroscope API (Bot API 8.0) — если доступен
 * 2. DeviceMotionEvent (стандартный Web API) — fallback
 *
 * Использование:
 *   useShakeDetector(() => openRandomQuestion(), { threshold: 15 });
 */
export function useShakeDetector(
  onShake: () => void,
  options: ShakeDetectorOptions = {}
) {
  const { threshold = 15, cooldown = 1500, preferTelegramApi = true } = options;
  const lastShakeRef = useRef(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const tryFire = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeRef.current < cooldown) return;
    lastShakeRef.current = now;
    onShakeRef.current();
  }, [cooldown]);

  useEffect(() => {
    const webApp = getTelegramWebApp() as any;
    let usedTelegramApi = false;

    // ─── Telegram Accelerometer API (Bot API 8.0) ────────────────────────────
    if (preferTelegramApi && webApp?.Accelerometer) {
      const acc = webApp.Accelerometer;
      let prevX = 0, prevY = 0, prevZ = 0;
      let started = false;

      const handleAccChange = () => {
        const { x = 0, y = 0, z = 0 } = acc;
        const delta = Math.abs(x - prevX) + Math.abs(y - prevY) + Math.abs(z - prevZ);
        prevX = x; prevY = y; prevZ = z;
        if (delta > threshold * 3) tryFire();
      };

      const handleStarted = () => {
        started = true;
        webApp.onEvent?.('accelerometerChanged', handleAccChange);
        console.log('[useShakeDetector] Telegram Accelerometer запущен');
      };

      webApp.onEvent?.('accelerometerStarted', handleStarted);
      try {
        acc.start({ refresh_rate: 60 });
        usedTelegramApi = true;
      } catch (e) {
        console.warn('[useShakeDetector] Telegram Accelerometer start error:', e);
      }

      return () => {
        webApp.offEvent?.('accelerometerStarted', handleStarted);
        webApp.offEvent?.('accelerometerChanged', handleAccChange);
        if (started) {
          try { acc.stop(); } catch (e) { /* ignore */ }
        }
      };
    }

    // ─── DeviceMotionEvent (стандартный Web API) ─────────────────────────────
    if (!usedTelegramApi && typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      const handleMotion = (e: DeviceMotionEvent) => {
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;
        const total = Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0);
        if (total > threshold * 2) tryFire();
      };

      // iOS 13+ требует разрешение
      const addListener = () => {
        window.addEventListener('devicemotion', handleMotion, { passive: true });
        console.log('[useShakeDetector] DeviceMotion listener добавлен');
      };

      if (
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        // iOS 13+ — разрешение запрашивается только из обработчика клика,
        // поэтому просто регистрируем без разрешения (сработает если уже выдано)
        addListener();
      } else {
        addListener();
      }

      return () => {
        window.removeEventListener('devicemotion', handleMotion);
      };
    }
  }, [threshold, preferTelegramApi, tryFire]);
}
