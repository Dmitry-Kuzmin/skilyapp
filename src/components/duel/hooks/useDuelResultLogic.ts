import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveDuelResultSnapshot } from '@/utils/duelResultSnapshot';
import { DuelResultSnapshot, DuelPlayer } from '@/features/duel/shared';

const getIsDev = () => Boolean(import.meta.env.DEV);
const log = (...args: any[]) => { if (getIsDev()) console.log(...args); };
const logError = (...args: any[]) => { if (getIsDev()) console.error(...args); };

interface UseDuelResultLogicProps {
    duelId: string;
    profileId: string | null;
    myScore: number;
    opponentScore: number;
    opponentName: string;
    onDuelFinished: (snapshot?: DuelResultSnapshot) => void;
    players?: DuelPlayer[];
}

export function useDuelResultLogic({
    duelId,
    profileId,
    myScore,
    opponentScore,
    opponentName,
    onDuelFinished,
    players: initialPlayers
}: UseDuelResultLogicProps) {

    // 1. Create Snapshot from DB Data
    const createDuelResultSnapshot = useCallback(async (): Promise<DuelResultSnapshot | null> => {
        try {
            log('[DuelResultLogic] 📸 Creating snapshot before transition...');

            // Load data if not fully available
            const [duelResult, playersResult] = await Promise.all([
                supabase.from('duels').select('*').eq('id', duelId).maybeSingle(),
                supabase
                    .from('duel_players')
                    .select('*, profiles(id, username, first_name, photo_url)')
                    .eq('duel_id', duelId),
            ]);

            if (duelResult.data && playersResult.data && playersResult.data.length >= 2) {
                const players = playersResult.data;
                const myPlayer = players.find((p: any) => p.user_id === profileId);
                const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

                if (myPlayer && opponentPlayer) {
                    const myPlayerIdForSnapshot = myPlayer.id;
                    const opponentPlayerId = opponentPlayer.id;

                    // Load answers
                    const [myAnswersResult, opponentAnswersResult] = await Promise.all([
                        supabase
                            .from('duel_answers')
                            .select('*, duel_questions(*)')
                            .eq('duel_id', duelId)
                            .eq('player_id', myPlayerIdForSnapshot)
                            .order('created_at'),
                        supabase
                            .from('duel_answers')
                            .select('*, duel_questions(*)')
                            .eq('duel_id', duelId)
                            .eq('player_id', opponentPlayerId)
                            .order('created_at'),
                    ]);

                    const myAnswers = myAnswersResult.data || [];
                    const opponentAnswers = opponentAnswersResult.data || [];

                    // Calculate final results
                    const myScoreFinal = myPlayer.score || myScore;
                    const opponentScoreFinal = opponentPlayer.score || opponentScore;
                    const myCorrect = myPlayer.correct_count || 0;
                    const opponentCorrect = opponentPlayer.correct_count || 0;
                    const opponent = opponentPlayer.profiles || {};
                    const duelData = duelResult.data;

                    const isWinner = myScoreFinal > opponentScoreFinal;
                    const isDraw = myScoreFinal === opponentScoreFinal;

                    let winnings = 0;
                    let insuranceRefund = 0;
                    if (duelData.bet_amount > 0) {
                        if (isWinner) {
                            winnings = duelData.bet_amount * 2;
                        } else if (isDraw) {
                            winnings = duelData.bet_amount;
                        }
                        if (!isWinner && !isDraw && duelData.insurance_used) {
                            insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
                        }
                    }

                    const snapshot: DuelResultSnapshot = {
                        duelId,
                        duel: duelData,
                        players,
                        myPlayer,
                        opponentPlayer,
                        myAnswers,
                        opponentAnswers,
                        results: {
                            isWinner,
                            isDraw,
                            myScore: myScoreFinal,
                            opponentScore: opponentScoreFinal,
                            myCorrect,
                            opponentCorrect,
                            opponentName: opponent?.username || opponent?.first_name || opponentName,
                            opponentAvatar: opponent?.photo_url || null,
                            betAmount: duelData.bet_amount || 0,
                            winnings,
                            insuranceRefund,
                            insuranceUsed: duelData.insurance_used || false,
                        },
                        timestamp: Date.now(),
                    };

                    saveDuelResultSnapshot(snapshot);
                    log('[DuelResultLogic] ✅ Snapshot created successfully');
                    return snapshot;
                } else {
                    log('[DuelResultLogic] ⚠️ Could not find players for snapshot');
                    return null;
                }
            } else {
                log('[DuelResultLogic] ⚠️ Could not load duel data for snapshot, will be created by useDuelResults');
                return null;
            }
        } catch (error) {
            logError('[DuelResultLogic] ❌ Error creating snapshot:', error);
            return null;
        }
    }, [duelId, profileId, myScore, opponentScore, opponentName]);

    // 2. Create Snapshot from Server Response
    const createSnapshotFromServerData = useCallback((data: any): DuelResultSnapshot | null => {
        try {
            if (!data.duel_data || !data.players_data) return null;

            const players = data.players_data;
            const myPlayer = players.find((p: any) => p.user_id === profileId);
            const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

            if (!myPlayer || !opponentPlayer) return null;

            const myScoreFinal = myPlayer.score;
            const opponentScoreFinal = opponentPlayer.score;
            const isWinner = myScoreFinal > opponentScoreFinal;
            const isDraw = myScoreFinal === opponentScoreFinal;

            const duelData = data.duel_data;
            let winnings = 0;
            let insuranceRefund = 0;
            if (duelData.bet_amount > 0) {
                if (isWinner) winnings = duelData.bet_amount * 2;
                else if (isDraw) winnings = duelData.bet_amount;

                if (!isWinner && !isDraw && (duelData.insurance_used || duelData.host_insurance_enabled)) {
                    insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
                }
            }

            const opponentProfile = opponentPlayer.profiles || {};

            return {
                duelId,
                duel: duelData,
                players,
                myPlayer,
                opponentPlayer,
                myAnswers: data.my_answers || [],
                opponentAnswers: data.opponent_answers || [],
                results: {
                    isWinner,
                    isDraw,
                    myScore: myScoreFinal,
                    opponentScore: opponentScoreFinal,
                    myCorrect: myPlayer.correct_count || 0,
                    opponentCorrect: opponentPlayer.correct_count || 0,
                    opponentName: opponentProfile.username || opponentProfile.first_name || opponentPlayer.name || 'Соперник',
                    opponentAvatar: opponentProfile.photo_url || null,
                    betAmount: duelData.bet_amount || 0,
                    winnings,
                    insuranceRefund,
                    insuranceUsed: !!(duelData.insurance_used || duelData.host_insurance_enabled)
                },
                timestamp: Date.now()
            };
        } catch (err) {
            logError('[DuelResultLogic] Error building snapshot from server data:', err);
            return null;
        }
    }, [duelId, profileId]);

    // 3. Transition Handler
    const transitionToResults = useCallback(async (serverData?: any) => {
        let snapshot: DuelResultSnapshot | null = null;

        if (serverData && serverData.duel_data) {
            log('[DuelResultLogic] ⚡ Building snapshot from server response data');
            snapshot = createSnapshotFromServerData(serverData);
        }

        if (!snapshot) {
            log('[DuelResultLogic] 📸 Creating snapshot via standard fetching');
            snapshot = await createDuelResultSnapshot();
        }

        log('[DuelResultLogic] 🚀 Transitioning to results with snapshot');
        onDuelFinished(snapshot || undefined);
    }, [createDuelResultSnapshot, createSnapshotFromServerData, onDuelFinished]);

    return {
        createDuelResultSnapshot,
        createSnapshotFromServerData,
        transitionToResults
    };
}
