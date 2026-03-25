import { createContext, useContext, ReactNode } from 'react';
import { useAddress } from '@ton/appkit-react';

/**
 * TonAddressContext — React Context for the connected TON wallet address.
 *
 * Why this exists instead of calling useAddress() directly:
 *   useAddress() from @ton/appkit-react initializes as null and only updates
 *   via subscription events. Components mounted BEFORE the wallet-connected event
 *   (like TonWalletHeader) work fine. Components mounted AFTER (like TonPaymentModal)
 *   miss the event and stay null forever — even though the wallet IS connected.
 *
 *   React Context solves this: TonAddressProvider (always mounted in AppKitProvider
 *   as a parent) holds the current address. Late-mounted children read the CURRENT
 *   context value immediately on their first render — no event needed.
 */

const TonAddressContext = createContext<string | null>(null);

export function TonAddressProvider({ children }: { children: ReactNode }) {
    const address = useAddress();
    return (
        <TonAddressContext.Provider value={address ?? null}>
            {children}
        </TonAddressContext.Provider>
    );
}

/** Returns the current TON wallet address from Context. Safe for late-mounted components. */
export function useTonAddress(): string | null {
    return useContext(TonAddressContext);
}
