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
    try {
      const inventory = await fetchBoostInventory();
      console.log('[useDuelSync] Raw inventory:', inventory);
      const filteredBoosts = inventory.filter((item) => item.quantity > 0);
      console.log('[useDuelSync] Filtered boosts (quantity > 0):', filteredBoosts);
      setBoosts(filteredBoosts);
    } catch (error) {
      console.error('[useDuelSync] Error syncing boosts:', error);
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

