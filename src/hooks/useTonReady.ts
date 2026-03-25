import { useEffect, useState } from 'react';
import { tonConnectUI, tonConnectionRestored } from '@/lib/ton-appkit';

/**
 * Waits for TonConnect session restoration before exposing the wallet address.
 *
 * Problem this solves:
 * - useAddress() from AppKit returns null on first render (restoration is async).
 * - Components checking !address immediately open the connect modal, interrupting
 *   an in-flight CloudStorage restore that would have succeeded on its own.
 *
 * How it works:
 * - Subscribes to tonConnectUI.onStatusChange directly (no AppKit propagation lag).
 * - Sets isReady=true only after tonConnectionRestored resolves.
 * - Until isReady, address is always null regardless of actual state.
 */
export function useTonReady(): { isReady: boolean; address: string | null } {
    const [isReady, setIsReady] = useState(false);
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to live wallet status changes
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
            setAddress(wallet?.account?.address ?? null);
        });

        // Mark ready only after restoration completes (success or failure)
        tonConnectionRestored.finally(() => {
            setIsReady(true);
            // Sync current state after restoration resolves
            setAddress(tonConnectUI.wallet?.account?.address ?? null);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return { isReady, address };
}
