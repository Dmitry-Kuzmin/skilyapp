import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getTelegramWebApp } from '@/lib/telegram';

export default function StripeCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Получаем информацию о сессии и Stripe URL
    const fetchSessionInfo = async () => {
      if (!sessionId) {
        toast({
          title: '❌ Ошибка',
          description: 'Отсутствует идентификатор сессии',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('price, currency, item_type, metadata, stripe_session_id')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();

        if (error || !data) {
          console.error('[StripeCheckout] Error fetching session:', error);
          toast({
            title: '❌ Ошибка',
            description: 'Сессия не найдена',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        setAmount(data.price);
        setCurrency(data.currency);

        // Получаем Stripe Checkout URL из сессии
        try {
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke('purchase-get-session-url', {
            body: { session_id: sessionId }
          });

          if (sessionError || !sessionData?.url) {
            console.error('[StripeCheckout] Error fetching Stripe URL:', sessionError);
            // Fallback: создаем URL вручную (для тестов)
            setStripeUrl(`https://checkout.stripe.com/c/pay/${sessionId}`);
          } else {
            setStripeUrl(sessionData.url);
          }
        } catch (err) {
          console.error('[StripeCheckout] Exception fetching Stripe URL:', err);
          // Fallback: создаем URL вручную
          setStripeUrl(`https://checkout.stripe.com/c/pay/${sessionId}`);
        }

        setLoading(false);
      } catch (err) {
        console.error('[StripeCheckout] Exception:', err);
        toast({
          title: '❌ Ошибка',
          description: 'Не удалось загрузить информацию о платеже',
          variant: 'destructive'
        });
        navigate('/');
      }
    };

    fetchSessionInfo();

    // В Telegram Web App показываем кнопку назад
    const webApp = getTelegramWebApp();
    if (webApp) {
      const handleBackButton = () => {
        navigate('/');
      };
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBackButton);
      return () => {
        webApp.BackButton.hide();
        webApp.BackButton.offClick(handleBackButton);
      };
    }
  }, [sessionId, navigate]);

  const handleProceed = () => {
    if (!stripeUrl) {
      toast({
        title: '❌ Ошибка',
        description: 'URL оплаты недоступен',
        variant: 'destructive'
      });
      return;
    }

    setRedirecting(true);

    // В Telegram Web App открываем в том же окне (не через openLink, который переводит в браузер)
    // Используем window.location.href для перехода внутри Telegram Web App
    setTimeout(() => {
      window.location.href = stripeUrl;
    }, 500);
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionId || !stripeUrl) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 p-4 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold">Оплата</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={redirecting}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">Переход к оплате</h2>
              <p className="text-sm text-muted-foreground">
                Вы будете перенаправлены на безопасную страницу оплаты Stripe
              </p>
            </div>

            {amount && (
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Сумма к оплате</span>
                  <span className="text-2xl font-bold">
                    {amount.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={redirecting}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={handleProceed}
                disabled={redirecting}
              >
                {redirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Переход...
                  </>
                ) : (
                  <>
                    Перейти к оплате
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              После оплаты вы будете автоматически возвращены в приложение
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

