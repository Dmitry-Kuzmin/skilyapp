import React from 'react';
import { 
    useAddress, 
    useBalance, 
    TonConnectButton 
} from '@ton/appkit-react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TonWalletHeader: React.FC = () => {
    const address = useAddress();
    const { data: balanceData, isLoading: isBalanceLoading } = useBalance();

    const tonBalance = balanceData
        ? (Number(balanceData) / 1e9).toFixed(2)
        : null;

    if (!address) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full border border-border/50 scale-90 sm:scale-100 origin-right transition-all">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Wallet Not Connected</span>
                <div className="ml-1 scale-75">
                    <TonConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 pl-3 pr-1 py-1 bg-[#0088cc]/10 dark:bg-[#0088cc]/20 rounded-full border border-[#0088cc]/20 transition-all hover:border-[#0088cc]/40">
            <div className="flex flex-col items-start leading-none gap-0.5 pr-2 border-r border-[#0088cc]/10">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#0088cc]" />
                    <span className="text-[10px] font-mono font-bold text-foreground">
                        {address.slice(0, 4)}…{address.slice(-4)}
                    </span>
                </div>
                <span className="text-[9px] font-black text-[#0088cc]">
                    {isBalanceLoading ? '...' : `${tonBalance} TON`}
                </span>
            </div>
            <div className="scale-[0.65] origin-center -ml-1">
                <TonConnectButton />
            </div>
        </div>
    );
};
