/**
 * 🎯 Duel Result Snapshot Utilities
 * 
 * Утилиты для сохранения и загрузки snapshot результатов дуэли.
 * Используется для предотвращения race condition при переходе к экрану результатов.
 */

import { DUEL_RESULT_SNAPSHOT_KEY, type DuelResultSnapshot } from '@/features/duel/shared';

/**
 * Сохраняет snapshot результатов дуэли в localStorage
 */
export function saveDuelResultSnapshot(snapshot: DuelResultSnapshot): void {
  try {
    const data = JSON.stringify(snapshot);
    localStorage.setItem(DUEL_RESULT_SNAPSHOT_KEY, data);
    console.log('[duelResultSnapshot] ✅ Snapshot saved:', snapshot.duelId);
  } catch (error) {
    console.error('[duelResultSnapshot] ❌ Error saving snapshot:', error);
  }
}

/**
 * Загружает snapshot результатов дуэли из localStorage
 */
export function loadDuelResultSnapshot(duelId: string | null): DuelResultSnapshot | null {
  if (!duelId) return null;

  try {
    const saved = localStorage.getItem(DUEL_RESULT_SNAPSHOT_KEY);
    if (!saved) return null;

    const snapshot: DuelResultSnapshot = JSON.parse(saved);
    
    // Проверяем что snapshot для нужной дуэли
    if (snapshot.duelId !== duelId) {
      console.log('[duelResultSnapshot] ⚠️ Snapshot is for different duel, ignoring');
      return null;
    }

    // Проверяем что snapshot не слишком старый (максимум 5 минут)
    const age = Date.now() - snapshot.timestamp;
    const MAX_SNAPSHOT_AGE_MS = 5 * 60 * 1000; // 5 минут
    
    if (age > MAX_SNAPSHOT_AGE_MS) {
      console.log('[duelResultSnapshot] ⚠️ Snapshot too old, clearing');
      clearDuelResultSnapshot();
      return null;
    }

    console.log('[duelResultSnapshot] ✅ Snapshot loaded:', snapshot.duelId);
    return snapshot;
  } catch (error) {
    console.error('[duelResultSnapshot] ❌ Error loading snapshot:', error);
    clearDuelResultSnapshot(); // Очищаем поврежденные данные
    return null;
  }
}

/**
 * Очищает snapshot результатов дуэли из localStorage
 */
export function clearDuelResultSnapshot(): void {
  try {
    localStorage.removeItem(DUEL_RESULT_SNAPSHOT_KEY);
    console.log('[duelResultSnapshot] ✅ Snapshot cleared');
  } catch (error) {
    console.error('[duelResultSnapshot] ❌ Error clearing snapshot:', error);
  }
}

