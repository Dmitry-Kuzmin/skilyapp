import { useEffect, useRef, useState } from 'react';
import { useAddress } from '@ton/appkit-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Module-level cache of the current TON wallet address.
 * Populated by TonWalletSyncHandler (always mounted inside AppKitProvider).
 * Lets late-mounted components (TonPaymentModal) get the address without
 * relying on useAddress() which misses events fired before component mounts.
 */
let _globalTonAddress: string | null = null;

export function getGlobalTonAddress(): string | null {
    return _globalTonAddress;
}

/**
 * Syncs TON wallet address to Supabase profiles.
 * - When wallet connects → saves address to DB
 * - When wallet disconnects → clears address from DB
 * - Runs silently in background, no UI impact
 */
export function useTonWalletSync() {
  const address = useAddress();
  const { profileId } = useUserContext();
  const lastSyncedRef = useRef<string | null>(null);

  // Keep global cache in sync — used by late-mounted components (useTonReady)
  useEffect(() => {
    _globalTonAddress = address ?? null;
  }, [address]);

  useEffect(() => {
    if (!profileId) return;

    const addressToSave = address || null;

    // Skip if already synced this value
    if (lastSyncedRef.current === addressToSave) return;
    lastSyncedRef.current = addressToSave;

    // Save to Supabase (fire-and-forget)
    supabase
      .from('profiles')
      .update({ ton_wallet_address: addressToSave } as any)
      .eq('id', profileId)
      .then(({ error }) => {
        if (error) {
          console.error('[TON Sync] Failed to save wallet address:', error.message);
        } else {
          console.log('[TON Sync]', addressToSave ? `Saved: ${addressToSave.slice(0, 8)}...` : 'Cleared wallet address');
        }
      });
  }, [address, profileId]);
}

/**
 * Loads saved TON wallet address from the user's profile.
 * Returns the saved address (or null) for display before TonConnect restores.
 */
export function useSavedTonAddress(): string | null {
  const { profileId } = useUserContext();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId || address !== null) return;

    supabase
      .from('profiles')
      .select('ton_wallet_address')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.ton_wallet_address) {
          setAddress(data.ton_wallet_address);
          console.log('[TON Sync] Loaded saved address:', data.ton_wallet_address.slice(0, 8) + '...');
        }
      });
  }, [profileId, address]);

  return address;
}
