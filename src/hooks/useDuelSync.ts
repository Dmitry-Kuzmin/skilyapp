import { useCallback } from 'react';

interface UseDuelSyncProps {
  fetchBoostInventory: () => Promise<any[]>;
  fetchBetInfo: () => Promise<any>;
  fetchPlayers: () => Promise<{
    myPlayerId: string;
    myScore: number;
    opponentScore: number;
    myName: string;
    opponentName: string;
    myPhotoUrl: string | null;
    opponentPhotoUrl: string | null;
  } | null>;
  setBoosts: React.Dispatch<React.SetStateAction<any[]>>;
  setBetInfo: React.Dispatch<React.SetStateAction<any>>;
  setMyPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setMyScore: React.Dispatch<React.SetStateAction<number>>;
  setOpponentScore: React.Dispatch<React.SetStateAction<number>>;
  setMyName: React.Dispatch<React.SetStateAction<string>>;
  setOpponentName: React.Dispatch<React.SetStateAction<string>>;
  setMyPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setOpponentPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useDuelSync({
  fetchBoostInventory,
  fetchBetInfo,
  fetchPlayers,
  setBoosts,
  setBetInfo,
  setMyPlayerId,
  setMyScore,
  setOpponentScore,
  setMyName,
  setOpponentName,
  setMyPhotoUrl,
  setOpponentPhotoUrl,
}: UseDuelSyncProps) {
  const syncBoostInventory = useCallback(async () => {
    try {
      const inventory = await fetchBoostInventory();
      setBoosts(inventory.filter((item) => item.quantity > 0));
    } catch (error) {
      console.error('[useDuelSync] Error syncing boosts:', error);
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

  const syncPlayers = useCallback(async () => {
    try {
      const players = await fetchPlayers();
      if (!players) return;

      setMyPlayerId(players.myPlayerId);
      setMyScore(players.myScore);
      setOpponentScore(players.opponentScore);
      setMyName(players.myName);
      setOpponentName(players.opponentName);
      setMyPhotoUrl(players.myPhotoUrl);
      setOpponentPhotoUrl(players.opponentPhotoUrl);
    } catch (error) {
      console.error('[useDuelSync] Error syncing players:', error);
    }
  }, [
    fetchPlayers,
    setMyPlayerId,
    setMyScore,
    setOpponentScore,
    setMyName,
    setOpponentName,
    setMyPhotoUrl,
    setOpponentPhotoUrl,
  ]);

  return {
    syncBoostInventory,
    syncBetInfo,
    syncPlayers,
  };
}

