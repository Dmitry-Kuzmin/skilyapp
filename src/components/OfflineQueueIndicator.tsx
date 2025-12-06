/**
 * OfflineQueueIndicator - индикатор очереди offline действий
 * 
 * Показывается когда есть несинхронизированные действия в очереди.
 */

import { Clock, Loader2 } from 'lucide-react';
import { useContext } from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { UserContext } from '@/contexts/UserContext';

export function OfflineQueueIndicator() {
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  // Это позволяет OfflineQueueIndicator работать даже если UserProvider еще не загрузился
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const { queueSize, isSyncing } = useOfflineQueue(profileId);

  // Не показываем если нет действий в очереди
  if (queueSize === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : (
            <Clock className="w-4 h-4 text-amber-500" />
          )}
          <span className="text-xs font-medium text-amber-500">
            {isSyncing ? 'Синхронизация...' : `${queueSize} в очереди`}
          </span>
        </div>
      </div>
    </div>
  );
}

