import React, { useCallback, useEffect } from "react";
import {
    useBalance,
    useTransferTon,
} from '@ton/appkit-react';
import { tonConnectUI } from '@/lib/ton-appkit';
import { useTonReady } from '@/hooks/useTonReady';
import { Loader2, Zap, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSavedTonAddress } from "@/hooks/useTonWalletSync";

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
 * TonPaymentWidget - Финальная версия на базе AppKit (Alpha).
 * Работает через официальные хуки для прямой доставки транзакций.
 */
export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
    packageKey = "premium_subscription",
    amountTon = 1.5,
    description = "Skily Premium",
    onSuccess,
    className,
    mode = 'compact',
    autoPay = false,
}) => {
    const { t } = useLanguage();
    // useTonReady waits for connectionRestored before exposing address,
    // preventing premature openModal() calls during CloudStorage restore.
    const { isReady, address } = useTonReady();
    const savedAddress = useSavedTonAddress();
    const balanceRes = useBalance() as any;
    const transferRes = useTransferTon() as any;
    const balance = balanceRes?.balance;
    const transfer = transferRes?.transfer;

    // Состояние локальной загрузки
    const [isPaying, setIsPaying] = React.useState(false);

    // Функция оплаты
    const handlePayment = useCallback(async () => {
        // Don't act until restoration is confirmed — prevents false "not connected" state
        if (!isReady) return;

        if (!address) {
            if (tonConnectUI) {
                await tonConnectUI.openModal();
            } else {
                toast.error(t('monetization.ton.notConnected'));
            }
            return;
        }

        try {
            setIsPaying(true);
            
            // Адрес получателя (Твой кошелек из скриншота)
            const recipientAddress = "UQBI_W6R8P7Y9-LdG1X7b6mZ8_oQZ_R9vP0_V0r9lX7f"; 

            // Отправляем транзакцию через AppKit
            await transfer({
                messages: [
                    {
                        address: recipientAddress,
                        amount: BigInt(Math.floor(amountTon * 1e9)).toString(),
                        payload: description,
                    },
                ],
            });

            toast.success(t('monetization.ton.success'));
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('[TON Payment Error]:', error);
            
            if (error?.message?.includes('User rejects') || error?.toString()?.includes('User rejected')) {
                toast.info(t('monetization.ton.cancelled'));
            } else {
                toast.error(t('monetization.ton.failed'));
            }
        } finally {
            setIsPaying(false);
        }
    }, [isReady, address, amountTon, description, transfer, onSuccess, t]);

    // Функция открытия модалки подключения
    const handleConnect = useCallback(async () => {
        if (tonConnectUI) {
            await tonConnectUI.openModal();
        }
    }, [tonConnectUI]);

    // Авто-оплата при монтировании (только если кошелек УЖЕ подключен)
    useEffect(() => {
        if (autoPay && address && !isPaying) {
            handlePayment();
        }
    }, [autoPay, address, handlePayment]); 

    // While restoration is in progress, show spinner (never null/connect prematurely)
    if (!isReady) {
        if (mode === 'compact' && !savedAddress) return null;
        return (
            <div className={cn('transition-all duration-300', className)}>
                <Button
                    disabled
                    className={cn(
                        "w-full font-bold flex items-center justify-center gap-2",
                        "bg-[#0088cc]/50 text-white",
                        mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                    )}
                >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Восстановление...</span>
                </Button>
            </div>
        );
    }

    // After restoration: if no wallet at all in compact mode — hide
    if (!address && !savedAddress && mode === 'compact') {
        return null;
    }

    const isRestoring = !address && !!savedAddress;

    return (
        <div className={cn('transition-all duration-300 relative', className)}>
            <div className="flex flex-col relative z-20">
                {!address && !savedAddress ? (
                    <Button 
                        onClick={handleConnect}
                        className={cn(
                            "w-full font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95",
                            "bg-[#0088cc] hover:bg-[#1098dc] text-white",
                            mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                        )}
                    >
                        <Wallet className="w-4 h-4" />
                        <span>{t('monetization.ton.connect') || 'Connect TON'}</span>
                    </Button>
                ) : (
                    <Button
                        disabled={isPaying}
                        onClick={handlePayment}
                        className={cn(
                            "w-full font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                            isRestoring ? "bg-amber-500 hover:bg-amber-600 text-black px-8" : "bg-[#0088cc] hover:bg-[#1098dc] text-white",
                            mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-12 text-[14px] rounded-2xl"
                        )}
                    >
                        {isPaying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t('monetization.ton.processing')}</span>
                            </>
                        ) : isRestoring ? (
                            <>
                                <Wallet className="w-4 h-4 mr-1" />
                                <span>Восстановить & Оплатить {amountTon} TON</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                <span>
                                    {t('monetization.ton.pay')} {amountTon} TON
                                </span>
                            </>
                        )}
                    </Button>
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
