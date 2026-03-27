import React, { useCallback, useEffect, useState, useRef } from "react";
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTonAddress } from '@/contexts/TonAddressContext';

import { Loader2, Zap, Wallet, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTonStreaming, type TonTxStatus } from '@/hooks/useTonStreaming';

interface TonPaymentWidgetProps {
    packageKey?: string;
    amountTon?: number;
    description?: string;
    onSuccess?: () => void;
    className?: string;
    mode?: 'full' | 'compact';
}

const STATUS_CONFIG: Record<TonTxStatus, { label: string; icon: React.ReactNode; className: string } | null> = {
    idle: null,
    pending: {
        label: 'Транзакция отправлена...',
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        className: 'text-blue-400',
    },
    confirmed: {
        label: 'Включена в блок ✓',
        icon: <Clock className="w-3.5 h-3.5" />,
        className: 'text-yellow-400',
    },
    finalized: {
        label: 'Подтверждено ✓✓',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        className: 'text-green-400',
    },
    trace_invalidated: {
        label: 'Транзакция отменена',
        icon: <XCircle className="w-3.5 h-3.5" />,
        className: 'text-red-400',
    },
    error: {
        label: 'Ошибка получения статуса',
        icon: <XCircle className="w-3.5 h-3.5" />,
        className: 'text-red-400',
    },
};

/**
 * TonPaymentWidget — с поддержкой TON Center Streaming API v2.
 * Показывает статус транзакции в реальном времени:
 * idle → pending → confirmed → finalized (sub-second после Catchain 2.0)
 */
export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
    packageKey = "premium_subscription",
    amountTon = 1.5,
    description = "Skily Premium",
    onSuccess,
    className,
    mode = 'compact',
}) => {
    const { t } = useLanguage();
    const address = useTonAddress();
    const [tonConnectUI] = useTonConnectUI();
    const { status, subscribe, reset } = useTonStreaming();

    const [isPaying, setIsPaying] = useState(false);
    const [, setRefreshToken] = useState(0);

    // Refresh state when coming back to the app (handle stale wallet data)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[TON SDK] Syncing connection state on visibilitychange...');
                setRefreshToken(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handlePayment = useCallback(async () => {
        if (!address) {
            toast.error(t('monetization.ton.notConnected'));
            return;
        }

        try {
            setIsPaying(true);
            reset();
            const recipientAddress = "UQBIEbX1WnJ-tVNvR9AqzsLGueW8K9idJlDFSBkm6xJiT6-m";

            // Start streaming subscription before sending
            const apiKey = import.meta.env.VITE_TONCENTER_API_KEY as string | undefined;
            subscribe(address, apiKey);

            // Directly call sendTransaction instead of transfer() from AppKit
            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: [
                    {
                        address: recipientAddress,
                        amount: BigInt(Math.floor(amountTon * 1e9)).toString(),
                        payload: description,
                    },
                ],
            });

        } catch (error: unknown) {
            console.error('[TON Payment Error]:', error);
            reset();

            const msg = (error as { message?: string })?.message ?? String(error);
            if (msg.includes('User rejects') || msg.includes('User rejected')) {
                toast.info(t('monetization.ton.cancelled'));
            } else {
                toast.error(t('monetization.ton.failed'));
            }
        } finally {
            setIsPaying(false);
        }
    }, [address, amountTon, description, tonConnectUI, subscribe, reset, t]);

    // When finalized — call onSuccess once
    const finalizedRef = useRef(false);
    useEffect(() => {
        if (status === 'finalized' && !finalizedRef.current) {
            finalizedRef.current = true;
            toast.success(t('monetization.ton.success'));
            onSuccess?.();
        }
        if (status === 'idle') {
            finalizedRef.current = false;
        }
    }, [status, onSuccess, t]);

    const handleConnect = useCallback(async () => {
        if (tonConnectUI) await tonConnectUI.openModal();
    }, [tonConnectUI]);

    const isConnected = !!address;
    if (!isConnected && mode === 'compact') return null;

    const statusInfo = STATUS_CONFIG[status];

    return (
        <div className={cn('transition-all duration-300 relative', className)}>
            <div className="flex flex-col relative z-20">
                {!isConnected ? (
                    <Button
                        onClick={handleConnect}
                        className="w-full h-11 bg-[#0088cc] hover:bg-[#1098dc] text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Wallet className="w-4 h-4" />
                        <span>Connect Wallet</span>
                    </Button>
                ) : (
                    <>
                        <Button
                            disabled={isPaying || status === 'pending' || status === 'confirmed'}
                            onClick={handlePayment}
                            className={cn(
                                "w-full font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                                status === 'finalized'
                                    ? "bg-green-600 hover:bg-green-600 text-white"
                                    : status === 'trace_invalidated' || status === 'error'
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "bg-[#0088cc] hover:bg-[#1098dc] text-white",
                                mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-11 text-[13px] rounded-xl"
                            )}
                        >
                            {isPaying || status === 'pending' || status === 'confirmed' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{t('monetization.ton.processing')}</span>
                                </>
                            ) : status === 'finalized' ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Оплачено!</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    <span>{t('monetization.ton.pay')} {amountTon} TON</span>
                                </>
                            )}
                        </Button>

                        {/* Real-time status indicator */}
                        {statusInfo && (
                            <div className={cn(
                                "mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium",
                                statusInfo.className,
                            )}>
                                {statusInfo.icon}
                                <span>{statusInfo.label}</span>
                            </div>
                        )}
                    </>
                )}

                {mode === 'full' && (
                    <div className="mt-3 text-center">
                        <p className="text-[10px] text-muted-foreground opacity-60">
                            {t('monetization.ton.secureLabel') || "Оплата через TON Connect (Blockchain)"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
