import { useState, useEffect } from 'react';
import { useTonAddress } from '@/contexts/TonAddressContext';
import { tonConnectionRestored, tonConnectionIsRestored } from '@/lib/ton-appkit';

/**
 * Reliable wallet-ready hook for TonPaymentWidget / TonPaymentModal.
 *
 * address — read from TonAddressContext (React Context set by TonAddressProvider
 *   which lives in AppKitProvider and always receives wallet events first).
 *   Late-mounted components get the CURRENT context value on first render,
 *   unlike calling useAddress() directly which starts null and waits for events.
 *
 * isReady — starts true if restoration already completed (tonConnectionIsRestored
 *   sync flag), so no spinner flashes when user opens modal after startup.
 *   Otherwise waits for tonConnectionRestored promise before gating payments.
 */
export function useTonReady(): { isReady: boolean; address: string | null } {
    const [isReady, setIsReady] = useState(tonConnectionIsRestored);
    const address = useTonAddress();

    useEffect(() => {
        if (isReady) return;
        tonConnectionRestored.finally(() => setIsReady(true));
    }, []);

    return { isReady, address: isReady ? address : null };
}
