/**
 * PasskeyOnboardingWrapper
 *
 * Обёртка для PasskeyOnboarding с хуком внутри UserProvider.
 * Когда PASSKEY_ENABLED = false — не импортирует ни PasskeyOnboarding, ни passkey.ts,
 * не делает DB-запросов. Включить: поставить PASSKEY_ENABLED = true в feature-flags.ts.
 */

import { PASSKEY_ENABLED } from '@/lib/feature-flags';
import { usePasskeyOnboarding } from '@/hooks/usePasskeyOnboarding';

// Lazy-load only when feature is enabled to keep the disabled bundle clean.
// When PASSKEY_ENABLED = false, this import is never evaluated at runtime.
const PasskeyOnboarding = PASSKEY_ENABLED
  ? require('@/components/auth/PasskeyOnboarding').PasskeyOnboarding
  : null;

export function PasskeyOnboardingWrapper() {
  const { shouldShow, dismiss } = usePasskeyOnboarding();

  // shouldShow is always false when PASSKEY_ENABLED = false (see hook)
  if (!PASSKEY_ENABLED || !PasskeyOnboarding) return null;

  return (
    <PasskeyOnboarding
      open={shouldShow}
      onOpenChange={dismiss}
    />
  );
}
