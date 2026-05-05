import { useEffect, useRef, useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { getSupabaseClient } from '@/integrations/supabase/lazyClient';

/**
 * Фоновые задачи, не блокирующие рендеринг:
 * - register-device
 * - premium-status sync
 */
export function useBackgroundTasks() {
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const supabaseUser = userContext?.supabaseUser ?? null;
  const hasRegisteredRef = useRef(false);
  const hasSyncedPremiumRef = useRef(false);

  useEffect(() => {
    if (!userContext || !profileId || !supabaseUser) return;

    const timer = setTimeout(async () => {
      const supabase = await getSupabaseClient();

      if (!hasRegisteredRef.current) {
        hasRegisteredRef.current = true;
        registerDeviceBackground(profileId, supabaseUser.id, supabase);
      }

      if (!hasSyncedPremiumRef.current) {
        hasSyncedPremiumRef.current = true;
        syncPremiumStatusBackground(profileId, supabase);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [profileId, supabaseUser]);
}

/** Генерирует простой стабильный fingerprint устройства */
function getDeviceFingerprint(): string {
  const key = 'skily_device_fp';
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const fp = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}-${Date.now()}`;
    const hash = btoa(fp).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
    localStorage.setItem(key, hash);
    return hash;
  } catch {
    return 'unknown';
  }
}

async function registerDeviceBackground(profileId: string, userId: string, supabase: any) {
  try {
    await supabase.functions.invoke('register-device', {
      body: {
        user_id: userId,                          // Edge Function ожидает user_id
        profile_id: profileId,
        device_fingerprint: getDeviceFingerprint(),
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    });
  } catch {
    // non-critical
  }
}

async function syncPremiumStatusBackground(profileId: string, supabase: any) {
  try {
    await supabase.functions.invoke('premium-status', {
      body: { user_id: profileId },             // Edge Function ожидает user_id
    });
  } catch {
    // non-critical
  }
}
