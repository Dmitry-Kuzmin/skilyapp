import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Button } from '@/components/ui/button';
import { Coins, Heart, Loader2, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

export function DuelHelpHandler() {
    const { profileId } = useUserContext();
    const [request, setRequest] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!profileId) return;

        // Подписка на уведомления о запросе помощи
        const channel = supabase
            .channel(`duel_help_requests_${profileId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'duel_notifications' as any,
                    filter: `user_id=eq.${profileId}`,
                },
                async (payload: any) => {
                    if (payload.new.type === 'help_requested') {
                        setRequest(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profileId]);

    const handleApprove = async () => {
        if (!profileId || !request) return;

        setIsProcessing(true);
        try {
            const { duel_id, amount, requester_id } = request.metadata;

            // 1. Вызываем Edge Function для перевода монет
            const { error } = await supabase.functions.invoke('duel-matchmaking', {
                body: {
                    action: 'process_help',
                    duel_id,
                    requester_id,
                    amount,
                    helper_id: profileId,
                }
            });

            if (error) throw error;

            toast.success('Помощь оказана! Монеты переведены.');
            setRequest(null);
        } catch (error: any) {
            console.error('Approve error:', error);
            toast.error('Ошибка при переводе монет');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = () => {
        setRequest(null);
    };

    if (!request) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-24 left-4 right-4 z-[100] p-6 rounded-[2rem] bg-amber-500 text-white shadow-[0_20px_50px_rgba(245,158,11,0.4)] overflow-hidden"
            >
                {/* Background Sparkles */}
                <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />

                <div className="relative z-10 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Heart className="w-6 h-6 fill-white" />
                            </div>
                            <h4 className="font-black text-lg uppercase tracking-tight">Нужна помощь другу!</h4>
                        </div>
                        <button onClick={handleReject} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                            <X size={16} />
                        </button>
                    </div>

                    <p className="text-sm font-medium leading-relaxed opacity-90">
                        Оппоненту не хватает <span className="font-black underline">{request.metadata?.amount} монет</span> для начала дуэли.
                        Поможете доплатить, чтобы начать битву прямо сейчас?
                    </p>

                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="flex-1 h-14 rounded-2xl bg-white text-amber-500 hover:bg-white/90 font-black text-base shadow-lg transition-all active:scale-95 border-none"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Coins size={18} fill="currentColor" />
                                    <span>ДОПЛАТИТЬ {request.metadata?.amount}</span>
                                </div>
                            )}
                        </Button>
                        <Button
                            onClick={handleReject}
                            variant="outline"
                            className="h-14 rounded-2xl border-white/30 text-white hover:bg-white/10 font-black text-xs transition-all active:scale-95 uppercase tracking-widest px-6"
                        >
                            Отказать
                        </Button>
                    </div>

                    <div className="text-[10px] text-center font-black uppercase opacity-60 tracking-[0.2em] pt-1">
                        Это действие будет записано в историю как "Помощь другу"
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
