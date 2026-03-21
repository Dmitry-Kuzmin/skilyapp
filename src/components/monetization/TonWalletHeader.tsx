import React from 'react';
import {
    useAddress,
    useBalance,
    TonConnectButton
} from '@ton/appkit-react';
import { Wallet, CheckCircle2 } from 'lucide-react';

export const TonWalletHeader: React.FC = () => {
    const address = useAddress();
    const { balance: rawBalance, isLoading: isBalanceLoading } = useBalance();

    const tonBalance = rawBalance
        ? (Number(rawBalance) / 1e9).toFixed(2)
        : null;

    if (!address) {
        return (
            <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground hidden xs:block" />
                <span className="hidden sm:block text-[10px] font-bold text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                    Not Connected
                </span>
                <div className="scale-[0.75] sm:scale-[0.85] origin-right">
                    <TonConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-[#0088cc]/10 dark:bg-[#0088cc]/20 rounded-full border border-[#0088cc]/20 transition-all hover:border-[#0088cc]/40">
            <CheckCircle2 className="w-3 h-3 text-[#0088cc] flex-shrink-0" />
            <span className="hidden sm:block text-[10px] font-mono font-bold text-foreground whitespace-nowrap">
                {address.slice(0, 4)}…{address.slice(-4)}
            </span>
            <span className="hidden md:block text-[9px] font-black text-[#0088cc] whitespace-nowrap">
                {isBalanceLoading ? '...' : `${tonBalance} TON`}
            </span>
            <div className="scale-[0.65] origin-center -ml-1">
                <TonConnectButton />
            </div>
        </div>
    );
};
