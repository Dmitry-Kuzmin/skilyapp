import React, { useRef } from 'react';
import {
    useAddress,
    useBalance,
    TonConnectButton
} from '@ton/appkit-react';
import { Wallet } from 'lucide-react';

export const TonWalletHeader: React.FC = () => {
    const address = useAddress();
    const { balance: rawBalance, isLoading: isBalanceLoading } = useBalance();
    const tcRef = useRef<HTMLDivElement>(null);

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

    // Connected — show balance badge, tap triggers hidden TonConnect button click
    const handleTap = () => {
        // Find the actual button rendered by TonConnectButton inside the hidden container
        const btn = tcRef.current?.querySelector('button') ||
                    tcRef.current?.querySelector('[class*="ton-connect"]') ||
                    tcRef.current?.querySelector('div[role="button"]') ||
                    tcRef.current?.firstElementChild;
        if (btn instanceof HTMLElement) {
            btn.click();
        }
    };

    return (
        <div className="relative">
            {/* Visible balance badge — tappable */}
            <button
                onClick={handleTap}
                className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 bg-[#0098EA]/12 rounded-xl border border-[#0098EA]/20 active:scale-95 transition-transform"
            >
                <Wallet className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0" />
                <span className="text-[11px] font-bold text-[#0098EA] whitespace-nowrap tabular-nums">
                    {isBalanceLoading ? '···' : `${tonBalance} TON`}
                </span>
            </button>
            {/* Hidden TonConnect button — programmatically clicked */}
            <div
                ref={tcRef}
                className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none"
                aria-hidden="true"
            >
                <TonConnectButton />
            </div>
        </div>
    );
};
