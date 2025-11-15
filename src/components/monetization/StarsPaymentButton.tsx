import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { getTelegramWebApp } from '@/lib/telegram';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StarsPaymentButtonProps {
  packageKey: string;
  priceCoins: number; // Цена в coins (внутренняя валюта)
  onSuccess?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Компонент кнопки оплаты через Telegram Stars
 * Показывается только в Telegram Mini App
 * 
 * Курс: 1 Star = 100 coins
 * Округление: Math.round для честной цены
 */
export function StarsPaymentButton({ 
  packageKey, 
  priceCoins, 
  onSuccess,
  className,
  variant = 'outline',
  size = 'default'
}: StarsPaymentButtonProps) {
  const { profileId, user, platform } = useUserContext();
  const [loading, setLoading] = useState(false);
  
  // Показывать только в Telegram Mini App
  const webApp = getTelegramWebApp();
  const isTelegram = platform === 'telegram' && !!webApp;

  // Не показывать вне Telegram
  if (!isTelegram) {
    return null;
  }

  // Рассчитать эквивалент в Stars (курс: 1 Star = 100 coins, округление Math.round)
  const starsAmount = Math.round(priceCoins / 100);

  const handlePurchase = async () => {
    if (!profileId || !user?.id) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в аккаунт",
        variant: "destructive"
      });
      return;
    }

    if (!webApp) {
      toast({
        title: "Ошибка",
        description: "Telegram WebApp не доступен",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[Stars Payment] Creating invoice:', {
        user_id: profileId,
        package_key: packageKey,
        telegram_user_id: user.id
      });

      // Создать invoice через Edge Function
      const { data, error } = await supabase.functions.invoke('telegram-stars-payment', {
        body: {
          action: 'create_invoice',
          user_id: profileId,
          package_key: packageKey,
          telegram_user_id: user.id
        }
      });

      if (error) {
        console.error('[Stars Payment] Error creating invoice:', error);
        throw new Error(error.message || 'Не удалось создать счет на оплату');
      }

      if (!data?.success || !data?.invoice_link) {
        console.error('[Stars Payment] Invalid response:', data);
        throw new Error('Не удалось получить ссылку на оплату');
      }

      console.log('[Stars Payment] Invoice created, opening:', data.invoice_link);

      // Открыть нативное окно Telegram Stars
      webApp.openInvoice(data.invoice_link, (status) => {
        setLoading(false);

        console.log('[Stars Payment] Invoice callback:', status);

        if (status === 'paid') {
          // Платеж успешен
          toast({
            title: "🎉 Оплата успешна!",
            description: "Награды начислены автоматически",
            duration: 5000,
          });
          
          // Вызвать callback успеха
          if (onSuccess) {
            onSuccess();
          }

          // Обновить страницу через 1 секунду для синхронизации данных
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (status === 'cancelled') {
          // Платеж отменен
          toast({
            title: "Оплата отменена",
            description: "Вы можете попробовать снова в любое время",
            variant: "default"
          });
        } else if (status === 'failed') {
          // Ошибка платежа
          toast({
            title: "Ошибка оплаты",
            description: "Попробуйте позже или обратитесь в поддержку",
            variant: "destructive"
          });
        } else {
          // Неизвестный статус
          console.warn('[Stars Payment] Unknown status:', status);
        }
      });

    } catch (error: any) {
      console.error('[Stars Payment] Error:', error);
      setLoading(false);
      toast({
        title: "Ошибка оплаты",
        description: error.message || "Попробуйте позже",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={loading}
      className={className}
      variant={variant}
      size={size}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Обработка...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Оплатить {starsAmount}⭐
        </>
      )}
    </Button>
  );
}

