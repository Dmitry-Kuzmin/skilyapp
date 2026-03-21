/**
 * TonPaymentWidget — центральный компонент TON-оплаты через AppKit Alpha.
 */

import React, { useCallback } from 'react';
import {
    TonConnectButton,
    useAddress,
    useBalance,
    useTransferTon,
} from '@ton/appkit-react';
import { Loader2, Zap, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/lib/telegram';
import { cn } from '@/lib/utils';

// Адрес кошелька для получения платежей
const PAYMENT_ADDRESS = import.meta.env.VITE_TON_WALLET_ADDRESS || 'UQAzTCbe_ctk_sQaFODVLmRaz-Cy4zC75u4OohEHdsOe5EIt';

interface PlanOption {
    label: string;
    amount: string;
    comment: string;
    highlight?: boolean;
}

const PLANS: PlanOption[] = [
    { label: '1 месяц', amount: '1.5', comment: 'Skily Premium 1m' },
    { label: '3 месяца', amount: '3.9', comment: 'Skily Premium 3m', highlight: true },
    { label: '12 месяцев', amount: '9.9', comment: 'Skily Premium 12m' },
];

interface TonPaymentWidgetProps {
    mode?: 'compact' | 'full';
    defaultAmount?: string;
    defaultComment?: string;
    className?: string;
}

export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
    mode = 'compact',
    defaultAmount = '1.5',
    defaultComment = 'Skily Premium',
    className,
}) => {
    const address = useAddress();
    const { data: balanceData, isLoading: isBalanceLoading } = useBalance();
    const { mutateAsync: transferTon, isPending: isPaying } = useTransferTon();

    const tonBalance = balanceData
        ? (Number(balanceData) / 1e9).toFixed(2)
        : null;

    const handlePay = useCallback(async (amount: string, comment: string) => {
        if (!address) return; // Should not happen with current button logic
        try {
            triggerHapticFeedback('light');
            await transferTon({
                recipientAddress: PAYMENT_ADDRESS,
                amount,
                comment,
            });
            triggerHapticFeedback('success');
            toast.success(`✅ Платёж ${amount} TON отправлен! Ожидай активации.`);
        } catch (err) {
            console.error('[TON] Transfer failed:', err);
            toast.error('Ошибка при создании транзакции');
            triggerHapticFeedback('error');
        }
    }, [address, transferTon]);

    return (
        <div 
            className={cn(
                'transition-all duration-300 relative group',
                mode === 'compact'
                    ? 'bg-transparent p-0'
                    : 'rounded-3xl border border-border bg-card shadow-sm',
                className
            )}
        >
            <div className={cn(
                "flex flex-col relative z-10 isolation-auto",
                mode === 'compact' ? "p-0 min-h-[44px]" : "p-5 gap-4"
            )}>
                {/* STATE 1: Compact mode & no wallet connected */}
                {mode === 'compact' && !address ? (
                    <div 
                        className="relative w-full h-11 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* 1. Наша красивая кнопка (дизайн) */}
                        <Button 
                            className="w-full h-11 bg-[#0088cc] hover:bg-[#1098dc] text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Wallet className="w-4 h-4" />
                            <span>Connect Wallet</span>
                        </Button>
                        
                        {/* 2. Кнопка библиотеки СВЕРХУ, абсолютно прозрачная и блокирует всплытие */}
                        <div className="absolute inset-0 opacity-0 cursor-pointer z-[999] [&>div]:w-full [&>div]:h-full [&_button]:!w-full [&_button]:!h-full [&_button]:!absolute [&_button]:!inset-0 [&_button]:!z-[999]">
                            <TonConnectButton />
                        </div>
                    </div>
                ) : (
                    // STATE 2: Wallet is connected OR we are in full mode
                    <>
                        {/* Compact Menu (address display) */}
                        {mode === 'compact' && address && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 p-2 border border-slate-100 dark:border-white/5 rounded-xl mb-1.5 px-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[80px]">
                                        {address.slice(0, 4)}…{address.slice(-4)}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-[#0088cc]">
                                    {isBalanceLoading ? '...' : `${tonBalance} TON`}
                                </span>
                            </div>
                        )}

                        {/* Connected Wallet Info Card (Full mode only) */}
                        {mode === 'full' && (
                            <div className="flex items-center justify-between rounded-xl shrink-0 transition-colors bg-muted/40 p-3.5 border border-border/50">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                        {address ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Wallet className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex flex-col justify-center text-left">
                                        {address ? (
                                            <>
                                                <span className="text-xs font-mono font-medium text-foreground truncate">
                                                    {address.slice(0, 4)}…{address.slice(-4)}
                                                </span>
                                                <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                    {isBalanceLoading ? (
                                                        <span className="animate-pulse">Загрузка...</span>
                                                    ) : tonBalance !== null ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400">{tonBalance} TON</span>
                                                    ) : null}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-xs font-semibold text-muted-foreground">Не подключён</span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 scale-75 origin-right">
                                    <TonConnectButton />
                                </div>
                            </div>
                        )}

                        {/* Payment Button for Compact Mode */}
                        {mode === 'compact' && address && (
                            <Button
                                disabled={isPaying}
                                onClick={() => handlePay(defaultAmount, defaultComment)}
                                className="w-full h-11 bg-gradient-to-r from-[#0088cc] to-[#0077bb] hover:brightness-110 text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isPaying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Zap className="w-4 h-4 fill-white flex-shrink-0" />
                                )}
                                <span>Оплатить {defaultAmount} TON</span>
                            </Button>
                        )}

                        {/* Pricing Cards for Full Mode */}
                        {mode === 'full' && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {PLANS.map((plan) => (
                                    <button
                                        key={plan.amount}
                                        disabled={isPaying || !address}
                                        onClick={() => handlePay(plan.amount, plan.comment)}
                                        className={cn(
                                            'relative flex flex-col items-center justify-center rounded-2xl py-4 px-2 text-center transition-all active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100 overflow-hidden outline-none',
                                            plan.highlight
                                                ? 'bg-[#0088cc] text-white shadow-xl shadow-[#0088cc]/20 ring-1 ring-[#0088cc]'
                                                : 'bg-muted/50 hover:bg-muted text-foreground border border-border/50'
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10",
                                            plan.highlight ? "text-blue-100" : "text-muted-foreground"
                                        )}>
                                            {plan.label}
                                        </span>
                                        <div className="flex items-baseline gap-0.5 relative z-10">
                                            <span className="text-xl font-black tracking-tight leading-none">
                                                {plan.amount}
                                            </span>
                                        </div>
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase mt-1 relative z-10",
                                            plan.highlight ? "text-blue-200" : "text-muted-foreground"
                                        )}>
                                            TON
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
