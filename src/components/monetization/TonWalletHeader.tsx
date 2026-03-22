import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    useAddress,
    useBalance,
    TonConnectButton
} from '@ton/appkit-react';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

export const TonWalletHeader: React.FC = () => {
    const liveAddress = useAddress();
    const { balance: rawBalance, isLoading: isBalanceLoading } = useBalance();
    const { profileId } = useUserContext();
    const tcRef = useRef<HTMLDivElement>(null);
    const [savedAddress, setSavedAddress] = useState<string | null>(null);
    const [apiBalance, setApiBalance] = useState<string | null>(null);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [restoreTimedOut, setRestoreTimedOut] = useState(false);

    // ALL hooks must be called before any conditional return

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

    // Fetch balance from toncenter API when we have a saved address but no live connection
    useEffect(() => {
        if (!savedAddress || liveAddress) return;
        (async () => {
            try {
                const res = await fetch(
                    `https://toncenter.com/api/v2/getAddressBalance?address=${savedAddress}`
                );
                const data = await res.json();
                if (data.ok && data.result) {
                    setApiBalance((Number(data.result) / 1e9).toFixed(2));
                }
            } catch {
                // silent
            }
        })();
    }, [savedAddress, liveAddress]);

    // Timeout: if TonConnect doesn't restore within 5s, stop showing spinner
    useEffect(() => {
        if (!savedAddress || liveAddress) return;
        const timer = setTimeout(() => setRestoreTimedOut(true), 5000);
        return () => clearTimeout(timer);
    }, [savedAddress, liveAddress]);

    // Handle tap on the badge — programmatically click hidden TonConnectButton
    const handleTap = useCallback(() => {
        const btn = tcRef.current?.querySelector('button') ||
                    tcRef.current?.querySelector('div[role="button"]') ||
                    tcRef.current?.firstElementChild;
        if (btn instanceof HTMLElement) {
            btn.click();
        }
    }, []);

    // Derived state
    const tonBalance = rawBalance ? (Number(rawBalance) / 1e9).toFixed(2) : null;
    const isLiveConnected = !!liveAddress;
    const hasSavedWallet = !!savedAddress;
    const showConnected = isLiveConnected || hasSavedWallet;
    const isRestoring = hasSavedWallet && !isLiveConnected && !restoreTimedOut;

    // Not connected and no saved wallet — show Connect button
    if (!showConnected) {
        return (
            <div className="scale-[0.78] origin-right">
                <TonConnectButton />
            </div>
        );
    }

    // Choose which balance to show
    let displayBalance: string;
    if (isRestoring) {
        displayBalance = apiBalance ? `${apiBalance} TON` : '···';
    } else if (isLiveConnected) {
        displayBalance = isBalanceLoading ? '···' : `${tonBalance || '0.00'} TON`;
    } else {
        displayBalance = apiBalance
            ? `${apiBalance} TON`
            : `${savedAddress!.slice(0, 4)}..${savedAddress!.slice(-4)}`;
    }

    const showSpinner = isRestoring && !apiBalance;

    return (
        <div className="relative">
            <button
                onClick={handleTap}
                className="flex items-center gap-1.5 pl-2 pr-2 py-1.5 bg-[#0098EA]/12 rounded-xl border border-[#0098EA]/20 active:scale-95 transition-transform"
            >
                {showSpinner ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0 animate-spin" />
                ) : restoreTimedOut && !isLiveConnected ? (
                    <RefreshCw className="w-3.5 h-3.5 text-[#0098EA]/60 flex-shrink-0" />
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
