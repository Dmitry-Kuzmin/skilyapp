import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { tonConnectUI } from '@/lib/ton-appkit';

/**
 * TonAddressContext — React Context for the connected TON wallet address.
 * 
 * Replaces AppKit's useAddress() and @tonconnect/ui-react hooks 
 * with direct subscription to the global TonConnectUI instance.
 * 
 * This guarantees the address is always sync with the SDK state, 
 * bypassing any React Context provider hierarchy issues.
 */

const TonAddressContext = createContext<string | null>(null);

export function TonAddressProvider({ children }: { children: ReactNode }) {
    // Immediate initialization from existing session
    const [address, setAddress] = useState<string | null>(() => {
        return tonConnectUI?.wallet?.account?.address || null;
    });

    useEffect(() => {
        if (!tonConnectUI) return;

        // Reactive sync with wallet events
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
            const newAddr = wallet?.account?.address || null;
            console.log(`[TonAddressContext] 🔄 Status Changed:`, {
                connected: !!wallet,
                address: newAddr,
                platform: (window as any).Telegram?.WebApp?.platform || 'unknown'
            });
            setAddress(newAddr);
        });

        // Forced refresh when returning to tab or app
        const handleSync = () => {
            const currentAddr = tonConnectUI.wallet?.account?.address || null;
            console.log(`[TonAddressContext] 🛡️ Sync Triggered - Current SDK Address:`, currentAddr);
            setAddress(currentAddr);
        };

        window.addEventListener('focus', handleSync);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[TonAddressContext] 📱 Visibility Changed -> sync');
                handleSync();
            }
        });

        // TMA specific event for returning to app
        const webApp = (window as any).Telegram?.WebApp;
        if (webApp) {
            try {
                // If WebApp has a dedicated 'back to app' or such
                // Some versions use 'activated' or 'visibilityChanged'
                webApp.onEvent('activated', handleSync);
            } catch (e) {
                console.warn('[TonAddressContext] WebApp onEvent error:', e);
            }
        }

        return () => {
            unsubscribe();
            window.removeEventListener('focus', handleSync);
            document.removeEventListener('visibilitychange', handleSync);
            if (webApp) try { webApp.offEvent('activated', handleSync); } catch {}
        };
    }, []);
    
    return (
        <TonAddressContext.Provider value={address}>
            {children}
        </TonAddressContext.Provider>
    );
}

/** Returns the current TON wallet address from Context. Safe for late-mounted components. */
export function useTonAddress(): string | null {
    return useContext(TonAddressContext);
}
