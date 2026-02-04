import { useEffect } from 'react';
import { useDuelStore } from '@/store/duelStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUtils';
import { isTelegramMiniApp as isTelegramMiniAppRaw, getTelegramWebApp as getTelegramWebAppRaw } from '@/lib/telegram';

// Safe wrappers
function safeIsTelegramMiniApp() {
    return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}
function safeGetTelegramWebApp() {
    return typeof getTelegramWebAppRaw === 'function' ? getTelegramWebAppRaw() : null;
}

interface UseDuelSafetyProps {
    duelId: string;
    profileId: string | null;
    duelStarted: boolean;
}

export function useDuelSafety({ duelId, profileId, duelStarted }: UseDuelSafetyProps) {
    const isAnswered = useDuelStore(state => state.isAnswered);
    const timeLeft = useDuelStore(state => state.timeLeft);
    const questions = useDuelStore(state => state.questions);
    const currentIndex = useDuelStore(state => state.currentIndex);

    // 1. Telegram Closing Confirmation
    useEffect(() => {
        try {
            const tg = safeGetTelegramWebApp();
            const isTG = safeIsTelegramMiniApp();

            if (!tg || !isTG) return;

            const tgAny = tg as any;
            if (typeof tgAny.enableClosingConfirmation === 'function') {
                tgAny.enableClosingConfirmation();
            }

            return () => {
                if (typeof tgAny.disableClosingConfirmation === 'function') {
                    tgAny.disableClosingConfirmation();
                }
            };
        } catch (err) {
            console.error('[useDuelSafety] Error in closing confirmation:', err);
        }
    }, []);

    // 2. Disconnect Handler (beforeunload)
    useEffect(() => {
        if (!duelId || !profileId || !duelStarted) return;

        const handleBeforeUnload = async () => {
            try {
                await supabase.functions.invoke('duel-manager', {
                    body: {
                        action: 'handle_disconnect',
                        duel_id: duelId,
                        profile_id: profileId
                    }
                });
            } catch (error) {
                console.error('[useDuelSafety] Error handling disconnect:', error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            handleBeforeUnload();
        };
    }, [duelId, profileId, duelStarted]);

    // 3. Timeout Warning (30s)
    useEffect(() => {
        if (!duelStarted || isAnswered || !questions.length) return;

        const timeoutId = setTimeout(() => {
            if (!isAnswered && timeLeft < 30000) {
                toast.warning('⏰ Поторопись! Осталось 10 секунд!', {
                    duration: 3000,
                    className: "font-bold border-red-500/50 bg-red-500/10 text-red-500"
                });
            }
        }, 30000);

        return () => clearTimeout(timeoutId);
    }, [currentIndex, duelStarted, isAnswered, timeLeft, questions.length]);

    // 4. Preload Next Image
    useEffect(() => {
        if (!questions || questions.length === 0) return;
        const nextQuestion = questions[currentIndex + 1];

        if (nextQuestion && nextQuestion.question_snapshot?.image_url) {
            const url = getImageUrl(nextQuestion.question_snapshot.image_url);
            if (url) {
                const img = new Image();
                img.src = url;
            }
        }
    }, [currentIndex, questions]);
}
