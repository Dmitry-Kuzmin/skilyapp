import { useEffect, useState, useCallback } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { isTelegramMiniApp } from '@/lib/telegram';

interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  userAgent: string;
  platform: string;
}

/**
 * Генерирует уникальный fingerprint устройства
 * Использует комбинацию различных характеристик браузера/устройства
 */
function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let fingerprint = '';

  // 1. User Agent
  fingerprint += navigator.userAgent;

  // 2. Screen resolution
  fingerprint += `${screen.width}x${screen.height}`;

  // 3. Timezone
  fingerprint += Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 4. Language
  fingerprint += navigator.language;

  // 5. Canvas fingerprint (если доступен)
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    fingerprint += canvas.toDataURL();
  }

  // 6. Hardware concurrency
  fingerprint += navigator.hardwareConcurrency || '';

  // 7. Device memory (если доступно)
  fingerprint += (navigator as any).deviceMemory || '';

  // 8. Platform
  fingerprint += navigator.platform;

  // Хешируем для получения компактного fingerprint
  return btoa(fingerprint).substring(0, 64);
}

/**
 * Определяет название устройства из User Agent
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Telegram Web App
  if (isTelegramMiniApp()) {
    return 'Telegram Web App';
  }
  
  // Mobile devices
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone OS (\d+)_(\d+)/);
    return `iPhone iOS ${match ? match[1] : ''}`;
  }
  if (/iPad/.test(ua)) {
    return 'iPad';
  }
  if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+\.\d+)/);
    return `Android ${match ? match[1] : ''}`;
  }
  
  // Desktop browsers
  if (/Chrome/.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match ? match[1] : ''} on ${navigator.platform}`;
  }
  if (/Firefox/.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match ? match[1] : ''} on ${navigator.platform}`;
  }
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match ? match[1] : ''} on ${navigator.platform}`;
  }
  
  return `${navigator.platform} Browser`;
}

/**
 * Хук для работы с device fingerprinting
 */
export function useDeviceFingerprint() {
  const { profileId } = useUserContext();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [loading, setLoading] = useState(true);

  // Генерируем fingerprint при монтировании
  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    const deviceName = getDeviceName();
    const userAgent = navigator.userAgent;
    const platform = isTelegramMiniApp() ? 'telegram' : 'web';

    setDeviceInfo({
      fingerprint,
      deviceName,
      userAgent,
      platform,
    });
  }, []);

  // Регистрируем устройство
  const registerDevice = useCallback(async () => {
    if (!profileId || !deviceInfo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Получаем IP адрес (если доступен через Edge Function)
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: {
          user_id: profileId,
          device_fingerprint: deviceInfo.fingerprint,
          device_name: deviceInfo.deviceName,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
        },
      });

      if (error) throw error;

      if (data) {
        setIsRegistered(true);
        setRequiresVerification(data.requires_verification || false);

        // Если требуется верификация, показываем уведомление
        if (data.requires_verification) {
          console.warn('[DeviceFingerprint] Требуется верификация устройства');
        }
      }
    } catch (err: any) {
      // Если функция не задеплоена (404), это не критично - просто пропускаем регистрацию
      if (err?.status === 404 || err?.message?.includes('404')) {
        console.warn('[DeviceFingerprint] Функция register-device не найдена (404). Анти-абуз система не активна.');
      } else {
        // Другие ошибки логируем только в dev режиме
        if (import.meta.env.DEV) {
          console.error('[DeviceFingerprint] Ошибка регистрации устройства:', err);
        }
      }
      // Устанавливаем isRegistered в true, чтобы не пытаться регистрировать повторно
      setIsRegistered(true);
    } finally {
      setLoading(false);
    }
  }, [profileId, deviceInfo]);

  // Регистрируем устройство при монтировании
  useEffect(() => {
    if (deviceInfo && profileId && !isRegistered) {
      registerDevice();
    }
  }, [deviceInfo, profileId, isRegistered, registerDevice]);

  return {
    deviceInfo,
    isRegistered,
    requiresVerification,
    loading,
    registerDevice,
  };
}

