/**
 * Offline Mutations Queue Manager
 * 
 * Управляет очередью мутаций для offline режима.
 * Сохраняет действия в IndexedDB и синхронизирует при reconnect.
 */

import type { OfflineAction, OfflineActionType } from '@/types/offlineQueue';
import { supabase } from '@/integrations/supabase/client';
import { idbDel, idbGet, idbSet } from '@/lib/idbKeyval';

const QUEUE_KEY = 'SDADIM_OFFLINE_QUEUE';
const MAX_QUEUE_SIZE = 1000; // Защита от переполнения

/**
 * Получить текущую очередь
 */
export async function getQueue(): Promise<OfflineAction[]> {
  try {
    const queue = await idbGet<OfflineAction[]>(QUEUE_KEY);
    return queue || [];
  } catch (error) {
    console.error('[OfflineQueue] Failed to get queue:', error);
    return [];
  }
}

/**
 * Добавить действие в очередь
 */
export async function addToQueue(
  type: OfflineActionType,
  payload: any,
  profileId: string
): Promise<string> {
  try {
    const queue = await getQueue();
    
    // Защита от переполнения
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('[OfflineQueue] Queue is full, removing oldest items');
      queue.splice(0, 100); // Удаляем 100 старых
    }
    
    // Создаём action с уникальным ID (для idempotency)
    const action: OfflineAction = {
      id: `${profileId}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      profileId,
      timestamp: Date.now(),
      attempts: 0,
    };
    
    queue.push(action);
    await idbSet(QUEUE_KEY, queue);
    
    console.log('[OfflineQueue] ✅ Action added:', type, action.id);
    return action.id;
  } catch (error) {
    console.error('[OfflineQueue] ❌ Failed to add action:', error);
    throw error;
  }
}

/**
 * Удалить действие из очереди
 */
export async function removeFromQueue(actionId: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter(action => action.id !== actionId);
    await idbSet(QUEUE_KEY, filtered);
    console.log('[OfflineQueue] ✅ Action removed:', actionId);
  } catch (error) {
    console.error('[OfflineQueue] Failed to remove action:', error);
  }
}

/**
 * Обновить статус действия (для retry)
 */
export async function updateActionStatus(
  actionId: string,
  error?: string
): Promise<void> {
  try {
    const queue = await getQueue();
    const action = queue.find(a => a.id === actionId);
    
    if (action) {
      action.attempts = (action.attempts || 0) + 1;
      action.lastError = error;
      await idbSet(QUEUE_KEY, queue);
    }
  } catch (error) {
    console.error('[OfflineQueue] Failed to update action:', error);
  }
}

/**
 * Синхронизация очереди с сервером
 */
export async function syncQueue(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const queue = await getQueue();
  
  if (queue.length === 0) {
    console.log('[OfflineQueue] Queue is empty, nothing to sync');
    return { success: 0, failed: 0, errors: [] };
  }
  
  console.log(`[OfflineQueue] 🔄 Syncing ${queue.length} actions...`);
  
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  // КРИТИЧНО: Группируем действия по типу для batch-обработки
  const actionsByType = queue.reduce((acc, action) => {
    if (!acc[action.type]) {
      acc[action.type] = [];
    }
    acc[action.type].push(action);
    return acc;
  }, {} as Record<OfflineActionType, OfflineAction[]>);
  
  // Синхронизируем каждый тип отдельно
  for (const [type, actions] of Object.entries(actionsByType)) {
    try {
      const { data, error } = await supabase.functions.invoke('sync-offline-actions', {
        body: {
          type,
          actions: actions.map(a => ({
            id: a.id,
            payload: a.payload,
            profileId: a.profileId,
            timestamp: a.timestamp,
          })),
        },
      });
      
      if (error) throw error;
      
      // Удаляем успешно синхронизированные действия
      for (const action of actions) {
        await removeFromQueue(action.id);
        successCount++;
      }
      
      console.log(`[OfflineQueue] ✅ Synced ${actions.length} ${type} actions`);
    } catch (error) {
      console.error(`[OfflineQueue] ❌ Failed to sync ${type}:`, error);
      failedCount += actions.length;
      errors.push(`${type}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Обновляем статус для retry
      for (const action of actions) {
        await updateActionStatus(action.id, String(error));
      }
    }
  }
  
  console.log(`[OfflineQueue] 📊 Sync complete: ${successCount} success, ${failedCount} failed`);
  
  return { success: successCount, failed: failedCount, errors };
}

/**
 * Очистить всю очередь (для отладки)
 */
export async function clearQueue(): Promise<void> {
  try {
    await idbDel(QUEUE_KEY);
    console.log('[OfflineQueue] 🗑️ Queue cleared');
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear queue:', error);
  }
}

/**
 * Получить статистику очереди
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  failed: number;
}> {
  const queue = await getQueue();
  
  return {
    total: queue.length,
    pending: queue.filter(a => !a.attempts || a.attempts === 0).length,
    failed: queue.filter(a => a.attempts && a.attempts > 0).length,
  };
}
