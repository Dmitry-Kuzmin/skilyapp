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

    // Not connected — show compact connect button
    if (!address) {
        return (
            <div className="flex items-center gap-1">
                <div className="scale-[0.75] origin-right">
                    <TonConnectButton />
                </div>
            </div>
        );
    }

    // Connected — show balance + manage button
    return (
        <div className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-[#0088cc]/15 rounded-full border border-[#0088cc]/25 transition-all">
            <Wallet className="w-3 h-3 text-[#0088cc] flex-shrink-0" />
            <span className="text-[11px] font-black text-[#0088cc] whitespace-nowrap tabular-nums">
                {isBalanceLoading ? '···' : `${tonBalance} TON`}
            </span>
            <div className="scale-[0.6] origin-center -ml-1.5 -mr-1">
                <TonConnectButton />
            </div>
        </div>
    );
};
