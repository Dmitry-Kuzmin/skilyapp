/**
 * Система кэширования и батчинга событий аналитики
 * Сохраняет события локально и отправляет пачкой при восстановлении связи
 */

import { supabase } from '@/integrations/supabase/client';
import { openDB, IDBPDatabase, IDBPTransaction } from 'idb';

interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, any>;
  override_template_type?: string;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'SkilyAppAnalytics';
const STORE_NAME = 'analytics_events';
const DB_VERSION = 1;

// Лимиты
const MAX_EVENTS_IN_QUEUE = 1000; // Максимум событий в очереди
const MAX_EVENT_AGE = 30 * 24 * 60 * 60 * 1000; // 30 дней
const BATCH_SIZE = 50; // Размер батча для отправки
const RETRY_DELAY = 5000; // 5 секунд между попытками

let db: IDBPDatabase | null = null;
let isSending = false;
let sendTimer: number | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('user_id', 'user_id');
        }
      },
    });
  }
  return db;
}

/**
 * Проверить, есть ли интернет
 */
function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Сохранить событие аналитики в очередь
 */
export async function queueAnalyticsEvent(
  userId: string | null | undefined,
  eventType: string,
  payload: Record<string, any> = {},
  overrideTemplateType?: string
): Promise<void> {
  if (!userId) return;

  try {
    const db = await getDb();
    const event: AnalyticsEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      event_type: eventType,
      payload,
      override_template_type: overrideTemplateType,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await db.add(STORE_NAME, event);
    console.log('[AnalyticsQueue] Event queued:', eventType, event.id);

    // Очищаем старые события
    await cleanupOldEvents();

    // Ограничиваем размер очереди
    await limitQueueSize();

    // Пытаемся отправить, если онлайн
    if (isOnline()) {
      scheduleBatchSend();
    }
  } catch (error) {
    console.error('[AnalyticsQueue] Failed to queue event:', error);
  }
}

/**
 * Отправить события пачкой
 */
async function sendBatch(): Promise<void> {
  if (isSending) return;
  if (!isOnline()) {
    console.log('[AnalyticsQueue] Offline, skipping batch send');
    return;
  }

  try {
    isSending = true;
    const db = await getDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    // Получаем первые N событий
    const events = await index.getAll(null, BATCH_SIZE);
    
    if (events.length === 0) {
      isSending = false;
      return;
    }

    console.log(`[AnalyticsQueue] Sending batch of ${events.length} events`);

    // Группируем по user_id для батчинга
    const eventsByUser = new Map<string, AnalyticsEvent[]>();
    events.forEach((event) => {
      const userEvents = eventsByUser.get(event.user_id) || [];
      userEvents.push(event);
      eventsByUser.set(event.user_id, userEvents);
    });

    // Отправляем батчами по пользователям
    const sendPromises: Promise<void>[] = [];
    for (const [userId, userEvents] of eventsByUser.entries()) {
      for (const event of userEvents) {
        sendPromises.push(
          sendSingleEvent(event)
            .then(() => {
              // Удаляем успешно отправленное событие
              return store.delete(event.id);
            })
            .catch((error) => {
              console.error(`[AnalyticsQueue] Failed to send event ${event.id}:`, error);
              // Увеличиваем счетчик попыток
              event.retryCount += 1;
              
              // Если превышен лимит попыток, удаляем событие
              if (event.retryCount > 5) {
                console.warn(`[AnalyticsQueue] Event ${event.id} exceeded retry limit, deleting`);
                return store.delete(event.id);
              }
              
              // Обновляем событие с новым retryCount
              return store.put(event);
            })
        );
      }
    }

    await Promise.allSettled(sendPromises);
    
    // Если еще есть события, планируем следующую отправку
    const remainingCount = await store.count();
    if (remainingCount > 0) {
      scheduleBatchSend();
    }
  } catch (error) {
    console.error('[AnalyticsQueue] Batch send error:', error);
  } finally {
    isSending = false;
  }
}

/**
 * Отправить одно событие
 */
async function sendSingleEvent(event: AnalyticsEvent): Promise<void> {
  const { error } = await supabase.functions.invoke('user-event-dispatcher', {
    body: {
      user_id: event.user_id,
      event_type: event.event_type,
      payload: event.payload,
      override_template_type: event.override_template_type,
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Запланировать отправку батча
 */
function scheduleBatchSend(): void {
  if (sendTimer !== null) return;
  
  sendTimer = window.setTimeout(() => {
    sendTimer = null;
    sendBatch();
  }, RETRY_DELAY);
}

/**
 * Очистить старые события (старше MAX_EVENT_AGE)
 */
async function cleanupOldEvents(): Promise<void> {
  try {
    const db = await getDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    const cutoffTime = Date.now() - MAX_EVENT_AGE;
    
    // Получаем все события и фильтруем по времени вручную
    let cursor = await index.openCursor();
    let deletedCount = 0;
    
    while (cursor) {
      // Проверяем возраст события
      if (cursor.value && cursor.value.timestamp < cutoffTime) {
        await cursor.delete();
        deletedCount++;
      }
      cursor = await cursor.continue();
    }
    
    if (deletedCount > 0) {
      console.log(`[AnalyticsQueue] Cleaned up ${deletedCount} old events`);
    }
  } catch (error) {
    console.error('[AnalyticsQueue] Cleanup error:', error);
  }
}

/**
 * Ограничить размер очереди
 */
async function limitQueueSize(): Promise<void> {
  try {
    const db = await getDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const count = await store.count();
    
    if (count > MAX_EVENTS_IN_QUEUE) {
      const toDelete = count - MAX_EVENTS_IN_QUEUE;
      const index = store.index('timestamp');
      const cursor = await index.openCursor(null, 'next');
      
      let deleted = 0;
      while (cursor && deleted < toDelete) {
        await cursor.delete();
        deleted++;
        await cursor.continue();
      }
      
      console.log(`[AnalyticsQueue] Limited queue size, deleted ${deleted} oldest events`);
    }
  } catch (error) {
    console.error('[AnalyticsQueue] Limit queue size error:', error);
  }
}

/**
 * Получить количество событий в очереди
 */
export async function getQueueSize(): Promise<number> {
  try {
    const db = await getDb();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return await store.count();
  } catch (error) {
    console.error('[AnalyticsQueue] Get queue size error:', error);
    return 0;
  }
}

/**
 * Отправить все события в очереди (принудительно)
 */
export async function flushQueue(): Promise<void> {
  while (true) {
    await sendBatch();
    const queueSize = await getQueueSize();
    if (queueSize === 0) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }
}

// Слушаем события восстановления сети
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[AnalyticsQueue] Network online, scheduling batch send');
    scheduleBatchSend();
    
    // Регистрируем Background Sync для надежной отправки
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('analytics-sync');
      }).catch((error) => {
        console.warn('[AnalyticsQueue] Background Sync registration failed:', error);
        // Продолжаем работу без Background Sync
      });
    }
  });

  // Также отправляем при видимости страницы (на случай, если пользователь вернулся)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isOnline()) {
      scheduleBatchSend();
    }
  });

  // Слушаем сообщения от Service Worker для синхронизации
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_ANALYTICS') {
      console.log('[AnalyticsQueue] Received sync request from Service Worker');
      scheduleBatchSend();
    }
  });
}

