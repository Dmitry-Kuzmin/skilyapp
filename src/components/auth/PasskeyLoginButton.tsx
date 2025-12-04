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
        // Проверяем доступность platform authenticator для логирования
        // НО кнопку показываем в любом случае!
        // Причина: Chrome/Firefox иногда возвращают false даже когда Touch ID доступен
        // Пусть браузер сам покажет пользователю что у него есть (или нет)
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
        
        if (!available) {
          console.log('[PasskeyLoginButton] Platform authenticator not detected, but showing button anyway');
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
          title: '✅ Вход выполнен',
          description: 'Добро пожаловать обратно!',
        });

        onSuccess?.();

        // Редирект на главную
        setTimeout(() => {
          navigate('/');
        }, 300);
      } else {
        // Улучшенная обработка ошибок с Recovery подсказками
        const errorMessage = result.error || 'Не удалось войти через Passkey';
        
        // Если Passkey не найден - предлагаем зарегистрировать
        if (errorMessage.includes('not found') || errorMessage.includes('не найден')) {
          toast({
            title: 'Passkey не настроен',
            description: 'Войдите через email и добавьте устройство в Настройках → Безопасность',
            variant: 'destructive',
            duration: 6000,
          });
        } 
        // Если пользователь отменил (закрыл диалог Face ID)
        else if (errorMessage.includes('abort') || errorMessage.includes('cancel') || errorMessage.includes('отменено')) {
          toast({
            title: 'Вход отменён',
            description: 'Вы можете войти через email или попробовать Passkey снова',
            duration: 4000,
          });
        }
        // Rate limit превышен
        else if (errorMessage.includes('Rate limit') || errorMessage.includes('Too many')) {
          toast({
            title: 'Слишком много попыток',
            description: 'Подождите минуту или войдите через email',
            variant: 'destructive',
            duration: 6000,
          });
        }
        // Другие ошибки
        else {
          toast({
            title: 'Не удалось войти',
            description: 'Попробуйте снова или используйте вход через email',
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
        title: isUserCancellation ? 'Вход отменён' : 'Ошибка входа',
        description: isUserCancellation 
          ? 'Вы можете войти через email' 
          : 'Не удалось войти через Passkey. Используйте вход через email',
        variant: isUserCancellation ? 'default' : 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Не показываем если браузер не поддерживает WebAuthn
  // НЕ проверяем isAvailable - пусть браузер сам решает!
  // Chrome иногда возвращает false даже когда Touch ID доступен
  if (!isSupported) {
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

      {/* Подсказки */}
      <div className="space-y-1">
        <p className="text-xs text-center text-zinc-500">
          Face ID • Touch ID • Windows Hello
        </p>
        <p className="text-xs text-center text-zinc-600">
          Нет доступа к устройству? Используйте вход через email выше
        </p>
      </div>
    </div>
  );
}

