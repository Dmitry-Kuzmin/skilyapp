import { useEffect } from 'react';
import { useDuelStore } from '@/store/duelStore';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';

interface UseDuelLifecycleProps {
    duelId: string;
    profileId: string | null;
    state: any; // Realtime state from useDuelRealtime
    syncPlayers: () => Promise<any>;
    syncQuestions: () => Promise<any>;
    syncBoostInventory: () => Promise<any>;
    syncBetInfo: () => Promise<any>;
    setLoading: (loading: boolean) => void;
}

export function useDuelLifecycle({
    duelId,
    profileId,
    state,
    syncPlayers,
    syncQuestions,
    syncBoostInventory,
    syncBetInfo,
    setLoading
}: UseDuelLifecycleProps) {

    // Zustand Actions
    const syncActiveExploits = useDuelStore(state => state.syncActiveExploits);
    const cleanupExpiredExploits = useDuelStore(state => state.cleanupExpiredExploits);
    const setScreenShake = useDuelStore(state => state.setScreenShake);
    const setReconnectionState = useDuelStore(state => state.setReconnectionState);
    const lastAttackTimestamp = useDuelStore(state => state.lastAttackTimestamp);

    // 1. Reset Game State on Mount/Unmount
    useEffect(() => {
        useDuelStore.getState().resetGame();
        return () => {
            useDuelStore.getState().resetGame();
        };
    }, []);

    // 2. Data Synchronization (Questions, Players, etc.)
    useEffect(() => {
        if (!duelId || !profileId) {
            console.log('[DuelLifecycle] ⚠️ Missing duelId or profileId:', { duelId, profileId });
            return;
        }

        const startSync = async () => {
            setLoading(true);
            console.log('[DuelLifecycle] 🚀 startSync started', { duelId });

            let playersLoaded = false;

            // Load players first (critical)
            const playersPromise = syncPlayers().then(() => {
                playersLoaded = true;
                return true;
            }).catch((err: any) => {
                console.error('[DuelLifecycle] Error loading players:', err);
                return false;
            });

            // Timeout for players load
            const timeoutPromise = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000));
            await Promise.race([playersPromise, timeoutPromise]);

            if (!playersLoaded) {
                console.warn('[DuelLifecycle] ⚠️ Players load timed out, proceeding anyway...');
            }

            // Load questions (always attempt)
            syncQuestions();

            // Load secondary data
            syncBoostInventory();
            syncBetInfo();
        };

        startSync();
    }, [duelId, profileId]);

    // 3. Reconnection Check
    useEffect(() => {
        if (!duelId || !profileId) return;

        const checkReconnection = async () => {
            try {
                const { data: duel } = await supabase
                    .from('duels')
                    .select('status')
                    .eq('id', duelId)
                    .single() as { data: any | null };

                if (duel?.status === 'active') {
                    const { data: myPlayer } = await supabase
                        .from('duel_players')
                        .select('is_connected, last_heartbeat_at')
                        .eq('duel_id', duelId)
                        .eq('user_id', profileId)
                        .single() as { data: any | null };

                    // Если игрок был оффлайн, просто ставим статус реконнекта (без модалки с кнопками)
                    // Это предотвратит показ "Обнаружена активная дуэль" когда пользователь уже в ней.
                    if (!myPlayer?.is_connected) {
                        setReconnectionState({ isReconnecting: true });
                    }
                }
            } catch (error) {
                console.error('[DuelLifecycle] Error checking reconnection:', error);
            }
        };

        const timeout = setTimeout(checkReconnection, 1000);
        return () => clearTimeout(timeout);
    }, [duelId, profileId, setReconnectionState]);

    // 4. Realtime Exploits Sync
    useEffect(() => {
        if (!state.activeExploits) return;
        syncActiveExploits(state.activeExploits);
        console.log('[DuelLifecycle] 🔄 activeExploits synced to store:', {
            count: state.activeExploits.length,
            types: state.activeExploits.map((e: any) => e.type)
        });
    }, [state.activeExploits, syncActiveExploits]);

    // 5. Attack Effects (Screen Shake)
    useEffect(() => {
        if (lastAttackTimestamp > 0) {
            haptics.attackReceived();
            sounds.attackWhoosh();
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 500);
        }
    }, [lastAttackTimestamp, setScreenShake]);

    // 6. Cleanup Expired Exploits
    useEffect(() => {
        const interval = setInterval(() => {
            cleanupExpiredExploits();
        }, 1000);
        return () => clearInterval(interval);
    }, [cleanupExpiredExploits]);
}
