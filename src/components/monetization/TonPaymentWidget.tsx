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
 * race condition при восстановлении сессии.
 *
 * Флоу подключения:
 *   1. openModal() — открывает QR/выбор кошелька
 *   2. onStatusChange(wallet) — ловим момент подключения
 *   3. onModalStateChange(closed) — ловим закрытие без подключения
 *   4. sendTransaction() — отправляем транзакцию после подключения
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
    const [isRestoring, setIsRestoring] = useState(() => !tonConnectionIsRestored);
    const autoPayTriggered = useRef(false);

    // Subscribe to wallet state
    useEffect(() => {
        setWallet(tonConnectUI.wallet);
        const unsub = tonConnectUI.onStatusChange((w) => {
            setWallet(w ?? null);
        });
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
        // Always check live state — React state may lag behind
        if (tonConnectUI.wallet) {
            setWallet(tonConnectUI.wallet);
            await doTransfer();
            return;
        }

        // Not connected — open connect modal, wait for result
        setIsPaying(true);

        try {
            await new Promise<void>((resolve, reject) => {
                let settled = false;

                // 1. Listen for wallet connection (ignore initial null replay)
                const unsubStatus = tonConnectUI.onStatusChange((w) => {
                    if (w && !settled) {
                        settled = true;
                        unsubStatus();
                        unsubModal();
                        setWallet(w);
                        resolve();
                    }
                });

                // 2. Listen for modal close without connecting
                const unsubModal = tonConnectUI.onModalStateChange((state) => {
                    if (state.status === 'closed' && !tonConnectUI.wallet && !settled) {
                        settled = true;
                        unsubStatus();
                        unsubModal();
                        reject(new Error('cancelled'));
                    }
                });

                tonConnectUI.openModal().catch((err) => {
                    if (!settled) {
                        settled = true;
                        unsubStatus();
                        unsubModal();
                        reject(err);
                    }
                });
            });

            // Connected! Wait for TonConnect to close its modal, then send tx
            await new Promise(r => setTimeout(r, 600));
            await doTransfer();
        } catch {
            // User closed modal or error — just reset
            setIsPaying(false);
        }
    }, [doTransfer]);

    // Auto-pay on mount (only if wallet already connected)
    useEffect(() => {
        if (autoPay && wallet && !autoPayTriggered.current) {
            autoPayTriggered.current = true;
            doTransfer();
        }
    }, [autoPay, wallet, doTransfer]);

    // Compact mode without wallet — hide (Connect button is in header)
    if (mode === 'compact' && !wallet && !isRestoring) return null;

    // Restoring session — show spinner
    if (isRestoring) {
        return (
            <div className={cn('transition-all duration-300', className)}>
                <Button
                    disabled
                    className="w-full h-9 text-[11px] rounded-xl font-bold flex items-center justify-center gap-2 bg-[#0088cc]/40 text-white"
                >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>TON...</span>
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('transition-all duration-300', className)}>
            <Button
                disabled={isPaying}
                onClick={handlePayment}
                className={cn(
                    "w-full h-9 text-[11px] rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                    wallet
                        ? "bg-[#0088cc] hover:bg-[#1098dc] text-white"
                        : "bg-[#0088cc]/70 hover:bg-[#0088cc] text-white"
                )}
            >
                {isPaying ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{wallet ? (t('monetization.ton.processing') || 'Обработка...') : 'Подключение...'}</span>
                    </>
                ) : (
                    <>
                        {wallet ? <Zap className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                        <span>
                            {wallet
                                ? `${t('monetization.ton.pay') || 'Оплатить'} ${amountTon} TON`
                                : `TON · ${amountTon}`
                            }
                        </span>
                    </>
                )}
            </Button>
        </div>
    );
};
