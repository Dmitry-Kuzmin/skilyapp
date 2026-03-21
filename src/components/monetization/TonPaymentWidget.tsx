import React, { useCallback } from 'react';
import {
    TonConnectButton,
    useAddress,
    useBalance,
    useTransferTon,
} from '@ton/appkit-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Loader2, Zap, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const PAYMENT_ADDRESS = import.meta.env.VITE_TON_WALLET_ADDRESS || 'UQAzTCbe_ctk_sQaFODVLmRaz-Cy4zC75u4OohEHdsOe5EIt';

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
    const [tonConnectUI] = useTonConnectUI();
    const { mutateAsync: transferTon, isPending: isPaying } = useTransferTon();

    const handleConnect = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        triggerHapticFeedback('light');
        tonConnectUI.openModal();
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
            await transferTon({
                recipientAddress: PAYMENT_ADDRESS,
                amount,
                comment,
            });
            triggerHapticFeedback('success');
            toast.success(`Платёж ${amount} TON отправлен!`);
        } catch (err) {
            console.error('[TON] Payment error:', err);
            if (!err?.toString().includes('User rejected')) {
                toast.error('Ошибка платежа');
            }
            triggerHapticFeedback('error');
        }
    }, [address, transferTon, handleConnect]);

    return (
        <div className={cn('transition-all duration-300 relative', className)}>
            <div className="flex flex-col relative z-20">
                {!address ? (
                    mode === 'compact' ? null : (
                        <Button 
                            onClick={handleConnect}
                            className="w-full h-11 bg-[#0088cc] hover:bg-[#1098dc] text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Wallet className="w-4 h-4" />
                            <span>Connect Wallet</span>
                        </Button>
                    )
                ) : (
                    <Button
                        disabled={isPaying}
                        onClick={(e) => handlePay(defaultAmount, defaultComment, e)}
                        className="w-full h-11 bg-gradient-to-r from-[#0088cc] to-[#0077bb] hover:brightness-110 text-white font-bold rounded-xl text-[13px] shadow-lg shadow-[#0088cc]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white flex-shrink-0" />}
                        <span>Купить за {defaultAmount} TON</span>
                    </Button>
                )}
            </div>
        </div>
    );
};
