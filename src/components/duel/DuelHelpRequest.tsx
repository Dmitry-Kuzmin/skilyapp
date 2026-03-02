import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Button } from '@/components/ui/button';
import { Coins, Heart, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

interface DuelHelpRequestProps {
    duelId: string;
    requiredAmount: number;
    userCoins: number;
    onSuccess: () => void;
    className?: string;
}

export function DuelHelpRequest({
    duelId,
    requiredAmount,
    userCoins,
    onSuccess,
    className
}: DuelHelpRequestProps) {
    const { profileId } = useUserContext();
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestStatus, setRequestStatus] = useState<'idle' | 'sent' | 'accepted' | 'failed'>('idle');

    const missingAmount = Math.max(0, requiredAmount - userCoins);

    useEffect(() => {
        if (requestStatus !== 'sent' || !profileId) return;

        const channel = supabase
            .channel(`duel_help_${duelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'duel_notifications' as any,
                    filter: `user_id=eq.${profileId}`,
                },
                async (payload: any) => {
                    if (payload.new.type === 'help_received' && payload.new.metadata?.duel_id === duelId) {
                        setRequestStatus('accepted');
                        // No more auto-toast, we show the modal instead in the render
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [requestStatus, duelId, profileId]);

    const handleRequestHelp = async () => {
        if (!profileId || !duelId) return;

        setIsRequesting(true);
        try {
            // Используем Edge Function для отправки уведомления
            // Это безопаснее, поддерживает лимиты и потенциально Telegram-уведомления
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'create_notification',
                    profile_id: profileId, // Pass explicitly to avoid 404 in resolving profile
                    duel_id: duelId,
                    type: 'help_requested',
                    title: 'НУЖНА ПОМОЩЬ! 🤝',
                    message: `Другу не хватает ${missingAmount} монет. Поможете?`,
                    metadata: {
                        duel_id: duelId,
                        amount: missingAmount,
                        requester_id: profileId,
                    }
                }
            });

            if (error) throw error;

            setRequestStatus('sent');
            toast.info('Запрос отправлен хосту');
        } catch (error: any) {
            console.error('Help request error:', error);
            toast.error('Ошибка отправки');
            setRequestStatus('failed');
        } finally {
            setIsRequesting(false);
        }
    };


    return (
        <>
            <div className={cn("p-6 rounded-[32px] bg-[#121214] border border-amber-500/20 shadow-xl relative overflow-hidden group w-full", className)}>
                {/* Background Glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none" />

                <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/20 flex-shrink-0">
                            <motion.div
                                animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Heart className="w-7 h-7 text-white fill-white/20" />
                            </motion.div>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-lg font-black text-white tracking-tight leading-none mb-2">
                                Выручить тебя? 🤝
                            </h4>
                            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                                Не хватает всего <span className="text-amber-400 font-bold">{missingAmount}</span> монет. Твой друг может помочь доплатить, чтобы вы начали битву прямо сейчас!
                            </p>
                        </div>
                    </div>

                    <div className="block w-full">
                        <AnimatePresence mode="wait">
                            {requestStatus === 'idle' || requestStatus === 'failed' ? (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full"
                                >
                                    <Button
                                        onClick={handleRequestHelp}
                                        disabled={isRequesting}
                                        className={cn(
                                            "w-full h-14 rounded-2xl font-black text-sm tracking-widest transition-all active:scale-[0.98] group/btn shadow-xl",
                                            "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 text-white"
                                        )}
                                    >
                                        {isRequesting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <div className="flex items-center justify-center gap-3">
                                                <Sparkles className="w-5 h-5 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                                                <span>ПОПРОСИТЬ ПОМОЩЬ</span>
                                            </div>
                                        )}
                                    </Button>
                                </motion.div>
                            ) : requestStatus === 'sent' ? (
                                <motion.div
                                    key="sent"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20"
                                >
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                    <span className="text-xs text-amber-400 font-black uppercase tracking-widest">Ждем ответа друга...</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                {requestStatus === 'failed' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 flex items-center gap-2 text-red-500 justify-center"
                    >
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Ошибка отправки запроса</span>
                    </motion.div>
                )}
            </div>

            {/* Premium Success Modal/Overlay */}
            <AnimatePresence>
                {requestStatus === 'accepted' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-[340px] bg-[#121214] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl overflow-hidden relative"
                        >
                            {/* Success Gradients */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/15 blur-3xl pointer-events-none" />

                            <div className="relative z-10 space-y-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    className="flex justify-center"
                                >
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-14 h-14 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                    </div>
                                </motion.div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white tracking-tight">Помощь пришла!</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        Друг доплатил нужную сумму. <br />Все готово к началу битвы.
                                    </p>
                                </div>

                                <Button
                                    onClick={() => onSuccess()}
                                    className="w-full h-14 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/40 border-0 active:scale-95 transition-all duration-300"
                                >
                                    В БОЙ!
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
