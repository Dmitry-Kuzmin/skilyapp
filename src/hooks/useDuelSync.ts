import { useCallback } from 'react';

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
    console.log('[useDuelSync] 🔄 Starting boost inventory sync:', {
      isTelegram,
      platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
    });
    try {
      const inventory = await fetchBoostInventory();
      console.log('[useDuelSync] ✅ Raw inventory loaded:', {
        count: inventory.length,
        boosts: inventory.map(b => ({ type: b.boost_type, quantity: b.quantity })),
        isTelegram,
        platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
      });
      // ВАЖНО: Показываем ВСЕ бусты из loadout, даже с количеством 0
      // Фильтр убран, чтобы показывать все 3 слота из loadout
      setBoosts(inventory);
      console.log('[useDuelSync] ✅ Boosts set in state:', inventory.length);
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

