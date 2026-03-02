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

    // Подписка на уведомление об оплате помощи
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
                        toast.success('Помощь получена! Начинаем дуэль...');
                        setTimeout(() => onSuccess(), 1500);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [requestStatus, duelId, profileId, onSuccess]);

    const handleRequestHelp = async () => {
        if (!profileId || !duelId) return;

        setIsRequesting(true);
        try {
            // Используем Edge Function для отправки уведомления
            // Это безопаснее, поддерживает лимиты и потенциально Telegram-уведомления
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'create_notification',
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
        <div className={cn("p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 backdrop-blur-sm relative overflow-hidden group", className)}>
            {/* Background Grain */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                    <Heart className="w-5 h-5 text-white fill-white/20" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                        Нужна помощь?
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-medium leading-tight">
                        Не хватает <span className="text-amber-600 font-bold">{missingAmount}</span> монет. Коллега выручит?
                    </p>
                </div>

                <div className="flex-shrink-0">
                    <AnimatePresence mode="wait">
                        {requestStatus === 'idle' || requestStatus === 'failed' ? (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <Button
                                    onClick={handleRequestHelp}
                                    disabled={isRequesting}
                                    size="sm"
                                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
                                >
                                    {isRequesting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>ЗАПРОСИТЬ</span>
                                        </div>
                                    )}
                                </Button>
                            </motion.div>
                        ) : requestStatus === 'sent' ? (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
                            >
                                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">Ждем...</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="accepted"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1.5 text-emerald-500"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">ГОТОВО!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {requestStatus === 'failed' && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-1.5 text-red-500 justify-center border-t border-red-500/10 pt-2"
                >
                    <AlertCircle size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-600">Ошибка отправки</span>
                </motion.div>
            )}
        </div>
    );
}
