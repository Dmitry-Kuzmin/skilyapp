import { useCallback } from 'react';
import { getTelegramDeviceStorage, getTelegramSecureStorage, isVersionAtLeast } from '@/lib/telegram';
import type { TelegramStorageAPI } from '@/types/window';

type StorageType = 'device' | 'secure';

function getStorage(type: StorageType): TelegramStorageAPI | null {
  if (!isVersionAtLeast('9.0')) return null;
  return type === 'device' ? getTelegramDeviceStorage() : getTelegramSecureStorage();
}

/**
 * Хук для работы с нативным хранилищем Telegram (Bot API 9.0+).
 * Автоматически деградирует до localStorage если API недоступен.
 *
 * @param type — 'device' (постоянное) или 'secure' (защищённое, шифрованное)
 *
 * Использование:
 *   const { setItem, getItem, isNative } = useTelegramStorage('secure');
 *   await setItem('auth_token', token);
 *   const token = await getItem('auth_token');
 */
export function useTelegramStorage(type: StorageType = 'device') {
  const isNative = !!getStorage(type);
  const lsPrefix = `tg_${type}_`;

  const setItem = useCallback(async (key: string, value: string): Promise<boolean> => {
    const storage = getStorage(type);
    if (!storage) {
      try { localStorage.setItem(lsPrefix + key, value); return true; }
      catch { return false; }
    }
    return new Promise((resolve) => {
      storage.setItem(key, value, (error) => resolve(!error));
    });
  }, [type, lsPrefix]);

  const getItem = useCallback(async (key: string): Promise<string | null> => {
    const storage = getStorage(type);
    if (!storage) {
      return localStorage.getItem(lsPrefix + key);
    }
    return new Promise((resolve) => {
      storage.getItem(key, (error, value) => resolve(error ? null : value));
    });
  }, [type, lsPrefix]);

  const removeItem = useCallback(async (key: string): Promise<boolean> => {
    const storage = getStorage(type);
    if (!storage) {
      localStorage.removeItem(lsPrefix + key);
      return true;
    }
    return new Promise((resolve) => {
      storage.removeItem(key, (error) => resolve(!error));
    });
  }, [type, lsPrefix]);

  const getKeys = useCallback(async (): Promise<string[]> => {
    const storage = getStorage(type);
    if (!storage) {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(lsPrefix))
        .map(k => k.slice(lsPrefix.length));
    }
    return new Promise((resolve) => {
      storage.getKeys((error, keys) => resolve(error ? [] : keys));
    });
  }, [type, lsPrefix]);

  return { isNative, setItem, getItem, removeItem, getKeys };
}
