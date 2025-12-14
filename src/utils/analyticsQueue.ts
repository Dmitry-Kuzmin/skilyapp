/**
 * Система кэширования и батчинга событий аналитики
 * Сохраняет события локально и отправляет пачкой при восстановлении связи
 */

import { supabase } from '@/integrations/supabase/client';
import { openDB, IDBPDatabase, IDBPTransaction } from 'idb';

// Приоритеты событий (важные события защищены от удаления)
export type EventPriority = 'high' | 'medium' | 'low';

// Важные типы событий, которые нельзя удалять
const IMPORTANT_EVENT_TYPES = new Set([
  'test_completed',
  'test_passed',
  'test_failed',
  'purchase_completed',
  'payment_success',
  'payment_failed',
  'achievement_unlocked',
  'level_up',
  'exam_completed',
]);

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, any>;
  override_template_type?: string;
  timestamp: number;
  retryCount: number;
  priority: EventPriority; // Приоритет события
}

const DB_NAME = 'SkilyAppAnalytics';
const STORE_NAME = 'analytics_events';
const DB_VERSION = 2; // Обновлено: добавлен индекс priority

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
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Создание новой таблицы
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('user_id', 'user_id');
          store.createIndex('priority', 'priority');
        } else if (oldVersion < 2) {
          // Миграция с версии 1 на 2: добавляем индекс priority
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('priority')) {
            store.createIndex('priority', 'priority');
          }
          // Добавляем priority к существующим событиям (будет выполнено асинхронно)
          store.openCursor().onsuccess = (event: any) => {
            const cursor = event.target.result;
            if (cursor) {
              const eventData = cursor.value;
              if (!eventData.priority) {
                // Определяем приоритет на основе типа события
                const eventType = eventData.event_type || '';
                let priority: EventPriority = 'low';
                if (IMPORTANT_EVENT_TYPES.has(eventType)) {
                  priority = 'high';
                } else if (eventType.includes('progress') || eventType.includes('duel')) {
                  priority = 'medium';
                }
                eventData.priority = priority;
                cursor.update(eventData);
              }
              cursor.continue();
            }
          };
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
 * Определить приоритет события
 */
function getEventPriority(eventType: string): EventPriority {
  if (IMPORTANT_EVENT_TYPES.has(eventType)) {
    return 'high';
  }
  if (eventType.includes('progress') || eventType.includes('duel')) {
    return 'medium';
  }
  return 'low';
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
      priority: getEventPriority(eventType), // Определяем приоритет
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
    const eventsToDelete: string[] = [];
    const eventsToUpdate: AnalyticsEvent[] = [];
    
    for (const [userId, userEvents] of eventsByUser.entries()) {
      for (const event of userEvents) {
        sendPromises.push(
          sendSingleEvent(event)
            .then(() => {
              // Сохраняем ID для удаления после завершения всех промисов
              eventsToDelete.push(event.id);
            })
            .catch((error) => {
              // КРИТИЧНО: Если токен протух (401) - НЕ увеличиваем retryCount, откладываем до открытия приложения
              if (error.message === 'TOKEN_EXPIRED') {
                console.warn(`[AnalyticsQueue] Token expired for event ${event.id}, deferring until app opens`);
                // НЕ удаляем событие, НЕ увеличиваем retryCount
                // Оно будет отправлено когда приложение откроется и токен обновится
                return; // Пропускаем это событие
              }
              
              // Для других ошибок - стандартная обработка
              console.error(`[AnalyticsQueue] Failed to send event ${event.id}:`, error);
              
              // КРИТИЧНО: Для 400 ошибок (Bad Request) - НЕ ретраим (ошибка клиента)
              const isClientError = error.status === 400 || error.message?.includes('400') || error.message?.includes('Bad Request');
              if (isClientError) {
                console.warn(`[AnalyticsQueue] Client error (400) for event ${event.id}, not retrying`);
                eventsToDelete.push(event.id); // Удаляем, не ретраим
                return;
              }
              
              // Увеличиваем счетчик попыток только для сетевых/серверных ошибок
              event.retryCount += 1;
              
              // Если превышен лимит попыток, удаляем событие
              if (event.retryCount > 5) {
                console.warn(`[AnalyticsQueue] Event ${event.id} exceeded retry limit, deleting`);
                eventsToDelete.push(event.id);
                return;
              }
              
              // Сохраняем для обновления после завершения всех промисов
              eventsToUpdate.push(event);
            })
        );
      }
    }

    await Promise.allSettled(sendPromises);
    
    // КРИТИЧНО: Открываем НОВУЮ транзакцию для удаления/обновления событий
    // Транзакция из начала функции уже закрыта после await
    if (eventsToDelete.length > 0 || eventsToUpdate.length > 0) {
      const updateDb = await getDb();
      const updateTransaction = updateDb.transaction([STORE_NAME], 'readwrite');
      const updateStore = updateTransaction.objectStore(STORE_NAME);
      
      // Удаляем успешно отправленные события
      for (const eventId of eventsToDelete) {
        updateStore.delete(eventId);
      }
      
      // Обновляем события с новым retryCount
      for (const event of eventsToUpdate) {
        updateStore.put(event);
      }
      
      // Ждем завершения транзакции
      await new Promise<void>((resolve, reject) => {
        updateTransaction.oncomplete = () => resolve();
        updateTransaction.onerror = () => reject(updateTransaction.error);
      });
    }
    
    // Если еще есть события, планируем следующую отправку
    const checkDb = await getDb();
    const checkTransaction = checkDb.transaction([STORE_NAME], 'readonly');
    const checkStore = checkTransaction.objectStore(STORE_NAME);
    const remainingCount = await checkStore.count();
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
 * КРИТИЧНО: Включает event_id для дедупликации на сервере
 */
async function sendSingleEvent(event: AnalyticsEvent): Promise<void> {
  const { error } = await supabase.functions.invoke('user-event-dispatcher', {
    body: {
      event_id: event.id, // КРИТИЧНО: Уникальный ID для дедупликации
      user_id: event.user_id,
      event_type: event.event_type,
      payload: event.payload,
      override_template_type: event.override_template_type,
    },
  });

  if (error) {
    // КРИТИЧНО: Если 401 (Unauthorized) - токен протух, откладываем отправку
    if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.warn(`[AnalyticsQueue] Token expired for event ${event.id}, deferring until app opens`);
      throw new Error('TOKEN_EXPIRED'); // Специальная ошибка для обработки
    }
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
 * Ограничить размер очереди (удаляет сначала низкоприоритетные события)
 */
async function limitQueueSize(): Promise<void> {
  try {
    const db = await getDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const count = await store.count();
    
    if (count > MAX_EVENTS_IN_QUEUE) {
      const toDelete = count - MAX_EVENTS_IN_QUEUE;
      
      // Получаем все события, сортируем по приоритету и времени
      const allEvents: AnalyticsEvent[] = [];
      let cursor = await store.openCursor();
      
      while (cursor) {
        allEvents.push(cursor.value);
        cursor = await cursor.continue();
      }
      
      // Сортируем: сначала низкоприоритетные и старые
      allEvents.sort((a, b) => {
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        const priorityDiff = priorityOrder[a.priority || 'low'] - priorityOrder[b.priority || 'low'];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp; // Старые первыми
      });
      
      // Удаляем самые низкоприоритетные события
      let deleted = 0;
      for (const event of allEvents) {
        if (deleted >= toDelete) break;
        
        // НИКОГДА не удаляем high priority события при переполнении
        if (event.priority === 'high') {
          console.warn(`[AnalyticsQueue] Queue full, but protecting high priority event: ${event.event_type}`);
          continue;
        }
        
        await store.delete(event.id);
        deleted++;
      }
      
      if (deleted > 0) {
        console.log(`[AnalyticsQueue] Limited queue size, deleted ${deleted} low priority events`);
      } else {
        console.warn(`[AnalyticsQueue] Queue full but all events are high priority!`);
      }
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

  // КРИТИЧНО: iOS fallback - используем pagehide вместо beforeunload (более надежно)
  // pagehide срабатывает при закрытии вкладки, сворачивании, переключении приложения
  document.addEventListener('pagehide', (event) => {
    // persisted = true означает, что страница сохраняется в кэше (не закрывается полностью)
    // persisted = false означает, что страница закрывается
    if (!event.persisted && isOnline()) {
      // Страница закрывается - пытаемся отправить критичные события
      console.log('[AnalyticsQueue] Page hiding, attempting to send critical events');
      // Отправляем только HIGH приоритет события
      sendCriticalEventsOnly().catch((error) => {
        console.error('[AnalyticsQueue] Failed to send critical events on pagehide:', error);
      });
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

