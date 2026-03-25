import { useEffect, useState } from 'react';
import { useAddress } from '@ton/appkit-react';
import { tonConnectUI, tonConnectionRestored } from '@/lib/ton-appkit';
import { getGlobalTonAddress } from '@/hooks/useTonWalletSync';

/**
 * Reliable wallet address hook for Telegram Mini App TonConnect.
 *
 * Why useAddress() alone fails:
 *   AppKit's useAddress() hook initializes as null and updates only via events.
 *   TonWalletHeader (mounted early) receives the "wallet connected" event → works.
 *   TonPaymentModal (mounted later) misses the event → useAddress() stays null
 *   → payment button opens connect modal even though wallet IS connected.
 *
 * Three-source strategy (first non-null wins):
 *   1. useAddress() from AppKit — reactive, updates on future events
 *   2. getGlobalTonAddress() — populated by TonWalletSyncHandler (always mounted
 *      early in AppKitProvider), guaranteed to have seen the connection event
 *   3. tonConnectUI.onStatusChange — catches live connect/disconnect events
 *
 * isReady gates everything until connectionRestored resolves.
 */
export function useTonReady(): { isReady: boolean; address: string | null } {
    const [isReady, setIsReady] = useState(false);
    const appKitAddress = useAddress(); // Source 1: reactive AppKit hook
    const [nativeAddress, setNativeAddress] = useState<string | null>(null); // Source 3

    useEffect(() => {
        // Source 3: subscribe to live TonConnect events
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
            setNativeAddress(wallet?.account?.address ?? null);
        });

        tonConnectionRestored.finally(() => {
            // Source 2: read from global cache (TonWalletSyncHandler sees events first)
            const cached = getGlobalTonAddress();
            if (cached) setNativeAddress(cached);
            setIsReady(true);
        });

        return () => unsubscribe();
    }, []);

    // Take whichever source has the address
    const address = appKitAddress ?? nativeAddress;

    return { isReady, address: isReady ? address : null };
}
