import React, { useCallback } from "react";
import { 
    useBalance,
    useTransferTon,
    useAddress,
} from '@ton/appkit-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Loader2, Zap, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface TonPaymentWidgetProps {
    packageKey: string;
    amountTon: number;
    description: string;
    onSuccess?: () => void;
    className?: string;
    mode?: 'full' | 'compact';
}

/**
 * TonPaymentWidget - Финальная версия на базе AppKit (Alpha).
 * Работает через официальные хуки для прямой доставки транзакций.
 */
export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
    packageKey,
    amountTon,
    description,
    onSuccess,
    className,
    mode = 'compact',
}) => {
    const { t } = useLanguage();
    const address = useAddress();
    const { balance } = useBalance();
    const { transfer } = useTransferTon();
    const [tonConnectUI] = useTonConnectUI();
    
    // Состояние локальной загрузки
    const [isPaying, setIsPaying] = React.useState(false);

    // Функция оплаты
    const handlePayment = useCallback(async () => {
        if (!address) {
            toast.error(t('monetization.ton.notConnected'));
            return;
        }

        try {
            setIsPaying(true);
            
            // Адрес получателя (Твой кошелек)
            const recipientAddress = "UQA_gXv9V0r9lP-_N2mX7aJmNb_fUfS7FfR9vP0_V0r9lX7f"; // Замени на свой актуальный адрес

            // Отправляем транзакцию через AppKit
            await transfer({
                messages: [
                    {
                        address: recipientAddress,
                        amount: (amountTon * 1e9).toString(), // Конвертируем в наноТОНы
                        payload: description, // Комментарий к платежу
                    },
                ],
            });

            toast.success(t('monetization.ton.success'));
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('[TON Payment Error]:', error);
            
            // Обработка отмены пользователем
            if (error?.message?.includes('User rejects') || error?.toString()?.includes('User rejected')) {
                toast.info(t('monetization.ton.cancelled'));
            } else {
                toast.error(t('monetization.ton.failed'));
            }
        } finally {
            setIsPaying(false);
        }
    }, [address, amountTon, description, transfer, onSuccess, t]);

    // Функция открытия модалки подключения
    const handleConnect = useCallback(async () => {
        if (tonConnectUI) {
            await tonConnectUI.openModal();
        }
    }, [tonConnectUI]);

    // Если кошелек не подключен - в компактном режиме ничего не рендерим (согласно UX правилу)
    if (!address && mode === 'compact') {
        return null;
    }

    return (
        <div className={cn('transition-all duration-300 relative', className)}>
            <div className="flex flex-col relative z-20">
                {!address ? (
                    <Button 
                        onClick={handleConnect}
                        className="w-full h-11 bg-[#0088cc] hover:bg-[#1098dc] text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Wallet className="w-4 h-4" />
                        <span>Connect Wallet</span>
                    </Button>
                ) : (
                    <Button
                        disabled={isPaying}
                        onClick={handlePayment}
                        className={cn(
                            "w-full font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg",
                            "bg-[#0088cc] hover:bg-[#1098dc] text-white",
                            mode === 'compact' ? "h-9 text-[11px] rounded-lg" : "h-11 text-[13px] rounded-xl"
                        )}
                    >
                        {isPaying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t('monetization.ton.processing')}</span>
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
