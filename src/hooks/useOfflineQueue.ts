/**
 * useOfflineQueue - React hook для работы с offline очередью
 * 
 * Автоматически синхронизирует очередь при восстановлении сети.
 */

import { useEffect, useState, useCallback } from 'react';
import { addToQueue, syncQueue, getQueueStats } from '@/utils/offlineQueue';
import type { OfflineActionType } from '@/types/offlineQueue';
import { toast } from 'sonner';

export function useOfflineQueue(profileId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  // Обновляем размер очереди
  const updateQueueSize = useCallback(async () => {
    const stats = await getQueueStats();
    setQueueSize(stats.total);
  }, []);

  // Добавить действие в очередь
  const enqueue = useCallback(async (
    type: OfflineActionType,
    payload: any
  ): Promise<string | null> => {
    if (!profileId) {
      console.warn('[useOfflineQueue] No profileId, skipping queue');
      return null;
    }

    try {
      const actionId = await addToQueue(type, payload, profileId);
      await updateQueueSize();
      
      // Показываем toast если offline
      if (!navigator.onLine) {
        toast.info('Сохранено локально. Отправится при восстановлении сети.', {
          duration: 3000,
        });
      }
      
      return actionId;
    } catch (error) {
      console.error('[useOfflineQueue] Failed to enqueue:', error);
      toast.error('Не удалось сохранить действие');
      return null;
    }
  }, [profileId, updateQueueSize]);

  // Синхронизация очереди
  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('[useOfflineQueue] Offline, skipping sync');
      return;
    }

    if (isSyncing) {
      console.log('[useOfflineQueue] Already syncing, skipping');
      return;
    }

    setIsSyncing(true);
    
    try {
      const result = await syncQueue();
      await updateQueueSize();
      
      if (result.success > 0) {
        console.log(`[useOfflineQueue] ✅ Synced ${result.success} actions`);
        toast.success(`Синхронизировано ${result.success} действий`, {
          duration: 2000,
        });
      }
      
      if (result.failed > 0) {
        console.warn(`[useOfflineQueue] ⚠️ Failed to sync ${result.failed} actions`);
        toast.warning(`${result.failed} действий не удалось синхронизировать`, {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[useOfflineQueue] Sync error:', error);
      toast.error('Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateQueueSize]);

  // Автосинхронизация при reconnect
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOfflineQueue] 🌐 Connection restored, syncing queue...');
      // Небольшая задержка чтобы соединение стабилизировалось
      setTimeout(() => {
        sync();
      }, 1000);
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [sync]);

  // Обновляем размер очереди при монтировании
  useEffect(() => {
    updateQueueSize();
  }, [updateQueueSize]);

  return {
    enqueue,
    sync,
    isSyncing,
    queueSize,
  };
}

