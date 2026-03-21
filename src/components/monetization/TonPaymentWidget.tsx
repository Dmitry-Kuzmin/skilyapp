/**
 * TonPaymentWidget — финальная версия на базе AppKit (Alpha).
 * Полностью убираем сторонние SDK для исключения конфликтов мостов.
 */

import React, { useCallback } from 'react';
import {
    TonConnectButton,
    useAddress,
    useBalance,
    useTransferTon,
    useTonConnectUI, // Импортируем из AppKit!
} from '@ton/appkit-react';
import { Loader2, Zap, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const PAYMENT_ADDRESS = import.meta.env.VITE_TON_WALLET_ADDRESS || 'UQAzTCbe_ctk_sQaFODVLmRaz-Cy4zC75u4OohEHdsOe5EIt';

export const TonPaymentWidget: React.FC<{
    mode?: 'compact' | 'full';
    defaultAmount?: string;
    defaultComment?: string;
    className?: string;
}> = ({
    mode = 'compact',
    defaultAmount = '1.5',
    defaultComment = 'Skily Premium',
    className,
}) => {
    const address = useAddress();
    const { data: balanceData, isLoading: isBalanceLoading } = useBalance();
    const { mutateAsync: transferTon, isPending: isPaying } = useTransferTon();
    const { tonConnectUI } = useTonConnectUI(); // Получаем экземпляр из AppKit

    const tonBalance = balanceData
        ? (Number(balanceData) / 1e9).toFixed(2)
        : null;

    const handleConnect = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        triggerHapticFeedback('light');
        if (tonConnectUI) {
            tonConnectUI.openModal();
        }
    }, [tonConnectUI]);

    const handlePay = useCallback(async (amount: string, comment: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!address) {
            handleConnect();
            return;
        }

        try {
            triggerHapticFeedback('light');
            
            // КРИТИЧНО: Используем AppKit трансфер напрямую
            await transferTon({
                recipientAddress: PAYMENT_ADDRESS,
                amount,
                comment,
            });
            
            triggerHapticFeedback('success');
            toast.success(`Платёж ${amount} TON отправлен!`);
        } catch (err) {
            console.error('[TON] Payment error:', err);
            // Если ошибка не отмена пользователем - показываем тост
            if (!err?.toString().includes('User rejected')) {
                toast.error('Ошибка платежа. Проверь кошелёк.');
            }
            triggerHapticFeedback('error');
        }
    }, [address, transferTon, handleConnect]);

    return (
        <div 
            className={cn(
                'transition-all duration-300 relative',
                mode === 'compact' ? 'bg-transparent p-0' : 'rounded-3xl border border-border bg-card p-5 gap-4',
                className
            )}
        >
            <div className={cn(
                "flex flex-col relative z-20",
                mode === 'compact' ? "p-0 min-h-[44px]" : "gap-4"
            )}>
                {!address && mode === 'compact' ? (
                    <Button 
                        onClick={handleConnect}
                        className="w-full h-11 bg-[#0088cc] hover:bg-[#1098dc] text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Wallet className="w-4 h-4" />
                        <span>Connect Wallet</span>
                    </Button>
                ) : (
                    <>
                        {address && mode === 'compact' && (
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

                        {mode === 'full' && (
                            <div className="flex items-center justify-between bg-muted/40 p-3.5 border border-border/50 rounded-xl">
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-mono font-medium truncate">
                                        {address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Не подключён'}
                                    </span>
                                    {address && (
                                        <span className="text-[10px] text-emerald-500">
                                            {isBalanceLoading ? 'Загрузка...' : `${tonBalance} TON`}
                                        </span>
                                    )}
                                </div>
                                <div className="scale-75 origin-right">
                                    <TonConnectButton />
                                </div>
                            </div>
                        )}

                        {address && mode === 'compact' && (
                            <Button
                                disabled={isPaying}
                                onClick={(e) => handlePay(defaultAmount, defaultComment, e)}
                                className="w-full h-11 bg-gradient-to-r from-[#0088cc] to-[#0077bb] hover:brightness-110 text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white flex-shrink-0" />}
                                <span>Купить за {defaultAmount} TON</span>
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
