// =====================================================================
// LevelUpStore — глобальное состояние для celebration popup при level-up
//
// Триггеры: тесты, дуэли, квесты, игры — везде где растут SP.
// Любая фича может вызвать `triggerLevelUp({ level })` и получит
// festival popup с автоматической загрузкой награды и кнопкой claim.
// =====================================================================

import { create } from 'zustand';

export interface LevelUpReward {
  type: 'coins' | 'boost' | 'skin' | 'badge' | 'sticker' | 'premium_pass' | 'sp' | 'mystery';
  value?: number;
  name?: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PendingLevelUp {
  /** Новый уровень после повышения */
  newLevel: number;
  /** Источник события (для аналитики/UI) */
  source: 'test' | 'exam' | 'duel' | 'quest' | 'game' | 'other';
  /** Текущий сезон (опц.) */
  seasonId?: number;
  /** Premium флаг — для определения какую награду показывать */
  isPremium?: boolean;
}

interface LevelUpState {
  pending: PendingLevelUp | null;
  /** Очередь — если за один заход случилось несколько level-up'ов подряд */
  queue: PendingLevelUp[];

  triggerLevelUp: (data: PendingLevelUp) => void;
  dismiss: () => void;
}

export const useLevelUpStore = create<LevelUpState>((set, get) => ({
  pending: null,
  queue: [],

  triggerLevelUp: (data) => {
    const { pending, queue } = get();
    if (pending) {
      // Уже показывается один — добавляем в очередь
      set({ queue: [...queue, data] });
    } else {
      set({ pending: data });
    }
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      // Показываем следующий из очереди
      const [next, ...rest] = queue;
      set({ pending: next, queue: rest });
    } else {
      set({ pending: null });
    }
  },
}));

/**
 * Утилита: проверить ответ функции (test/duel/quest) на level_up
 * и сразу триггернуть celebration popup.
 */
export function maybeTriggerLevelUp(
  response: { level_up?: boolean; new_level?: number } | null | undefined,
  source: PendingLevelUp['source'],
  isPremium = false,
) {
  if (!response?.level_up || !response.new_level) return false;
  useLevelUpStore.getState().triggerLevelUp({
    newLevel: response.new_level,
    source,
    isPremium,
  });
  return true;
}
