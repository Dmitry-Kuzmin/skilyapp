/**
 * Service Worker модуль для отправки аналитики из IndexedDB
 * Работает даже когда приложение закрыто
 */

// Получить URL Supabase функции
function getSupabaseUrl() {
  // Получаем из self.location или из кэшированного значения
  if (typeof self !== 'undefined' && self.location) {
    const origin = self.location.origin;
    // Предполагаем, что Supabase URL хранится в кэше или известен
    // В реальности нужно передавать через сообщение или хранить в IndexedDB
    return `${origin}/functions/v1/user-event-dispatcher`;
  }
  // Fallback: попытаемся найти в кэше
  return null;
}

/**
 * Загрузить события из IndexedDB
 */
async function loadEventsFromIndexedDB(maxCount = 50) {
  try {
    const dbName = 'SkilyAppAnalytics';
    const storeName = 'analytics_events';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        const getAllRequest = index.getAll(null, maxCount);
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result || []);
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('user_id', 'user_id');
        }
      };
    });
  } catch (error) {
    console.error('[AnalyticsSyncWorker] Error loading events:', error);
    return [];
  }
}

/**
 * Удалить события из IndexedDB
 */
async function deleteEventsFromIndexedDB(eventIds) {
  try {
    const dbName = 'SkilyAppAnalytics';
    const storeName = 'analytics_events';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve();
          return;
        }
        
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const deletePromises = eventIds.map(id => {
          return new Promise((resolveDelete, rejectDelete) => {
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolveDelete();
            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
          });
        });
        
        Promise.all(deletePromises).then(resolve).catch(reject);
      };
    });
  } catch (error) {
    console.error('[AnalyticsSyncWorker] Error deleting events:', error);
  }
}

/**
 * Отправить событие на сервер
 */
async function sendEventToServer(event, supabaseUrl, supabaseKey) {
  try {
    const response = await fetch(`${supabaseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        user_id: event.user_id,
        event_type: event.event_type,
        payload: event.payload || {},
        override_template_type: event.override_template_type,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('[AnalyticsSyncWorker] Error sending event:', error);
    throw error;
  }
}

/**
 * Отправить батч событий
 */
async function sendBatch(supabaseUrl, supabaseKey) {
  try {
    // Загружаем события из IndexedDB
    const events = await loadEventsFromIndexedDB(50);
    
    if (events.length === 0) {
      return { sent: 0, failed: 0 };
    }

    console.log(`[AnalyticsSyncWorker] Sending batch of ${events.length} events`);

    const results = await Promise.allSettled(
      events.map(event => sendEventToServer(event, supabaseUrl, supabaseKey))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Удаляем успешно отправленные события
    const sentEventIds = events
      .filter((_, index) => results[index].status === 'fulfilled')
      .map(e => e.id);

    if (sentEventIds.length > 0) {
      await deleteEventsFromIndexedDB(sentEventIds);
    }

    return { sent, failed };
  } catch (error) {
    console.error('[AnalyticsSyncWorker] Error sending batch:', error);
    return { sent: 0, failed: 0 };
  }
}

// Экспортируем функцию для использования в Service Worker
if (typeof self !== 'undefined') {
  self.sendAnalyticsBatch = sendBatch;
  self.loadEventsFromIndexedDB = loadEventsFromIndexedDB;
}

