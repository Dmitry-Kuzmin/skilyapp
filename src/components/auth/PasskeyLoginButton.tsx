/**
 * PasskeyLoginButton
 * 
 * Кнопка для входа через Passkey (Face ID / Touch ID / Windows Hello)
 * Премиальный дизайн с subtle эффектами
 */

import { useState, useEffect } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loginWithPasskey, isPasskeySupported, isPlatformAuthenticatorAvailable } from '@/lib/passkey';
import { useNavigate } from 'react-router-dom';

interface PasskeyLoginButtonProps {
  onSuccess?: () => void;
}

export function PasskeyLoginButton({ onSuccess }: PasskeyLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Проверка поддержки при монтировании
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPasskeySupported();
      setIsSupported(supported);

      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
        
        // ВАЖНО: Всегда показываем кнопку если браузер поддерживает
        // Browser сам покажет доступные Passkeys (или предложит другое устройство)
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
          title: '✅ Вход выполнен',
          description: 'Добро пожаловать обратно!',
        });

        onSuccess?.();

        // Редирект на главную
        setTimeout(() => {
          navigate('/');
        }, 300);
      } else {
        // Улучшенная обработка ошибок
        const errorMessage = result.error || 'Не удалось войти через Passkey';
        
        // Если Passkey не найден - предлагаем зарегистрировать
        if (errorMessage.includes('not found') || errorMessage.includes('не найден')) {
          toast({
            title: 'Passkey не настроен',
            description: 'Сначала войдите через email и добавьте устройство в настройках',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Ошибка входа',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('[PasskeyLoginButton] Error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить вход',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Не показываем если не поддерживается
  if (!isSupported || !isAvailable) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Разделитель */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-2 text-zinc-500 font-semibold tracking-wider">
            Или
          </span>
        </div>
      </div>

      {/* Кнопка входа через Passkey */}
      <Button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group relative overflow-hidden"
      >
        {/* Glow эффект при hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        
        {/* Контент */}
        <div className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Вход...</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5" />
              <span>Войти с помощью устройства</span>
            </>
          )}
        </div>
      </Button>

      {/* Подсказка */}
      <p className="text-xs text-center text-zinc-500">
        Face ID • Touch ID • Windows Hello
      </p>
    </div>
  );
}

