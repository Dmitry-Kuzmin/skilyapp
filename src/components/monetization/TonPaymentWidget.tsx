/**
 * TonPaymentWidget — центральный компонент TON-оплаты через AppKit Alpha.
 *
 * Используется в:
 * - AIChatWidget (инлайн-виджет в ответах ИИ)
 * - Settings → GeneralTab (секция TON)
 * - Pricing (страница тарифов)
 *
 * Хуки AppKit:
 * - useAddress()       → адрес подключённого кошелька
 * - useBalance()       → баланс TON
 * - useTransferTon()   → отправка TON
 * - TonConnectButton   → кнопка подключения (из AppKit)
 */

import React, { useCallback } from 'react';
import {
    TonConnectButton,
    useAddress,
    useBalance,
    useTransferTon,
} from '@ton/appkit-react';
import { Loader2, Zap, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
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
    /** Режим: compact — только кнопка подключения кошелька и 1 платёж;
     *  full — все тарифы + баланс */
    mode?: 'compact' | 'full';
    /** Сумма для compact-режима (по умолчанию 1.5 TON) */
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
        if (!address) {
            toast.error('Сначала подключи TON кошелёк');
            return;
        }
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
        <div className={cn(
            'transition-all duration-300 relative',
            mode === 'compact'
                ? 'bg-transparent p-0'
                : 'rounded-3xl border border-border bg-card shadow-sm',
            className
        )}>
            {/* Анимированный блик на фоне для премиальности */}
            {mode === 'compact' && (
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#0088cc]/5 rounded-full blur-[40px] pointer-events-none" />
            )}

            {/* Header for Full Mode ONLY */}
            {mode === 'full' && (
                <div className="px-5 py-4 flex items-center justify-between border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-[#0088cc]" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">TON Smart Pay</span>
                    </div>
                    <span className="text-[10px] bg-[#0088cc]/10 text-[#0088cc] px-2.5 py-1 rounded-full font-black tracking-widest uppercase">
                        Alpha
                    </span>
                </div>
            )}

            <div className={cn(
                "flex flex-col relative z-10",
                mode === 'compact' ? "p-0" : "p-5 gap-4"
            )}>
                {/* STATE 1: Compact mode & no wallet connected */}
                {mode === 'compact' && !address ? (
                    <div className="w-full h-11 flex items-center justify-center [&>div]:w-full [&_button]:!h-11 [&_button]:!w-full [&_button]:!min-w-full [&_button]:!rounded-xl [&_button]:!text-[13px] [&_button]:!font-bold [&_button]:!bg-[#0088cc] [&_button]:!text-white hover:[&_button]:!bg-[#0077bb] [&_button]:!transition-colors [&_button]:!shadow-lg [&_button]:!shadow-[#0088cc]/20 active:scale-95 transition-transform">
                        <TonConnectButton />
                    </div>
                ) : (
                    // STATE 2: Wallet is connected OR we are in full mode
                    <>
                        {/* Connected Wallet Info Card */}
                        <div className={cn(
                            "flex items-center justify-between rounded-xl shrink-0 transition-colors",
                            mode === 'compact'
                                ? "bg-white dark:bg-slate-800/80 p-2.5 border border-slate-100 dark:border-white/5 shadow-sm"
                                : "bg-muted/40 p-3.5 border border-border/50"
                        )}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                    {address ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Wallet className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
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
                            
                            {/* TonConnectButton (Disconnet/Menu in this case since it's connected, or Connect in full mode) */}
                            <div className={cn(
                                "shrink-0 transition-opacity",
                                address 
                                    ? "[&_button]:!h-7 [&_button]:!px-2 [&_button]:!rounded-lg [&_button]:!bg-slate-100 dark:[&_button]:!bg-slate-700/50 [&_button]:!text-slate-600 dark:[&_button]:!text-slate-300 [&_button]:!text-[10px]"
                                    : "[&_button]:!h-8 [&_button]:!px-3 [&_button]:!rounded-lg [&_button]:!bg-blue-600 [&_button]:!text-white [&_button]:!text-xs [&_button]:!font-bold [&_button]:!shadow-md [&_button]:!shadow-blue-500/20"
                            )}>
                                <TonConnectButton />
                            </div>
                        </div>

                        {/* Payment Button for Compact Mode */}
                        {mode === 'compact' && address && (
                            <div className="space-y-2">
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
                                <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1 opacity-60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Кошелек: {address.slice(0, 4)}…{address.slice(-4)} {tonBalance ? `(${tonBalance} TON)` : ''}
                                </p>
                            </div>
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
                                            'relative flex flex-col items-center justify-center rounded-2xl py-4 px-2 text-center transition-all active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                                            plan.highlight
                                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 ring-1 ring-blue-500'
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
                                        
                                        {/* Subtle highlight glare effect */}
                                        {plan.highlight && (
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Full Mode specific hints */}
                        {mode === 'full' && (
                            <>
                                {!address ? (
                                    <p className="text-center text-xs font-medium text-muted-foreground pt-2">
                                        Подключи кошелёк, чтобы выбрать тариф
                                    </p>
                                ) : isPaying && (
                                    <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-blue-500 pt-2 animate-pulse">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Подтверди транзакцию в кошельке...
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
