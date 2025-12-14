/**
 * ROBUST Query Persister для Offline-First архитектуры
 * 
 * Использует IndexedDB (через idb-keyval) для большого объёма данных.
 * Важно: В некоторых WebView (особенно iOS Telegram) IndexedDB может быть недоступен.
 * Если IndexedDB не работает - возвращаем undefined (graceful fallback на network-only режим).
 */

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

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
        const clientToSave = pendingClient;
        pendingClient = null;
        
        if (!clientToSave) return;
        
        try {
          await retryOperation(async () => {
            await set(IDB_KEY, clientToSave);
            console.log('[Persister] ✅ Cache saved to IndexedDB');
          }, 3, 100);
        } catch (error: any) {
          // КРИТИЧНО: Не падаем, если IndexedDB недоступен (restricted WebView или закрывается)
          const isClosingError = error?.message?.includes('closing') || 
                                error?.name === 'InvalidStateError';
          
          if (isClosingError) {
            console.warn('[Persister] ⚠️ IndexedDB connection closing, cache save skipped:', error.message);
          } else {
            console.warn('[Persister] ⚠️ Failed to save cache to IndexedDB:', error);
          }
          // В production можно отправить метрику, что IndexedDB недоступен
        }
      }, 500); // Debounce 500ms
    },

    restoreClient: async () => {
      try {
        const cache = await retryOperation(async () => {
          return await get<PersistedClient>(IDB_KEY);
        }, 3, 100);
        
        if (cache) {
          console.log('[Persister] ✅ Cache restored from IndexedDB');
          return cache;
        }
        
        console.log('[Persister] 📭 No cache found in IndexedDB');
        return undefined;
      } catch (error: any) {
        // КРИТИЧНО: Не падаем, если IndexedDB недоступен
        const isClosingError = error?.message?.includes('closing') || 
                              error?.name === 'InvalidStateError';
        
        if (isClosingError) {
          console.warn('[Persister] ⚠️ IndexedDB connection closing, cache restore skipped');
        } else {
          console.warn('[Persister] ⚠️ Failed to restore cache from IndexedDB:', error);
        }
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await retryOperation(async () => {
          await del(IDB_KEY);
          console.log('[Persister] 🗑️ Cache removed from IndexedDB');
        }, 3, 100);
      } catch (error: any) {
        const isClosingError = error?.message?.includes('closing') || 
                              error?.name === 'InvalidStateError';
        
        if (isClosingError) {
          console.warn('[Persister] ⚠️ IndexedDB connection closing, cache removal skipped');
        } else {
          console.warn('[Persister] ⚠️ Failed to remove cache from IndexedDB:', error);
        }
      }
    },
  };
}

