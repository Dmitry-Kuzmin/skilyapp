import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = usePremium();
  const { profileId } = useUserContext();
  const [processing, setProcessing] = useState(true);
  const [coinsAdded, setCoinsAdded] = useState<number | null>(null);
  const isPopup = window.opener !== null;

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Получаем параметры из URL
        let sessionId = searchParams.get('session_id'); // Stripe
        let orderId = searchParams.get('order_id'); // Cryptomus
        
        console.log('[PaymentSuccess] Page loaded:', {
          sessionId,
          orderId,
          profileId,
          url: window.location.href,
          searchParams: Object.fromEntries(searchParams.entries())
        });
        
        // Если session_id нет в URL, пытаемся найти альтернативными способами
        if (!sessionId && !orderId) {
          console.warn('[PaymentSuccess] ⚠️ No session_id or order_id in URL, trying alternatives...');
          
          // Способ 1: Проверяем sessionStorage (приоритет для Telegram) и localStorage (fallback)
          const storedSessionId = sessionStorage.getItem('stripe_checkout_session_id') 
            || localStorage.getItem('stripe_checkout_session_id');
          if (storedSessionId) {
            console.log('[PaymentSuccess] Found session_id in storage:', storedSessionId);
            sessionId = storedSessionId;
            // Удаляем после использования
            sessionStorage.removeItem('stripe_checkout_session_id');
            localStorage.removeItem('stripe_checkout_session_id');
          }
          
          // Способ 2: Если есть profileId, ищем последнюю pending покупку за последние 10 минут
          if (!sessionId && !orderId && profileId) {
            console.log('[PaymentSuccess] Searching for recent pending purchase...');
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            
            const { data: recentPurchases } = await supabase
              .from('purchases')
              .select('stripe_session_id, cryptomus_order_id, created_at, status')
              .eq('user_id', profileId)
              .in('status', ['pending', 'completed'])
              .gte('created_at', tenMinutesAgo)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (recentPurchases && recentPurchases.length > 0) {
              const recentPurchase = recentPurchases[0];
              console.log('[PaymentSuccess] Found recent purchase:', recentPurchase);
              
              // Приоритет: Stripe session_id, затем Cryptomus order_id
              if (recentPurchase.stripe_session_id) {
                sessionId = recentPurchase.stripe_session_id;
                console.log('[PaymentSuccess] Using pending purchase session_id:', sessionId);
              } else if (recentPurchase.cryptomus_order_id) {
                orderId = recentPurchase.cryptomus_order_id;
                console.log('[PaymentSuccess] Using pending purchase order_id:', orderId);
              }
            }
          }
        }
        
        if (!sessionId && !orderId) {
          console.error('[PaymentSuccess] ❌ No session_id or order_id found');
          // Если нет ID платежа, возможно пользователь просто вернулся без оплаты
          // Перенаправляем на страницу отмены
          console.log('[PaymentSuccess] No payment ID found - redirecting to cancel');
          toast.warning('Платеж не был завершен', {
            description: 'Вы вернулись со страницы оплаты, но платеж не был завершен.',
          });
          navigate('/cancel');
          return;
        }

        if (!profileId) {
          console.warn('[PaymentSuccess] ⚠️ No profileId available');
          toast.warning('Не удалось определить пользователя', {
            description: 'Попробуйте обновить страницу',
          });
          setProcessing(false);
          return;
        }

        console.log('[PaymentSuccess] Processing payment:', { sessionId, orderId, user: profileId });

        // Проверяем статус покупки в БД (Stripe или Cryptomus)
        let purchase;
        let purchaseError;
        
        if (sessionId) {
          // Stripe платеж
          const result = await supabase
            .from('purchases')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .single();
          purchase = result.data;
          purchaseError = result.error;
        } else if (orderId) {
          // Cryptomus платеж
          const result = await supabase
            .from('purchases')
            .select('*')
            .eq('cryptomus_order_id', orderId)
            .single();
          purchase = result.data;
          purchaseError = result.error;
        }

        if (purchaseError) {
          if (purchaseError.code === 'PGRST116') {
            console.warn('[PaymentSuccess] ⚠️ Purchase not found in database:', sessionId);
            toast.warning('Покупка не найдена в базе данных', {
              description: 'Возможно, покупка еще обрабатывается. Попробуйте обновить страницу через несколько секунд.',
            });
            setProcessing(false);
            return;
          } else {
            console.error('[PaymentSuccess] ❌ Error fetching purchase:', purchaseError);
            toast.error('Ошибка загрузки данных покупки', {
              description: purchaseError.message || 'Попробуйте обновить страницу',
            });
            setProcessing(false);
            return;
          }
        }

        console.log('[PaymentSuccess] Purchase found:', {
          id: purchase.id,
          status: purchase.status,
          item_type: purchase.item_type,
          metadata: purchase.metadata
        });

        // КРИТИЧНО: Проверяем статус покупки
        // Если покупка в статусе pending - платеж не был завершен, перенаправляем на cancel
        if (purchase?.status === 'pending') {
          console.warn('[PaymentSuccess] ⚠️ Purchase is still pending - payment was not completed');
          toast.warning('Платеж не был завершен', {
            description: 'Вы вернулись со страницы оплаты, но платеж не был завершен.',
          });
          // Перенаправляем на страницу отмены
          navigate('/cancel');
          return;
        }

        // Если покупка отменена или провалилась
        if (purchase?.status === 'cancelled' || purchase?.status === 'failed') {
          console.warn('[PaymentSuccess] ⚠️ Purchase was cancelled or failed');
          toast.warning('Платеж был отменен', {
            description: 'Платеж не был завершен.',
          });
          navigate('/cancel');
          return;
        }

        // Если покупка уже обработана (completed), проверяем что монеты начислены
        if (purchase?.status === 'completed') {
          console.log('[PaymentSuccess] Purchase already processed');
          
          // Если это покупка монет, проверяем что монеты действительно начислены
          if (purchase.item_type === 'coins_pack') {
            const coins = typeof purchase.metadata?.coins === 'string' 
              ? parseInt(purchase.metadata.coins, 10) 
              : Number(purchase.metadata?.coins || 0);
            
            // Проверяем текущий баланс пользователя
            const { data: profile } = await supabase
              .from('profiles')
              .select('coins')
              .eq('id', profileId)
              .single();
            
            console.log('[PaymentSuccess] User coins:', profile?.coins, 'Expected coins from purchase:', coins);
            
            // Проверяем транзакцию (Stripe или Cryptomus)
            const transactionType = purchase.stripe_session_id 
              ? 'coins_purchase_stripe' 
              : 'coins_purchase_cryptomus';
            const transactionKey = purchase.stripe_session_id 
              ? { 'metadata->>session_id': sessionId }
              : { 'metadata->>order_id': orderId };
            
            const { data: transaction } = await supabase
              .from('transactions')
              .select('*')
              .eq('user_id', profileId)
              .eq('transaction_type', transactionType)
              .match(transactionKey)
              .single();
            
            if (!transaction) {
              console.warn('[PaymentSuccess] ⚠️ Transaction not found, but purchase is completed. Trying to process manually...');
              
              // Пытаемся обработать вручную
              const { data: processData, error: processError } = await supabase.functions.invoke('process-purchase', {
                body: {
                  session_id: sessionId,
                  user_id: profileId,
                },
              });
              
              if (processError || !processData?.success) {
                console.error('[PaymentSuccess] ❌ Failed to process manually:', processError || processData);
                toast.error('Ошибка начисления монет', {
                  description: 'Покупка оплачена, но монеты не начислены. Обратитесь в поддержку с ID сессии: ' + sessionId,
                });
              } else {
                console.log('[PaymentSuccess] ✅ Manually processed:', processData);
                if (processData.coins_added) {
                  setCoinsAdded(processData.coins_added);
                  toast.success(`✅ Начислено ${processData.coins_added} монет!`, {
                    duration: 5000,
                  });
                }
              }
            } else {
              console.log('[PaymentSuccess] ✅ Transaction found, coins should be added');
              setCoinsAdded(coins);
            }
          }
          
          setProcessing(false);
          
          // Обновляем Premium статус
          refresh();
          
          // Если открыто в попапе, отправляем сообщение родительскому окну
          if (isPopup) {
            window.opener?.postMessage({ type: 'STRIPE_SUCCESS' }, window.location.origin);
            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        // Если покупка еще не обработана, вызываем process-purchase функцию
        // Для Cryptomus: webhook обрабатывает автоматически, но можем проверить статус
        if (orderId && !sessionId) {
          // Cryptomus платеж - проверяем статус в БД
          // Если покупка уже была найдена выше, используем её статус
          if (purchase) {
            if (purchase.status === 'pending') {
              console.warn('[PaymentSuccess] ⚠️ Cryptomus payment is still pending - payment was not completed');
              toast.warning('Платеж не был завершен', {
                description: 'Вы вернулись со страницы оплаты, но платеж не был завершен. Webhook обработает платеж автоматически после оплаты.',
              });
              navigate('/cancel');
              return;
            } else if (purchase.status === 'completed') {
              console.log('[PaymentSuccess] ✅ Cryptomus payment already completed by webhook');
              refresh();
              setProcessing(false);
              return;
            }
          }
          
          // Если покупка не найдена или статус неизвестен - ждем webhook
          console.log('[PaymentSuccess] Cryptomus payment - waiting for webhook or checking status...');
          refresh();
          setProcessing(false);
          return;
        }
        
        console.log('[PaymentSuccess] Calling process-purchase function for pending purchase');
        
        const { data, error } = await supabase.functions.invoke('process-purchase', {
          body: {
            session_id: sessionId,
            user_id: profileId,
          },
        });

        console.log('[PaymentSuccess] process-purchase response:', { data, error });

        if (error) {
          console.error('[PaymentSuccess] ❌ Error processing purchase:', error);
          toast.error('Ошибка обработки покупки', {
            description: error.message || 'Попробуйте обновить страницу или обратитесь в поддержку',
          });
          setProcessing(false);
          return;
        }

        if (data?.success) {
          console.log('[PaymentSuccess] ✅ Purchase processed successfully:', data);
          
          // Если это покупка монет, показываем количество
          if (data.coins_added) {
            setCoinsAdded(data.coins_added);
            toast.success(`✅ Начислено ${data.coins_added} монет!`, {
              duration: 5000,
            });
          } else if (data.message) {
            toast.success(data.message, {
              duration: 5000,
            });
          }
          
          // Обновляем Premium статус
          refresh();
          
          // Если открыто в попапе, отправляем сообщение родительскому окну
          if (isPopup) {
            window.opener?.postMessage({ type: 'STRIPE_SUCCESS' }, window.location.origin);
            setTimeout(() => {
              window.close();
            }, 2000);
          }
        } else {
          console.warn('[PaymentSuccess] ⚠️ Purchase processing returned unexpected result:', data);
          toast.warning('Покупка обработана, но результат неожиданный', {
            description: JSON.stringify(data),
          });
        }
      } catch (error: any) {
        console.error('[PaymentSuccess] ❌ Exception processing payment:', error);
        toast.error('Ошибка обработки покупки', {
          description: error.message || 'Попробуйте обновить страницу или обратитесь в поддержку',
        });
      } finally {
        setProcessing(false);
      }
    };

    if (profileId) {
      processPayment();
    } else {
      // Если profileId еще не загружен, ждем немного
      console.log('[PaymentSuccess] Waiting for profileId...');
      const timer = setTimeout(() => {
        if (profileId) {
          processPayment();
        } else {
          console.warn('[PaymentSuccess] ⚠️ profileId not loaded after timeout');
          toast.warning('Не удалось загрузить данные пользователя', {
            description: 'Попробуйте обновить страницу',
          });
          setProcessing(false);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, profileId, refresh, isPopup]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Оплата успешна! 🎉</h1>
            {processing ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-lg">Обработка покупки...</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg">
                {coinsAdded 
                  ? `✅ Начислено ${coinsAdded} монет на ваш баланс!`
                  : 'Спасибо за покупку! Ваш Premium доступ активирован.'}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
            <h2 className="font-semibold text-lg">Что дальше?</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Полный доступ ко всем курсам и тестам</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>+50% монет за обучение</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Без рекламы и мгновенные подсказки</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Ежемесячный бонус монет</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/dashboard")} size="lg">
              На главную
            </Button>
            <Button onClick={() => navigate("/tests")} variant="outline" size="lg">
              Начать обучение
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}



