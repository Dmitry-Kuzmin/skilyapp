import { useEffect, useState } from 'react';
import { useAddress } from '@ton/appkit-react';
import { tonConnectionRestored } from '@/lib/ton-appkit';

/**
 * Wraps AppKit's useAddress() with a readiness gate.
 *
 * Problem: useAddress() returns null on first render because TonConnect
 * restoration from CloudStorage is async (~100-500ms). Components that
 * check !address immediately fire openModal(), interrupting a restore
 * that would have succeeded on its own.
 *
 * Fix: expose address only after tonConnectionRestored resolves.
 * AppKit's useAddress() is the authoritative source (same state shown
 * in TonWalletHeader). We do NOT use tonConnectUI.wallet directly
 * because AppKit manages its own internal state separately.
 */
export function useTonReady(): { isReady: boolean; address: string | null } {
    const [isReady, setIsReady] = useState(false);
    // AppKit's hook — same source as TonWalletHeader, correct once restored
    const address = useAddress();

    useEffect(() => {
        tonConnectionRestored.finally(() => setIsReady(true));
    }, []);

    return { isReady, address: isReady ? (address ?? null) : null };
}
