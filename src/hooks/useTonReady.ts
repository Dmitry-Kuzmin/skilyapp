import { useEffect, useState } from 'react';
import { useAddress } from '@ton/appkit-react';
import { tonConnectUI, tonConnectionRestored } from '@/lib/ton-appkit';

/**
 * Reliable wallet address hook for Telegram Mini App TonConnect.
 *
 * The problem:
 *   useAddress() from @ton/appkit-react initializes as null and updates only
 *   via events. When TonPaymentModal opens after the wallet was already
 *   connected, the component misses the connection event → useAddress() stays
 *   null → payment button wrongly opens the connect modal.
 *
 * The fix — two independent sources, take whichever is non-null:
 *   1. useAddress() from AppKit  — reactive, updates on future events
 *   2. nativeAddress from tonConnectUI.wallet — synchronous read after restore
 *
 * isReady gates both until connectionRestored resolves, preventing premature
 * openModal() calls during CloudStorage restoration.
 */
export function useTonReady(): { isReady: boolean; address: string | null } {
    const [isReady, setIsReady] = useState(false);
    // Source 1: AppKit reactive hook (correct for components mounted early)
    const appKitAddress = useAddress();
    // Source 2: direct TonConnect read (catches components mounted after connect)
    const [nativeAddress, setNativeAddress] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to future wallet status changes via TonConnectUI directly
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
            setNativeAddress(wallet?.account?.address ?? null);
        });

        // After restoration completes, do a synchronous read of current state
        tonConnectionRestored.finally(() => {
            const currentAddr = tonConnectUI.wallet?.account?.address ?? null;
            setNativeAddress(currentAddr);
            setIsReady(true);
        });

        return () => unsubscribe();
    }, []);

    // Prefer AppKit address (friendly format), fall back to raw TonConnect address
    const address = appKitAddress ?? nativeAddress;

    return { isReady, address: isReady ? address : null };
}
