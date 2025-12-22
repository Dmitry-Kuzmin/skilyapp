/**
 * PasskeyOnboarding
 * 
 * Лаконичный онбординг для Passkeys после первого входа
 * Показывается ОДИН РАЗ, премиальный дизайн (Linear/Vercel стиль)
 * Drawer снизу для мобилок, модалка для десктопа
 */

import { useState, useEffect } from 'react';
import { Fingerprint, X, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast';
import {
  registerPasskey,
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
} from '@/lib/passkey';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface PasskeyOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Автогенерация названия устройства из User-Agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // iOS
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  
  // macOS
  if (/Macintosh/.test(ua)) {
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Mac (Safari)';
    if (/Chrome/.test(ua)) return 'Mac (Chrome)';
    return 'Mac';
  }
  
  // Windows
  if (/Windows/.test(ua)) {
    if (/Edge/.test(ua)) return 'Windows (Edge)';
    if (/Chrome/.test(ua)) return 'Windows (Chrome)';
    return 'Windows';
  }
  
  // Android
  if (/Android/.test(ua)) return 'Android';
  
  // Fallback
  return 'Это устройство';
}

export function PasskeyOnboarding({ open, onOpenChange }: PasskeyOnboardingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Проверка поддержки при монтировании
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPasskeySupported();
      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsSupported(available);
      }
    };
    checkSupport();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);

    try {
      const deviceName = getDeviceName();
      const result = await registerPasskey({ deviceName });

      if (result.success) {
        // Сохраняем флаг что уже предложили
        localStorage.setItem('passkey_onboarding_shown', 'true');

        toast({
          title: '✅ Face ID включён',
          description: 'Теперь можно входить без пароля',
        });

        onOpenChange(false);
      } else {
        toast({
          title: 'Не удалось настроить',
          description: result.error || 'Попробуйте позже',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[PasskeyOnboarding] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Сохраняем что пользователь пропустил
    localStorage.setItem('passkey_onboarding_shown', 'true');
    onOpenChange(false);
  };

  // Не показываем если не поддерживается
  if (!isSupported) {
    return null;
  }

  const content = (
    <div className="space-y-6 p-6">
      {/* Иконка */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Текст */}
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold text-zinc-200">
          Вход без пароля?
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Включите Face ID / Touch ID для мгновенного входа. Безопасно и быстро.
        </p>
      </div>

      {/* Преимущества (компактно) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs text-zinc-300">В 10× быстрее</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs text-zinc-300">Без паролей</span>
        </div>
      </div>

      {/* Кнопки */}
      <div className="space-y-3">
        <Button
          onClick={handleEnable}
          disabled={isLoading}
          className="w-full h-12 bg-white text-black hover:bg-white/90 font-semibold shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-200 hover:scale-[1.01] disabled:opacity-50"
        >
          {isLoading ? 'Настройка...' : 'Включить Face ID'}
        </Button>

        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full text-sm text-zinc-500 hover:text-zinc-400 transition-colors py-2 disabled:opacity-50"
        >
          Может позже
        </button>
      </div>

      {/* Подсказка (subtle) */}
      <p className="text-xs text-center text-zinc-600">
        Можно настроить позже в разделе Безопасность
      </p>
    </div>
  );

  // Mobile: Drawer снизу
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="border-zinc-800">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Модалка по центру
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>

            {content}
          </div>
        </div>
      )}
    </>
  );
}

