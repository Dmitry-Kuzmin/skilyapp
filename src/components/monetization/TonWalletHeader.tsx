import React from 'react';
import {
    useAddress,
    useBalance,
    TonConnectButton
} from '@ton/appkit-react';
import { Wallet } from 'lucide-react';

export const TonWalletHeader: React.FC = () => {
    const address = useAddress();
    const { balance: rawBalance, isLoading: isBalanceLoading } = useBalance();

    const tonBalance = rawBalance
        ? (Number(rawBalance) / 1e9).toFixed(2)
        : '0.00';

    // Not connected — just show the TonConnect button
    if (!address) {
        return (
            <div className="scale-[0.78] origin-right">
                <TonConnectButton />
            </div>
        );
    }

    // Connected — show balance badge, tap opens TonConnect dropdown
    return (
        <div className="relative">
            {/* Visible balance badge */}
            <div className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 bg-[#0098EA]/12 rounded-xl border border-[#0098EA]/20">
                <Wallet className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0" />
                <span className="text-[11px] font-bold text-[#0098EA] whitespace-nowrap tabular-nums">
                    {isBalanceLoading ? '···' : `${tonBalance} TON`}
                </span>
            </div>
            {/* Invisible TonConnect button stretched over the badge — handles tap/disconnect */}
            <div className="absolute inset-0 opacity-0 overflow-hidden">
                <TonConnectButton />
            </div>
        </div>
    );
};
