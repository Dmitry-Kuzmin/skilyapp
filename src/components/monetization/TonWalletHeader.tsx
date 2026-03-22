import React, { useRef, useState, useEffect } from 'react';
import {
    useAddress,
    useBalance,
    TonConnectButton
} from '@ton/appkit-react';
import { Wallet, Loader2 } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * TON Wallet Header — shows balance from live TonConnect OR saved DB address.
 *
 * Flow:
 * 1. App loads → reads saved ton_wallet_address from Supabase profile
 * 2. Shows "restoring..." state with saved address
 * 3. TonConnect restores session → shows live balance
 * 4. If TonConnect fails → still shows saved address (user knows wallet was connected)
 */
export const TonWalletHeader: React.FC = () => {
    const liveAddress = useAddress();
    const { balance: rawBalance, isLoading: isBalanceLoading } = useBalance();
    const { profileId } = useUserContext();
    const tcRef = useRef<HTMLDivElement>(null);
    const [savedAddress, setSavedAddress] = useState<string | null>(null);
    const [dbLoaded, setDbLoaded] = useState(false);

    // Load saved wallet address from DB on mount
    useEffect(() => {
        if (!profileId || dbLoaded) return;
        supabase
            .from('profiles')
            .select('ton_wallet_address')
            .eq('id', profileId)
            .maybeSingle()
            .then(({ data }) => {
                if (data?.ton_wallet_address) {
                    setSavedAddress(data.ton_wallet_address);
                }
                setDbLoaded(true);
            });
    }, [profileId, dbLoaded]);

    const tonBalance = rawBalance
        ? (Number(rawBalance) / 1e9).toFixed(2)
        : null;

    // Determine display state
    const isLiveConnected = !!liveAddress;
    const hasSavedWallet = !!savedAddress;
    const showConnected = isLiveConnected || hasSavedWallet;
    const isRestoring = hasSavedWallet && !isLiveConnected;

    // Not connected and no saved wallet — show Connect button
    if (!showConnected) {
        return (
            <div className="scale-[0.78] origin-right">
                <TonConnectButton />
            </div>
        );
    }

    // Connected or restoring — show balance badge
    const handleTap = () => {
        const btn = tcRef.current?.querySelector('button') ||
                    tcRef.current?.querySelector('div[role="button"]') ||
                    tcRef.current?.firstElementChild;
        if (btn instanceof HTMLElement) {
            btn.click();
        }
    };

    const displayBalance = isRestoring
        ? '···'
        : isBalanceLoading
            ? '···'
            : `${tonBalance || '0.00'} TON`;

    return (
        <div className="relative">
            <button
                onClick={handleTap}
                className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 bg-[#0098EA]/12 rounded-xl border border-[#0098EA]/20 active:scale-95 transition-transform"
            >
                {isRestoring ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0 animate-spin" />
                ) : (
                    <Wallet className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0" />
                )}
                <span className="text-[11px] font-bold text-[#0098EA] whitespace-nowrap tabular-nums">
                    {displayBalance}
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
