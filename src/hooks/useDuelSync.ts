import { useCallback } from 'react';

const devLog = (...a: any[]) => { if (import.meta.env.DEV) console.log(...a); };

interface UseDuelSyncProps {
  fetchBoostInventory: () => Promise<any[]>;
  fetchBetInfo: () => Promise<any>;
  setBoosts: React.Dispatch<React.SetStateAction<any[]>>;
  setBetInfo: React.Dispatch<React.SetStateAction<any>>;
}

export function useDuelSync({
  fetchBoostInventory,
  fetchBetInfo,
  setBoosts,
  setBetInfo,
}: UseDuelSyncProps) {
  const syncBoostInventory = useCallback(async () => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    // КРИТИЧНО: Версионирование логов для проверки обновления кода
    devLog('[useDuelSync] 🔄 Starting boost inventory sync [v2]:', {
      isTelegram,
      platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
      timestamp: new Date().toISOString(),
      codeVersion: '2025-12-15-v2', // Версия кода для проверки обновления
    });
    try {
      const inventory = await fetchBoostInventory();
      devLog('[useDuelSync] ✅ Raw inventory loaded:', {
        count: inventory.length,
        boosts: inventory.map(b => ({ type: b.boost_type, quantity: b.quantity })),
        isTelegram,
        platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
      });
      // ВАЖНО: Показываем ВСЕ бусты из loadout, даже с количеством 0
      // Фильтр убран, чтобы показывать все 3 слота из loadout
      setBoosts(inventory);
      devLog('[useDuelSync] ✅ Boosts set in state:', inventory.length);
    } catch (error) {
      console.error('[useDuelSync] ❌ Error syncing boosts:', {
        error,
        isTelegram,
        platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
      });
      setBoosts([]);
    }
  }, [fetchBoostInventory, setBoosts]);

  const syncBetInfo = useCallback(async () => {
    try {
      const info = await fetchBetInfo();
      setBetInfo(info);
    } catch (error) {
      console.error('[useDuelSync] Error syncing bet info:', error);
    }
  }, [fetchBetInfo, setBetInfo]);

  return {
    syncBoostInventory,
    syncBetInfo,
  };
}

