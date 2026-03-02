import { useState, useEffect, useCallback } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Heart, Coins, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function DuelHelpHandler() {
    const { profileId } = useUserContext();
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [request, setRequest] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        if (!profileId) return;

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
                        setIsDone(false);
                        setOpen(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profileId]);

    const handleApprove = useCallback(async () => {
        if (!profileId || !request) return;

        setIsProcessing(true);
        try {
            const { duel_id, amount, requester_id } = request.metadata;

            const { error } = await supabase.functions.invoke('duel-matchmaking', {
                body: {
                    action: 'process_help',
                    duel_id,
                    requester_id,
                    amount,
                    helper_id: profileId,
                    profile_id: profileId,
                }
            });

            if (error) throw error;

            setIsDone(true);
            toast.success(`${amount} монет списано. Дуэль началась!`);
            setTimeout(() => setOpen(false), 1800);
        } catch (error: any) {
            console.error('[DuelHelpHandler] Approve error:', error);
            toast.error('Ошибка при подтверждении помощи');
        } finally {
            setIsProcessing(false);
        }
    }, [profileId, request]);

    const handleReject = useCallback(() => {
        setOpen(false);
        setRequest(null);
    }, []);

    const amount = request?.metadata?.amount ?? 0;

    const Content = (
        <div className="relative flex flex-col h-full w-full">
            {/* Handle bar (Mobile only) */}
            {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>
            )}

            {/* Header Icon */}
            <div className={cn('flex justify-center', isMobile ? 'pt-4 pb-4' : 'pt-2 pb-6')}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="relative"
                >
                    {isDone ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.6)]" />
                        </motion.div>
                    ) : (
                        <motion.div
                            animate={{
                                scale: [1, 1.08, 1],
                            }}
                            transition={{
                                scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                            }}
                        >
                            <Heart className="w-20 h-20 text-amber-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]" fill="rgba(251,191,36,0.2)" />
                        </motion.div>
                    )}

                    {/* Glow */}
                    <motion.div
                        className={cn(
                            'absolute inset-0 -z-10 rounded-full blur-2xl',
                            isDone ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                        )}
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1.2, 1.5, 1.2] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight text-center">
                {isDone ? 'Помощь оказана!' : 'Другу нужна помощь'}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto text-center mt-2">
                {isDone
                    ? 'Монеты списаны с вашего счёта. Дуэль запущена ⚔️'
                    : <>
                        Оппоненту не хватает{' '}
                        <span className="text-amber-400 font-bold">{amount} монет</span>{' '}
                        для начала битвы. Выручите?
                    </>
                }
            </p>

            {/* Info Cards */}
            {!isDone && (
                <div className="px-6 pb-8">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                icon: Coins,
                                label: 'Спишется с вас',
                                value: `-${amount}`,
                                valueClass: 'text-amber-400'
                            },
                            {
                                icon: Sparkles,
                                label: 'Дуэль',
                                value: 'Сразу начнётся',
                                valueClass: 'text-emerald-400'
                            }
                        ].map((item, i) => (
                            <div key={i} className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-center">
                                <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-amber-500/20 transition-colors">
                                    <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{item.label}</span>
                                    <span className={cn('text-xs font-bold', item.valueClass)}>{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            {!isDone && (
                <div className={cn('px-6 space-y-3', isMobile ? 'pb-6' : 'pb-2')}>
                    <Button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className={cn(
                            'w-full h-14 text-base shadow-2xl',
                            'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
                            'text-white font-black rounded-2xl',
                            'hover:from-amber-400 hover:to-orange-400',
                            'hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]',
                            'active:scale-[0.98]',
                            'transition-all duration-300',
                            'border-0'
                        )}
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Обрабатываем...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3">
                                <Coins className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                <span>Доплатить {amount}</span>
                            </span>
                        )}
                    </Button>

                    <Button
                        onClick={handleReject}
                        disabled={isProcessing}
                        variant="ghost"
                        className={cn(
                            'w-full h-12 text-sm',
                            'text-zinc-500 hover:text-zinc-300',
                            'bg-transparent hover:bg-white/5',
                            'font-medium rounded-xl',
                            'transition-all duration-200'
                        )}
                    >
                        Отказать
                    </Button>
                </div>
            )}

            {isDone && (
                <div className={cn('px-6', isMobile ? 'pb-6' : 'pb-4')}>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.8, ease: 'easeInOut' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="bottom"
                    className={cn(
                        'rounded-t-[32px] border-t-0',
                        'bg-[#0A0A0B]',
                        'p-0 pb-safe',
                        'max-h-[85vh]',
                        'overflow-hidden ring-1 ring-white/10'
                    )}
                    hideCloseButton
                >
                    {Content}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className={cn(
                'max-w-[380px] p-0 border-0',
                'bg-[#0A0A0B]/90 backdrop-blur-3xl',
                'shadow-2xl shadow-black/50',
                'rounded-[32px]',
                'ring-1 ring-white/10',
                'overflow-hidden'
            )}>
                {/* Decorative Gradient */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-500/10 blur-[60px] pointer-events-none" />

                <div className="relative">
                    {Content}
                </div>
            </DialogContent>
        </Dialog>
    );
}
