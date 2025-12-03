/**
 * ROBUST Query Persister для Offline-First архитектуры
 * 
 * Использует IndexedDB (через idb-keyval) для большого объёма данных.
 * Важно: В некоторых WebView (особенно iOS Telegram) IndexedDB может быть недоступен.
 * Если IndexedDB не работает - возвращаем undefined (graceful fallback на network-only режим).
 */

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * Создаёт async persister с обработкой ошибок для работы в Telegram WebView
 * 
 * @returns Persister с методами getItem, setItem, removeItem
 */
export function createAsyncStoragePersister(): Persister {
  const IDB_KEY = 'SDADIM_REACT_QUERY_OFFLINE_CACHE';

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(IDB_KEY, client);
        console.log('[Persister] ✅ Cache saved to IndexedDB');
      } catch (error) {
        // КРИТИЧНО: Не падаем, если IndexedDB недоступен (restricted WebView)
        console.warn('[Persister] ⚠️ Failed to save cache to IndexedDB:', error);
        // В production можно отправить метрику, что IndexedDB недоступен
      }
    },

    restoreClient: async () => {
      try {
        const cache = await get<PersistedClient>(IDB_KEY);
        
        if (cache) {
          console.log('[Persister] ✅ Cache restored from IndexedDB');
          return cache;
        }
        
        console.log('[Persister] 📭 No cache found in IndexedDB');
        return undefined;
      } catch (error) {
        // КРИТИЧНО: Не падаем, если IndexedDB недоступен
        console.warn('[Persister] ⚠️ Failed to restore cache from IndexedDB:', error);
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await del(IDB_KEY);
        console.log('[Persister] 🗑️ Cache removed from IndexedDB');
      } catch (error) {
        console.warn('[Persister] ⚠️ Failed to remove cache from IndexedDB:', error);
      }
    },
  };
}

