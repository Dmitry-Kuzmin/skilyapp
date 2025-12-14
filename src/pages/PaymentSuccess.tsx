import { useEffect, useState, useRef } from "react";
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
  const processedRef = useRef(false); // Защита от множественных вызовов

  useEffect(() => {
    // Защита от множественных вызовов (React StrictMode вызывает эффекты дважды)
    if (processedRef.current) {
      console.log('[PaymentSuccess] Already processed, skipping...');
      return;
    }

    const processPayment = async () => {
      // Помечаем как обработанное сразу, чтобы предотвратить повторные вызовы
      processedRef.current = true;
      try {
        // Получаем параметры из URL
        let orderId = searchParams.get('order_id'); // Cryptomus
        let paddleTransactionId = searchParams.get('transaction_id'); // Paddle
        
        console.log('[PaymentSuccess] Page loaded:', {
          orderId,
          paddleTransactionId,
          profileId,
          url: window.location.href,
          searchParams: Object.fromEntries(searchParams.entries())
        });
        
        // Если transaction_id или order_id нет в URL, пытаемся найти альтернативными способами
        if (!orderId && !paddleTransactionId) {
          console.warn('[PaymentSuccess] ⚠️ No order_id or transaction_id in URL, trying alternatives...');
          
          // Способ 1: Проверяем sessionStorage и localStorage
          const storedPaddleTransactionId = sessionStorage.getItem('paddle_transaction_id') 
            || localStorage.getItem('paddle_transaction_id');
          if (storedPaddleTransactionId) {
            console.log('[PaymentSuccess] Found paddle_transaction_id in storage:', storedPaddleTransactionId);
            paddleTransactionId = storedPaddleTransactionId;
            sessionStorage.removeItem('paddle_transaction_id');
            localStorage.removeItem('paddle_transaction_id');
          }
          
          // Способ 2: Если есть profileId, ищем последнюю pending покупку за последние 10 минут
          if (!orderId && !paddleTransactionId && profileId) {
            console.log('[PaymentSuccess] Searching for recent pending purchase...');
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            
            const { data: recentPurchases } = await supabase
              .from('purchases')
              .select('cryptomus_order_id, paddle_transaction_id, created_at, status')
              .eq('user_id', profileId)
              .in('status', ['pending', 'completed'])
              .gte('created_at', tenMinutesAgo)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (recentPurchases && recentPurchases.length > 0) {
              const recentPurchase = recentPurchases[0];
              console.log('[PaymentSuccess] Found recent purchase:', recentPurchase);
              
              // Приоритет: Paddle transaction_id, затем Cryptomus order_id
              if (recentPurchase.paddle_transaction_id) {
                paddleTransactionId = recentPurchase.paddle_transaction_id;
                console.log('[PaymentSuccess] Using pending purchase paddle_transaction_id:', paddleTransactionId);
              } else if (recentPurchase.cryptomus_order_id) {
                orderId = recentPurchase.cryptomus_order_id;
                console.log('[PaymentSuccess] Using pending purchase order_id:', orderId);
              }
            }
          }
        }
        
        if (!orderId && !paddleTransactionId) {
          console.error('[PaymentSuccess] ❌ No order_id or transaction_id found');
          // Если нет ID платежа, возможно пользователь просто вернулся без оплаты
          // Перенаправляем на страницу отмены
          console.log('[PaymentSuccess] No payment ID found - redirecting to cancel');
          // Убираем toast здесь - он будет показан на странице /cancel
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

        console.log('[PaymentSuccess] Processing payment:', { orderId, paddleTransactionId, user: profileId });

        // Проверяем статус покупки в БД (Paddle или Cryptomus)
        let purchase;
        let purchaseError;
        
        if (paddleTransactionId) {
          // Paddle платеж
          const result = await supabase
            .from('purchases')
            .select('*')
            .eq('paddle_transaction_id', paddleTransactionId)
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
            console.warn('[PaymentSuccess] ⚠️ Purchase not found in database');
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
          // Убираем toast здесь - он будет показан на странице /cancel (чтобы избежать дублирования)
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
            
            // Проверяем транзакцию (Paddle, Cryptomus или Telegram Stars)
            let transactionType = 'coins_purchase_paddle'; // По умолчанию
            let transactionKey: Record<string, string> = {};
            
            if (purchase.paddle_transaction_id) {
              transactionType = 'coins_purchase_paddle';
              transactionKey = { 'metadata->>transaction_id': paddleTransactionId };
            } else if (purchase.cryptomus_order_id) {
              transactionType = 'coins_purchase_cryptomus';
              transactionKey = { 'metadata->>order_id': orderId };
            } else if (purchase.metadata?.payment_method === 'telegram_stars' || purchase.metadata?.gateway === 'telegram_stars') {
              transactionType = 'coins_purchase_telegram_stars';
              transactionKey = { 'metadata->>payment_id': purchase.id };
            }
            
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
                  user_id: profileId,
                },
              });
              
              if (processError || !processData?.success) {
                console.error('[PaymentSuccess] ❌ Failed to process manually:', processError || processData);
                toast.error('Ошибка начисления монет', {
                  description: 'Покупка оплачена, но монеты не начислены. Обратитесь в поддержку.',
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
            window.opener?.postMessage({ type: 'PAYMENT_SUCCESS' }, window.location.origin);
            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        // Paddle: ждем webhook, если еще не обработан
        if (paddleTransactionId) {
          console.log('[PaymentSuccess] Paddle transaction pending webhook, showing waiting state');
          toast.info('Оплата обрабатывается', {
            description: 'Мы получили платеж, обновим статус в течение нескольких секунд.',
          });
          setProcessing(false);
          return;
        }

        // Если покупка еще не обработана, вызываем process-purchase функцию
        // Для Cryptomus: webhook обрабатывает автоматически, но можем проверить статус
        if (orderId) {
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
            window.opener?.postMessage({ type: 'PAYMENT_SUCCESS' }, window.location.origin);
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



