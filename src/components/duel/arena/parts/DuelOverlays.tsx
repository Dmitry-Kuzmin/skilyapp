import { motion, AnimatePresence } from 'framer-motion';
import { BoostFeedback } from '../../BoostFeedback';
import { ArenaEffects } from './ArenaEffects';
import { ArenaModals } from './ArenaModals';
import { NotificationToast } from '@/components/NotificationToast';

interface DuelOverlaysProps {
    // Toasts
    toastNotifications: any[];
    setToastNotifications: (notifications: any[]) => void;
    isTelegramMobile: boolean;
    isTelegramDesktop: boolean;
    safeArea: any;
    progressBarTop: number;
    totalRightPadding: number;

    // Boost Feedback
    boostFeedback: {
        isActive: boolean;
        boostName: string;
        boostType: string;
    };

    // Effects
    feedbackEffect: 'correct' | 'wrong' | null;
    removeExploit: (exploitId: string) => void;

    // Modals
    duelId: string;
    profileId: string | null;
    showSurrenderModal: boolean;
    setShowSurrenderModal: (show: boolean) => void;
    onExit: () => void;
    transitionToResults: (finalSnapshot?: any) => void;
}

export function DuelOverlays({
    toastNotifications,
    setToastNotifications,
    isTelegramMobile,
    isTelegramDesktop,
    safeArea,
    progressBarTop,
    totalRightPadding,
    boostFeedback,
    feedbackEffect,
    removeExploit,
    duelId,
    profileId,
    showSurrenderModal,
    setShowSurrenderModal,
    onExit,
    transitionToResults
}: DuelOverlaysProps) {
    const PROGRESS_BAR_HEIGHT = 4;

    return (
        <>
            {/* Toast Notifications */}
            <div
                className="fixed z-50 space-y-2 max-w-sm pointer-events-none"
                style={{
                    top: `calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px) + 20px)`,
                    right: `${totalRightPadding + 16}px`
                }}
            >
                <AnimatePresence mode="popLayout">
                    {toastNotifications.map((notif) => (
                        <div key={notif.id} className="pointer-events-auto">
                            <NotificationToast
                                {...notif}
                                onClose={() => setToastNotifications(toastNotifications.filter(n => n.id !== notif.id))}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Hacking Overlay */}
            <BoostFeedback
                isActive={boostFeedback.isActive}
                boostName={boostFeedback.boostName}
                boostType={boostFeedback.boostType}
            />

            {/* Effects Layer */}
            <ArenaEffects feedbackEffect={feedbackEffect} removeExploit={removeExploit} />

            {/* Modals Layer */}
            <ArenaModals
                duelId={duelId}
                profileId={profileId}
                showSurrenderModal={showSurrenderModal}
                setShowSurrenderModal={setShowSurrenderModal}
                onExit={onExit}
                transitionToResults={transitionToResults}
            />
        </>
    );
}
