/**
 * Offline Mutations Queue Types
 * 
 * Для сохранения мутаций offline и batch-синхронизации при reconnect.
 */

export type OfflineActionType =
  | 'test-result'           // Результат теста
  | 'progress-update'       // Обновление прогресса
  | 'coin-spend'            // Трата монет
  | 'boost-use'             // Использование буста
  | 'cosmetic-equip'        // Экипировка косметики
  | 'bookmark-toggle'       // Закладка вопроса
  | 'daily-bonus-claim'     // Получение daily bonus
  | 'challenge-bank-add';   // Добавление в challenge bank

export interface OfflineAction {
  // Уникальный ID для idempotency (важно!)
  id: string;
  
  // Тип действия
  type: OfflineActionType;
  
  // Payload (зависит от типа)
  payload: any;
  
  // Метаданные
  profileId: string;
  timestamp: number;
  
  // Для retry логики
  attempts?: number;
  lastError?: string;
}

export interface OfflineQueueStats {
  totalActions: number;
  pendingActions: number;
  failedActions: number;
  lastSyncTime?: number;
}

