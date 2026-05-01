/**
 * PasskeyLoginButton
 * 
 * Кнопка для входа через Passkey (Face ID / Touch ID / Windows Hello)
 * Премиальный дизайн с subtle эффектами
 */

import { useState, useEffect } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast';
import { loginWithPasskey, isPasskeySupported, isPlatformAuthenticatorAvailable } from '@/lib/passkey';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { PASSKEY_ENABLED } from '@/lib/feature-flags';

interface PasskeyLoginButtonProps {
  onSuccess?: () => void;
  variant?: 'default' | 'inline';
  className?: string;
  label?: string;
}

export function PasskeyLoginButton({ onSuccess, variant = 'default', className, label }: PasskeyLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Проверка поддержки при монтировании
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPasskeySupported();
      setIsSupported(supported);

      if (supported) {
        // КРИТИЧНО: Проверяем доступность platform authenticator
        // Если биометрия недоступна - скрываем кнопку
        // Это улучшает UX: не показываем опцию, которой нельзя воспользоваться
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
        
        if (!available) {
          console.log('[PasskeyLoginButton] Platform authenticator not available - hiding button');
        } else {
          console.log('[PasskeyLoginButton] Platform authenticator available - showing button');
        }
      }
    };

    checkSupport();
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const result = await loginWithPasskey();

      if (result.success) {
        toast({
          title: t('auth.passkey.loginSuccess'),
          description: t('auth.passkey.loginSuccessDesc'),
        });

        onSuccess?.();

        // КРИТИЧНО: Редиректим на /dashboard, а не на /, чтобы UserProvider обновил состояние
        // На /dashboard UserProvider уже загружен и сможет обработать onAuthStateChange
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 300);
      } else {
        // Улучшенная обработка ошибок с Recovery подсказками
        const errorMessage = result.error || 'Не удалось войти через Passkey';
        
        // Если Passkey не найден - предлагаем зарегистрировать
        if (errorMessage.includes('not found') || errorMessage.includes('не найден')) {
          toast({
            title: t('auth.passkey.notConfigured'),
            description: t('auth.passkey.notConfiguredDesc'),
            variant: 'destructive',
            duration: 6000,
          });
        } 
        // Если пользователь отменил (закрыл диалог Face ID)
        else if (errorMessage.includes('abort') || errorMessage.includes('cancel') || errorMessage.includes('отменено')) {
          toast({
            title: t('auth.passkey.cancelled'),
            description: t('auth.passkey.cancelledDesc'),
            duration: 4000,
          });
        }
        // Rate limit превышен
        else if (errorMessage.includes('Rate limit') || errorMessage.includes('Too many')) {
          toast({
            title: t('auth.passkey.tooManyAttempts'),
            description: t('auth.passkey.tooManyAttemptsDesc'),
            variant: 'destructive',
            duration: 6000,
          });
        }
        // Другие ошибки
        else {
          toast({
            title: t('auth.passkey.loginFailed'),
            description: t('auth.passkey.loginFailedDesc'),
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('[PasskeyLoginButton] Error:', error);
      
      // Recovery подсказка в catch блоке
      const errorMsg = error instanceof Error ? error.message : '';
      const isUserCancellation = errorMsg.includes('abort') || errorMsg.includes('cancel');
      
      toast({
        title: isUserCancellation ? t('auth.passkey.cancelled') : t('auth.passkey.error'),
        description: isUserCancellation 
          ? t('auth.passkey.cancelledDesc')
          : t('auth.passkey.errorDesc'),
        variant: isUserCancellation ? 'default' : 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Не показываем если:
  // 1. Браузер не поддерживает WebAuthn
  // 2. Биометрия недоступна (нет Face ID, Touch ID, Windows Hello)
  // Это улучшает UX - не показываем опцию, которую нельзя использовать
  if (!PASSKEY_ENABLED || !isSupported || !isAvailable) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <Button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className={cn(
          "w-full h-11 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group relative overflow-hidden",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        <div className="relative flex flex-col items-center justify-center gap-0.5">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Fingerprint className="w-4 h-4 shrink-0" />
              <span className="text-[9px] font-semibold leading-none">{label || t('auth.deviceLoginFallback')}</span>
            </>
          )}
        </div>
      </Button>
    );
  }

  const buttonContent = (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('auth.passkey.loginInProgress')}</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">{label || t('auth.deviceLoginFallback')}</span>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      {/* Разделитель */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-2 text-zinc-500 font-semibold tracking-wider">
            {t('auth.passkey.or')}
          </span>
        </div>
      </div>

      {/* Кнопка входа через Passkey */}
      <Button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className={cn(
          "w-full h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group relative overflow-hidden",
          className
        )}
      >
        {buttonContent}
      </Button>

      {/* Подсказки */}
      <div className="space-y-1">
        <p className="text-xs text-center text-zinc-500">
          {t('auth.passkey.deviceTypes')}
        </p>
        <p className="text-xs text-center text-zinc-600">
          {t('auth.passkey.noDeviceAccess')}
        </p>
      </div>
    </div>
  );
}

