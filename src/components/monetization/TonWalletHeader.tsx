import React, { useState, useEffect, useCallback } from 'react';
import {
    useAddress,
    useBalance,
} from '@ton/appkit-react';
import { tonConnectUI } from '@/lib/ton-appkit';
import { Wallet, Loader2, LogOut, Copy, Check, ExternalLink } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * TonWalletHeader — compact wallet badge for shop header.
 *
 * Uses tonConnectUI directly (not hidden TonConnectButton) for:
 * - openModal() to connect
 * - disconnect() to disconnect
 * - Custom dropdown menu with address, balance, actions
 *
 * Server-side persistence via profiles.ton_wallet_address
 */
export const TonWalletHeader: React.FC = () => {
    const liveAddress = useAddress();
    const balanceData = useBalance();
    const rawBalance = balanceData && 'balance' in balanceData ? (balanceData as any).balance : null;
    const isBalanceLoading = (balanceData as any).isLoading;
    const { profileId } = useUserContext();
    const { t } = useLanguage();

    const [savedAddress, setSavedAddress] = useState<string | null>(null);
    const [apiBalance, setApiBalance] = useState<string | null>(null);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [restoreTimedOut, setRestoreTimedOut] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load saved wallet address from DB on mount
    useEffect(() => {
        if (!profileId || dbLoaded) return;
        supabase
            .from('profiles')
            .select('ton_wallet_address')
            .eq('id', profileId)
            .maybeSingle()
            .then(({ data }: { data: any }) => {
                if (data?.ton_wallet_address) {
                    setSavedAddress(data.ton_wallet_address);
                }
                setDbLoaded(true);
            });
    }, [profileId, dbLoaded]);

    // Fetch balance from toncenter API as fallback (AppKit balance may be null initially)
    useEffect(() => {
        const addr = liveAddress || savedAddress;
        if (!addr) return;
        (async () => {
            try {
                const res = await fetch(
                    `https://toncenter.com/api/v2/getAddressBalance?address=${addr}`
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

    // Timeout: if TonConnect doesn't restore within 15s, stop showing spinner
    useEffect(() => {
        if (!savedAddress || liveAddress) {
            if (liveAddress) setRestoreTimedOut(false);
            return;
        }
        
        // Increased timeout to 15s for better reliability on mobile networks
        const timer = setTimeout(() => {
          if (!liveAddress) {
            console.warn('[TON] Restoration timed out after 15s');
            setRestoreTimedOut(true);
          }
        }, 15000); 
        
        return () => clearTimeout(timer);
    }, [savedAddress, liveAddress]);

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-ton-menu]')) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [showMenu]);

    const handleConnect = useCallback(() => {
        if ((tonConnectUI.modal as any).open) return;
        try {
            tonConnectUI.openModal();
        } catch (e) {
            console.error('[TON] Failed to open modal:', e);
        }
    }, []);

    const handleDisconnect = useCallback(async () => {
        try {
            await tonConnectUI.disconnect();
            setSavedAddress(null);
            setApiBalance(null);
            setShowMenu(false);
        } catch (e) {
            console.error('[TON] Disconnect failed:', e);
        }
    }, []);

    const handleCopy = useCallback(() => {
        const addr = liveAddress || savedAddress;
        if (addr) {
            navigator.clipboard.writeText(addr).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [liveAddress, savedAddress]);

    const handleExplorer = useCallback(() => {
        const addr = liveAddress || savedAddress;
        if (addr) {
            window.open(`https://tonviewer.com/${addr}`, '_blank');
            setShowMenu(false);
        }
    }, [liveAddress, savedAddress]);

    // Derived state
    const tonBalance = rawBalance ? (Number(rawBalance) / 1e9).toFixed(2) : null;
    const isLiveConnected = !!liveAddress;
    const hasSavedWallet = !!savedAddress;
    const showConnected = isLiveConnected || hasSavedWallet;
    const isRestoring = hasSavedWallet && !isLiveConnected && !restoreTimedOut;
    const activeAddress = liveAddress || savedAddress;

    // Not connected and no saved wallet — show Connect button
    if (!showConnected) {
        return (
            <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0098EA]/15 hover:bg-[#0098EA]/25 rounded-xl border border-[#0098EA]/30 active:scale-95 transition-all"
            >
                <Wallet className="w-3.5 h-3.5 text-[#0098EA]" />
                <span className="text-[11px] font-bold text-[#0098EA]">
                    {t('wallet.connect')}
                </span>
            </button>
        );
    }

    // Choose which balance to show
    let displayBalance: string;
    // Session is saved in DB but not live — user needs to reconnect for payments
    const isStale = hasSavedWallet && !isLiveConnected && restoreTimedOut;
    if (isRestoring) {
        displayBalance = apiBalance ? `${apiBalance} TON` : '···';
    } else if (isLiveConnected) {
        displayBalance = isBalanceLoading ? (apiBalance ? `${apiBalance} TON` : '···') : `${tonBalance || apiBalance || '0.00'} TON`;
    } else {
        displayBalance = apiBalance
            ? `${apiBalance} TON`
            : `${savedAddress!.slice(0, 4)}..${savedAddress!.slice(-4)}`;
    }

    const showSpinner = isRestoring && !apiBalance;
    const shortAddr = activeAddress
        ? `${activeAddress.slice(0, 4)}···${activeAddress.slice(-4)}`
        : '';

    return (
        <div className="relative" data-ton-menu>
            {/* Balance badge */}
            <button
                onClick={() => setShowMenu(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border active:scale-95 transition-all ${
                    isStale
                        ? 'bg-amber-500/12 hover:bg-amber-500/20 border-amber-500/25'
                        : 'bg-[#0098EA]/12 hover:bg-[#0098EA]/20 border-[#0098EA]/25'
                }`}
            >
                {showSpinner ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#0098EA] flex-shrink-0 animate-spin" />
                ) : (
                    <Wallet className={`w-3.5 h-3.5 flex-shrink-0 ${isStale ? 'text-amber-400' : 'text-[#0098EA]'}`} />
                )}
                <span className={`text-[11px] font-bold whitespace-nowrap tabular-nums ${isStale ? 'text-amber-400' : 'text-[#0098EA]'}`}>
                    {displayBalance}
                </span>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[10001]"
                     style={{ animation: 'fadeInDown 0.15s ease-out' }}
                >
                    {/* Address header */}
                    <div className="px-4 pt-3 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#0098EA]/20 flex items-center justify-center flex-shrink-0">
                                <Wallet className="w-3.5 h-3.5 text-[#0098EA]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-medium uppercase tracking-wider ${isStale ? 'text-amber-400/70' : 'text-white/40'}`}>
                                    {isLiveConnected ? t('wallet.connected') : isRestoring ? t('wallet.restoring') : t('wallet.reconnectRequired')}
                                </p>
                                <p className="text-[12px] text-white/80 font-mono truncate">
                                    {shortAddr}
                                </p>
                            </div>
                        </div>
                        {/* Balance */}
                        <div className="mt-2.5 mb-1 text-center">
                            <span className="text-xl font-bold text-white tabular-nums">
                                {displayBalance}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-400" />
                            ) : (
                                <Copy className="w-4 h-4 text-white/50" />
                            )}
                            <span className="text-[13px] text-white/70">
                                {copied ? t('wallet.copied') : t('wallet.copyAddress')}
                            </span>
                        </button>

                        <button
                            onClick={handleExplorer}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4 text-white/50" />
                            <span className="text-[13px] text-white/70">
                                {t('wallet.openExplorer')}
                            </span>
                        </button>

                        {!isLiveConnected && hasSavedWallet && (
                            <button
                                onClick={() => { handleConnect(); setShowMenu(false); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-[#0098EA]/10 active:bg-[#0098EA]/20 transition-colors"
                            >
                                <Wallet className="w-4 h-4 text-[#0098EA]" />
                                <span className="text-[13px] text-[#0098EA] font-medium">
                                    {t('wallet.reconnect')}
                                </span>
                            </button>
                        )}

                        <div className="mx-2 my-1 border-t border-white/5" />

                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                        >
                            <LogOut className="w-4 h-4 text-red-400/70" />
                            <span className="text-[13px] text-red-400/70">
                                {t('wallet.disconnect')}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
