import React, { useState, useEffect, useCallback, useRef } from "react";
import { tonConnectUI, tonConnectionRestored, tonConnectionIsRestored } from '@/lib/ton-appkit';
import { Loader2, Zap, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const RECIPIENT = "UQBIEbX1WnJ-tVNvR9AqzsLGueW8K9idJlDFSBkm6xJiT6-m";

interface TonPaymentWidgetProps {
    packageKey?: string;
    amountTon?: number;
    description?: string;
    onSuccess?: () => void;
    className?: string;
    autoPay?: boolean;
    mode?: 'full' | 'compact';
}

/**
 * TonPaymentWidget — прямая оплата через tonConnectUI.sendTransaction().
 *
 * Не использует AppKit hooks (useAddress, useTransferTon) — они имеют
 * race condition при восстановлении сессии и показывают null для
 * компонентов смонтированных после события подключения.
 *
 * tonConnectUI.onStatusChange() возвращает текущий стейт сразу при подписке
 * (если кошелёк подключён), поэтому мы всегда видим актуальный стейт.
 */
export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
    amountTon = 1.5,
    description = "Skily Premium",
    onSuccess,
    className,
    mode = 'compact',
    autoPay = false,
}) => {
    const { t } = useLanguage();
    const [wallet, setWallet] = useState(() => tonConnectUI.wallet);
    const [isPaying, setIsPaying] = useState(false);
    // Wait for CloudStorage restoration before showing connect button
    const [isRestoring, setIsRestoring] = useState(() => !tonConnectionIsRestored);
    const autoPayTriggered = useRef(false);

    // Subscribe to wallet state — fires immediately with current wallet if connected
    useEffect(() => {
        setWallet(tonConnectUI.wallet);
        const unsub = tonConnectUI.onStatusChange((w) => {
            setWallet(w ?? null);
        });
        // Mark restoration complete so we show correct button state
        if (!tonConnectionIsRestored) {
            tonConnectionRestored.finally(() => {
                setWallet(tonConnectUI.wallet);
                setIsRestoring(false);
            });
        }
        return unsub;
    }, []);

    const doTransfer = useCallback(async () => {
        try {
            setIsPaying(true);
            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: RECIPIENT,
                    amount: BigInt(Math.floor(amountTon * 1e9)).toString(),
                    payload: '',
                }],
            });
            toast.success('✅ Premium активирован!');
            onSuccess?.();
        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg.includes('User rejects') || msg.includes('User rejected') || msg.includes('Reject request')) {
                toast.info(t('monetization.ton.cancelled') || 'Оплата отменена');
            } else {
                console.error('[TON Payment]', err);
                toast.error(t('monetization.ton.failed') || 'Ошибка оплаты. Попробуй ещё раз.');
            }
        } finally {
            setIsPaying(false);
        }
    }, [amountTon, onSuccess, t]);

    const handlePayment = useCallback(async () => {
        if (wallet) {
            // Кошелёк подключён — сразу отправляем транзакцию
            await doTransfer();
        } else {
            // Кошелёк не подключён — открываем модал коннекта.
            // После подключения даём TonConnect UI закрыть свой модал (setTimeout 0),
            // затем вызываем sendTransaction — иначе TonConnect открывает новый флоу
            // поверх незакрытого модала коннекта и выглядит как повторный коннект.
            setIsPaying(true);
            const unsub = tonConnectUI.onStatusChange((w) => {
                if (!w) {
                    setIsPaying(false);
                    unsub();
                    return;
                }
                unsub();
                setWallet(w);
                // Ждём закрытия модала коннекта перед sendTransaction
                setTimeout(() => { doTransfer(); }, 500);
            });
            try {
                await tonConnectUI.openModal();
            } catch {
                setIsPaying(false);
                unsub();
            }
        }
    }, [wallet, doTransfer]);

    // Авто-оплата при монтировании (только если кошелёк уже подключён)
    useEffect(() => {
        if (autoPay && wallet && !autoPayTriggered.current) {
            autoPayTriggered.current = true;
            doTransfer();
        }
    }, [autoPay, wallet, doTransfer]);

    // В compact-режиме без кошелька — скрываем (кнопка Connect есть в шапке)
    if (mode === 'compact' && !wallet && !isRestoring) return null;

    // Пока ждём восстановления сессии — не показываем кнопки
    if (isRestoring) {
        return (
            <div className={cn('transition-all duration-300', className)}>
                <Button
                    disabled
                    className={cn(
                        "w-full font-bold flex items-center justify-center gap-2",
                        "bg-[#0088cc]/40 text-white",
                        mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                    )}
                >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Проверка кошелька...</span>
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('transition-all duration-300', className)}>
            {wallet ? (
                <Button
                    disabled={isPaying}
                    onClick={handlePayment}
                    className={cn(
                        "w-full font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                        "bg-[#0088cc] hover:bg-[#1098dc] text-white",
                        mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                    )}
                >
                    {isPaying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('monetization.ton.processing') || 'Обработка...'}</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4" />
                            <span>{t('monetization.ton.pay') || 'Оплатить'} {amountTon} TON</span>
                        </>
                    )}
                </Button>
            ) : (
                <Button
                    disabled={isPaying}
                    onClick={handlePayment}
                    className={cn(
                        "w-full font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                        "bg-[#0088cc]/70 hover:bg-[#0088cc] text-white",
                        mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                    )}
                >
                    {isPaying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Подключение...</span>
                        </>
                    ) : (
                        <>
                            <Wallet className="w-4 h-4" />
                            <span>Подключить & Оплатить {amountTon} TON</span>
                        </>
                    )}
                </Button>
            )}

            {mode === 'full' && (
                <div className="mt-3 text-center">
                    <p className="text-[10px] text-muted-foreground opacity-60">Secure TON Payment</p>
                </div>
            )}
        </div>
    );
};
