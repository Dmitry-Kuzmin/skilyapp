/**
 * ROBUST Query Persister для Offline-First архитектуры
 * 
 * Использует IndexedDB (через idb-keyval) для большого объёма данных.
 * Важно: В некоторых WebView (особенно iOS Telegram) IndexedDB может быть недоступен.
 * Если IndexedDB не работает - возвращаем undefined (graceful fallback на network-only режим).
 */

import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { idbDel, idbGet, idbSet } from '@/lib/idbKeyval';

// КРИТИЧНО: Debounce для частых операций сохранения
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingClient: PersistedClient | null = null;

/**
 * Проверяет, доступна ли IndexedDB и не закрывается ли соединение
 */
function isIndexedDBAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry логика с экспоненциальной задержкой
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T | undefined> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Проверяем доступность IndexedDB перед операцией
      if (!isIndexedDBAvailable()) {
        console.warn('[Persister] ⚠️ IndexedDB not available');
        return undefined;
      }

      return await operation();
    } catch (error: any) {
      const isClosingError = error?.message?.includes('closing') ||
        error?.name === 'InvalidStateError';

      if (isClosingError && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Persister] ⚠️ IndexedDB closing, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Если это не ошибка закрытия или последняя попытка - пробрасываем
      throw error;
    }
  }
  return undefined;
}

/**
 * Создаёт async persister с обработкой ошибок для работы в Telegram WebView
 * 
 * @returns Persister с методами getItem, setItem, removeItem
 */
export function createAsyncStoragePersister(): Persister {
  const IDB_KEY = 'SDADIM_REACT_QUERY_OFFLINE_CACHE';

  return {
    persistClient: async (client: PersistedClient) => {
      // КРИТИЧНО: Debounce для частых операций сохранения
      pendingClient = client;

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = setTimeout(async () => {
        try {
          const clientToSave = pendingClient;
          pendingClient = null;

          if (!clientToSave) return;

          try {
            await retryOperation(async () => {
              await idbSet(IDB_KEY, clientToSave);
              // console.log('[Persister] ✅ Cache saved to IndexedDB');
            }, 3, 100);
          } catch (error: any) {
            // КРИТИЧНО: Не падаем, если IndexedDB недоступен (restricted WebView или закрывается)
            const isClosingError = error?.message?.includes('closing') ||
              error?.name === 'InvalidStateError' ||
              error?.name === 'UnknownError' ||
              error?.name === 'AbortError' ||
              error?.message?.includes('Connection to Indexed Database server lost');

            if (isClosingError) {
              // Silently ignore closing errors to prevent "Unhandled Promise Rejection" noise
              return;
            } else {
              // Only warn for unexpected errors
              // console.warn('[Persister] ⚠️ Failed to save cache:', error.name);
            }
          }
        } catch (e) {
          // Silently fail to avoid crashing the whole thread
        }
      }, 2000); // Increased Debounce to 2s to reduce load
    },

    restoreClient: async () => {
      try {
        const cache = await retryOperation(async () => {
          return await idbGet<PersistedClient>(IDB_KEY);
        }, 3, 200);

        if (cache) {
          // console.log('[Persister] ✅ Cache restored');
          return cache;
        }
        return undefined;
      } catch (error: any) {
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await retryOperation(async () => {
          await idbDel(IDB_KEY);
        }, 3, 200);
      } catch (error: any) {
        // Silent
      }
    },
  };
}
