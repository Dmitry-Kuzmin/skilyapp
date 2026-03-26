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
    const pendingPayRef = useRef(false);

    // Ref to always access latest doTransfer without re-subscribing
    const doTransfer = useCallback(async () => {
        try {
            setIsPaying(true);
            console.log('[TON Payment] Sending transaction...');
            // Signal that TonConnect will show transaction confirmation popup
            document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: true } }));
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
            document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: false } }));
        }
    }, [amountTon, onSuccess, t]);
    const doTransferRef = useRef(doTransfer);
    doTransferRef.current = doTransfer;

    // Subscribe to wallet state + auto-pay after connect
    useEffect(() => {
        setWallet(tonConnectUI.wallet);

        const unsub = tonConnectUI.onStatusChange((w) => {
            console.log('[TON Payment] onStatusChange:', w ? 'connected' : 'null');
            setWallet(w ?? null);

            // If user just connected and we have a pending payment — trigger it
            if (w && pendingPayRef.current) {
                pendingPayRef.current = false;
                console.log('[TON Payment] Wallet connected, triggering pending payment...');
                // Delay to let TonConnect close its connect modal
                setTimeout(() => {
                    doTransferRef.current();
                }, 800);
            }
        });

        // Wait for CloudStorage restoration
        if (!tonConnectionIsRestored) {
            tonConnectionRestored.finally(() => {
                setWallet(tonConnectUI.wallet);
                setIsRestoring(false);
            });
        }

        return unsub;
    }, []);

    // Reset isPaying when connect modal closes without connection (UI cleanup only)
    useEffect(() => {
        const unsub = tonConnectUI.onModalStateChange((state: any) => {
            console.log('[TON Payment] Modal state:', state?.status);
            if (state?.status === 'closed') {
                // Signal ResponsiveModal that TonConnect modal is gone
                document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: false } }));

                if (pendingPayRef.current) {
                    // Grace period — onStatusChange may fire AFTER modal closes
                    setTimeout(() => {
                        if (pendingPayRef.current && !tonConnectUI.wallet) {
                            console.log('[TON Payment] Modal closed without connection, resetting');
                            pendingPayRef.current = false;
                            setIsPaying(false);
                        }
                    }, 2500);
                }
            } else if (state?.status === 'opened') {
                // Ensure modal mode is off while TonConnect is open
                document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: true } }));
            }
        });
        return unsub;
    }, []);

    const handlePayment = useCallback(async () => {
        // Always check live TonConnect state
        const liveWallet = tonConnectUI.wallet;
        if (liveWallet) {
            console.log('[TON Payment] Wallet already connected, paying directly');
            setWallet(liveWallet);
            await doTransfer();
            return;
        }

        // Not connected — need to reconnect.
        // Show a helpful toast so user understands why the connect popup appears.
        console.log('[TON Payment] Wallet not connected, opening connect modal...');
        toast.info(t('monetization.ton.reconnect') || 'Подключите кошелёк для оплаты', { duration: 3000 });

        pendingPayRef.current = true;
        setIsPaying(true);

        // Signal ResponsiveModal BEFORE opening TonConnect — so it disables modal mode instantly
        document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: true } }));

        try {
            await tonConnectUI.openModal();
        } catch (err) {
            console.error('[TON Payment] Failed to open modal:', err);
            pendingPayRef.current = false;
            setIsPaying(false);
            document.dispatchEvent(new CustomEvent('tonconnect-modal', { detail: { open: false } }));
        }
    }, [doTransfer]);

    // Auto-pay on mount (only if wallet already connected)
    useEffect(() => {
        if (autoPay && wallet && !autoPayTriggered.current) {
            autoPayTriggered.current = true;
            doTransfer();
        }
    }, [autoPay, wallet, doTransfer]);

    // Compact mode without wallet — hide
    if (mode === 'compact' && !wallet && !isRestoring) return null;

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
