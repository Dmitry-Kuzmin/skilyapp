/**
 * usePasskeyOnboarding Hook
 * 
 * Управляет показом онбординга Passkeys после первого входа
 * Показывается ОДИН РАЗ для Web пользователей
 */

import { useState, useEffect, useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { isPasskeySupported, isPlatformAuthenticatorAvailable, listPasskeys } from '@/lib/passkey';

const ONBOARDING_KEY = 'passkey_onboarding_shown';

export function usePasskeyOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  const userContext = useContext(UserContext);
  const supabaseUser = userContext?.supabaseUser ?? null;
  const platform = userContext?.platform ?? 'web';
  const isAuthenticated = userContext?.isAuthenticated ?? false;

  useEffect(() => {
    const checkShouldShow = async () => {
      // Не показываем если:
      // 1. Не авторизован
      if (!isAuthenticated || !supabaseUser) {
        setShouldShow(false);
        return;
      }

      // 2. Telegram платформа (там не нужны Passkeys)
      if (platform === 'telegram') {
        setShouldShow(false);
        return;
      }

      // 3. Уже показывали онбординг
      const hasShown = localStorage.getItem(ONBOARDING_KEY);
      if (hasShown === 'true') {
        setShouldShow(false);
        return;
      }

      // 4. Браузер не поддерживает Passkeys
      const supported = isPasskeySupported();
      if (!supported) {
        setShouldShow(false);
        return;
      }

      // 5. Platform authenticator недоступен
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) {
        setShouldShow(false);
        return;
      }

      // 6. У пользователя уже есть Passkeys
      const result = await listPasskeys();
      if (result.success && result.passkeys && result.passkeys.length > 0) {
        // Уже есть Passkeys - не показываем онбординг
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setShouldShow(false);
        return;
      }

      // Все условия выполнены - показываем онбординг
      // Небольшая задержка для плавности (после завершения входа)
      setTimeout(() => {
        setShouldShow(true);
      }, 1500); // 1.5 секунды после входа
    };

    checkShouldShow();
  }, [isAuthenticated, supabaseUser, platform]);

  const dismiss = () => {
    setShouldShow(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  return {
    shouldShow,
    dismiss,
  };
}

