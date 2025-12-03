/**
 * PasskeyOnboardingWrapper
 * 
 * Обёртка для PasskeyOnboarding с хуком внутри UserProvider
 */

import { PasskeyOnboarding } from '@/components/auth/PasskeyOnboarding';
import { usePasskeyOnboarding } from '@/hooks/usePasskeyOnboarding';

export function PasskeyOnboardingWrapper() {
  const { shouldShow, dismiss } = usePasskeyOnboarding();

  return (
    <PasskeyOnboarding 
      open={shouldShow} 
      onOpenChange={dismiss} 
    />
  );
}

