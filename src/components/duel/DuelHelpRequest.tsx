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
            // 1. Отправляем запрос через Edge Function или напрямую создаем уведомление хосту
            // Сначала найдем хоста дуэли
            const { data: duel, error: duelError } = await supabase
                .from('duels' as any)
                .select('host_user')
                .eq('id', duelId)
                .single();

            if (duelError || !(duel as any)?.host_user) throw new Error('Хост не найден');

            // 2. Создаем уведомление для хоста
            const { error: notifyError } = await supabase.from('duel_notifications' as any).insert({
                user_id: (duel as any).host_user,
                duel_id: duelId,
                type: 'help_requested',
                title: 'Нужна помощь!',
                message: `Другу не хватает ${missingAmount} монет для начала битвы. Поможете?`,
                metadata: {
                    duel_id: duelId,
                    amount: missingAmount,
                    requester_id: profileId,
                }
            });

            if (notifyError) throw notifyError;

            setRequestStatus('sent');
            toast.info('Запрос отправлен хосту. Ожидайте...');
        } catch (error: any) {
            console.error('Help request error:', error);
            toast.error('Не удалось отправить запрос');
            setRequestStatus('failed');
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className={cn("p-6 rounded-[2rem] bg-amber-500/5 border-2 border-amber-500/20 backdrop-blur-md space-y-4", className)}>
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0 animate-pulse">
                    <Heart className="w-6 h-6 text-white fill-white/20" />
                </div>
                <div className="flex-1 space-y-1">
                    <h4 className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none uppercase tracking-tight">
                        НУЖНА ПОМОЩЬ?
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">
                        Вам не хватает <span className="text-amber-600 font-bold">{missingAmount} монет</span>.
                        Попросите хоста доплатить за вас, чтобы начать дуэль прямо сейчас!
                    </p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {requestStatus === 'idle' || requestStatus === 'failed' ? (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Button
                            onClick={handleRequestHelp}
                            disabled={isRequesting}
                            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-base shadow-xl shadow-amber-500/20 transition-all group overflow-hidden"
                        >
                            {isRequesting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    <span>ЗАПРОСИТЬ ПОМОЩЬ</span>
                                </div>
                            )}
                        </Button>
                    </motion.div>
                ) : requestStatus === 'sent' ? (
                    <motion.div
                        key="sent"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center py-2 space-y-3"
                    >
                        <div className="flex items-center gap-2 text-amber-600 font-black text-sm uppercase tracking-widest animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Ожидаем ответа хоста...</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center italic">
                            Хост получит уведомление и сможет доплатить недостающую сумму
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="accepted"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-3"
                    >
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-emerald-600 font-black uppercase text-sm">ПОМОЩЬ ПОЛУЧЕНА!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {requestStatus === 'failed' && (
                <div className="flex items-center gap-2 text-red-500 justify-center">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ошибка отправки</span>
                </div>
            )}
        </div>
    );
}
