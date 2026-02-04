import React, { Suspense, lazy } from 'react';
import { useDuelStore } from '@/store/duelStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Lazy load modals to prevent circular dependencies
const ExitDuelModal = lazy(() => import('../../ExitDuelModal').then(m => ({ default: m.ExitDuelModal })));
const ReconnectionModal = lazy(() => import('../../ReconnectionModal').then(m => ({ default: m.ReconnectionModal })));

interface ArenaModalsProps {
    duelId: string;
    profileId: string | null;
    showSurrenderModal: boolean;
    setShowSurrenderModal: (open: boolean) => void;
    onExit: () => void;
    transitionToResults: () => void;
}

export const ArenaModals: React.FC<ArenaModalsProps> = ({
    duelId,
    profileId,
    showSurrenderModal,
    setShowSurrenderModal,
    onExit,
    transitionToResults
}) => {
    // Reconnection state from store
    const showReconnectionModal = useDuelStore(state => state.showReconnectionModal);
    const isReconnecting = useDuelStore(state => state.isReconnecting);
    const reconnectAttempt = useDuelStore(state => state.reconnectAttempt);
    const setReconnectionState = useDuelStore(state => state.setReconnectionState);

    const handleReconnect = async () => {
        setReconnectionState({ isReconnecting: true, reconnectAttempt: reconnectAttempt + 1 });

        // Try to restore connection
        try {
            // Send heartbeat
            await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'heartbeat',
                    duel_id: duelId,
                    profile_id: profileId,
                },
            });

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if duel is still active
            const { data: duel } = await supabase
                .from('duels')
                .select('status')
                .eq('id', duelId)
                .single() as { data: any };

            if (duel?.status === 'active') {
                setReconnectionState({ showReconnectionModal: false, isReconnecting: false });
            } else {
                toast.error('Дуэль уже завершена');
                transitionToResults();
            }
        } catch (error) {
            console.error('[ArenaModals] Reconnection error:', error);
            toast.error('Не удалось восстановить соединение');
            setReconnectionState({ isReconnecting: false });
        }
    };

    return (
        <>
            {/* Surrender Modal */}
            <Suspense fallback={null}>
                <ExitDuelModal
                    open={showSurrenderModal}
                    onOpenChange={setShowSurrenderModal}
                    duelId={duelId}
                    onSurrender={onExit}
                />
            </Suspense>

            {/* Reconnection Modal */}
            <Suspense fallback={null}>
                <ReconnectionModal
                    open={showReconnectionModal}
                    onResume={handleReconnect}
                    onSurrender={onExit}
                    isReconnecting={isReconnecting}
                />
            </Suspense>
        </>
    );
};
