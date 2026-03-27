import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Star } from 'lucide-react';
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

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
 * Курс: 1 Star = 0.5 coins (или 1 coin = 2 stars)
 * Рассчитано на основе официальных цен Telegram Stars:
 * - Средняя цена 1 звезды: 0.02161 €
 * - 100 монет = €2.99 в Stripe
 * - С учетом комиссии Telegram (30%): €2.99 / 0.7 ≈ €4.27 → 198 звёзд
 * - Курс: 100 монет / 198 звёзд ≈ 0.5 coins/star
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
  const { profileId, user } = useUserContext();
  const [loading, setLoading] = useState(false);

  // Показывать только в Telegram Mini App
  const webApp = getTelegramWebApp();
  const isTelegram = isTelegramMiniApp();

  // Хук должен быть до return — правила React Hooks
  const [starsAmount, setStarsAmount] = useState<number>(0);

  useEffect(() => {
    // Загружаем price_stars из БД
    const loadStarsPrice = async () => {
      console.log('[StarsPaymentButton] Loading price for:', packageKey, 'Fallback coins:', priceCoins);
      try {
        const { data, error } = await supabase
          .from('pricing_packages')
          .select('price_stars, price_coins')
          .eq('package_key', packageKey)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data) {
          const pricingData = data as any;
          const stars = pricingData.price_stars || Math.round(pricingData.price_coins / 0.5);
          console.log('[StarsPaymentButton] DB Price found:', stars);
          setStarsAmount(stars);
        } else {
          const fallbackStars = Math.round(priceCoins / 0.5);
          console.log('[StarsPaymentButton] DB Price not found, using fallback:', fallbackStars);
          setStarsAmount(fallbackStars || 198); // Safe default for 100 coins
        }
      } catch (err) {
        console.error('[StarsPaymentButton] Error loading stars price:', err);
        setStarsAmount(Math.round(priceCoins / 0.5) || 198);
      }
    };

    loadStarsPrice();
  }, [packageKey, priceCoins]);

  // Не показывать вне Telegram (после всех хуков!)
  if (!isTelegram || !webApp) {
    return null;
  }


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
      
      const twa = webApp as any;
      if (!twa.openInvoice) {
        throw new Error('Метод openInvoice не поддерживается в этой версии Telegram');
      }

      // Открыть нативное окно Telegram Stars
      twa.openInvoice(data.invoice_link, (status: string) => {
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
      onClick={(e) => {
        e.stopPropagation();
        handlePurchase();
      }}
      disabled={loading}
      className={className}
      variant={variant}
      size={size}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Обработка...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-1.5" />
          <span className="flex items-center gap-1">
            Оплатить {starsAmount}
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </span>
        </>
      )}
    </Button>
  );
}

