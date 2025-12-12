import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown } from "lucide-react";
import { StarsPaymentButton } from "./StarsPaymentButton";
import { CryptomusPaymentPreview } from "./CryptomusPaymentPreview";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";
import { PAYMENT_CONFIG, getAvailablePaymentMethods, isPaymentMethodAvailable } from "@/lib/payment-config";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PricingPackage {
  id: string;
  package_key: string;
  title_ru: string;
  description_ru: string;
  price_coins: number;
  price_stars: number | null; // Цена в Telegram Stars (только для Telegram Mini App)
  premium_days: number;
}

const plans = [
  {
    key: "premium_monthly",
    title: "Premium на месяц",
    price: "€9.99 / мес",
    description: "Полный доступ ко всем материалам, ускоренные монеты и без рекламы.",
  },
  {
    key: "premium_forever",
    title: "Premium Forever",
    price: "€59.99",
    description: "Пожизненный доступ ко всем функциям. Duel Pass Premium автоматически открывается для каждого сезона.",
  },
];

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { profileId, platform } = useUserContext();
  const { isPremium, isTrial, daysRemaining, refresh } = usePremium();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [pricingPackages, setPricingPackages] = useState<Record<string, PricingPackage>>({});
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Состояние для предварительного экрана Cryptomus
  const [cryptomusPreview, setCryptomusPreview] = useState<{
    open: boolean;
    paymentUrl: string;
    orderId: string;
    amount: number;
    currency: string;
    itemName: string;
  } | null>(null);

  // Определяем доступные методы оплаты
  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const availableMethods = getAvailablePaymentMethods(currentPlatform);
  const showStarsPayment = isPaymentMethodAvailable('telegram_stars', currentPlatform);
  const showPaypalPayment = isPaymentMethodAvailable('paypal', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  
  const webApp = getTelegramWebApp();

  // Загрузить цены из БД
  useEffect(() => {
    if (open) {
      loadPricingPackages();
    }
  }, [open]);

  const loadPricingPackages = async () => {
    setLoadingPackages(true);
    try {
      const { data, error } = await supabase
        .from('pricing_packages')
        .select('id, package_key, title_ru, description_ru, price_coins, price_stars, premium_days')
        .eq('is_active', true)
        .in('package_key', ['premium_monthly', 'premium_forever']);

      if (error) {
        console.error('[PaywallModal] Error loading packages:', error);
      } else if (data) {
        const packagesMap: Record<string, PricingPackage> = {};
        data.forEach(pkg => {
          packagesMap[pkg.package_key] = pkg;
        });
        setPricingPackages(packagesMap);
      }
    } catch (error) {
      console.error('[PaywallModal] Error loading packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePurchase = async (catalogKey: string) => {
    if (!profileId) return;
    setLoadingKey(catalogKey);
    try {
      // Получаем partner_code из localStorage (если пользователь пришел через партнерскую ссылку)
      const partnerCode = localStorage.getItem('partner_code');
      
      // Stripe удален, используем только Telegram Stars или другие методы
      // TODO: Реализовать покупку Premium через Paddle или Telegram Stars
      alert("Покупка Premium временно недоступна. Используйте Telegram Stars или свяжитесь с поддержкой.");
      return;
      /* 
      const { data, error } = await supabase.functions.invoke("premium-purchase", {
        body: { 
          user_id: profileId, 
          catalog_key: catalogKey,
          ...(partnerCode ? { partner_code: partnerCode } : {}),
        },
      });
      
      console.log("[PaywallModal] Response:", { data, error });
      
      if (error) {
        console.error("[PaywallModal] purchase error", error);
        
        // Попробуем получить детали ошибки из response
        let errorDetails = error.message || "Неизвестная ошибка";
        
        // Если есть context, попробуем получить детали
        if (error.context) {
          try {
            const errorBody = await error.context.json?.();
            if (errorBody?.error) {
              errorDetails = errorBody.error;
            }
          } catch (e) {
            // Игнорируем ошибку парсинга
          }
        }
        
        alert(`Ошибка при создании покупки:\n\n${errorDetails}`);
        throw error;
      }
      
      if (data?.error) {
        console.error("[PaywallModal] Error in response", data.error);
        alert(`Ошибка: ${data.error}\n\nПроверьте настройки секретов в Supabase Dashboard → Edge Functions → Settings`);
        return;
      }
      
      if (data?.url) {
        // TODO: Реализовать редирект на страницу оплаты (Paddle или Telegram Stars)
        console.log("[PaywallModal] Purchase URL:", data.url);
        */
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title="Получить Premium"
      showTitleBar={false}
      className="sm:max-w-lg"
      loading={loadingPackages && Object.keys(pricingPackages).length === 0}
      skeletonVariant="shop"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
            <Crown className="w-5 h-5 text-yellow-500" />
            Получи Premium
        </div>
          {isPremium && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Premium активен. Осталось {daysRemaining} д.
            </div>
          )}
          {isTrial && !isPremium && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Бесплатный триал активен. Осталось {daysRemaining} д.
            </div>
          )}

          <ul className="text-sm space-y-1">
            <li>• Полный доступ ко всем курсам и тестам</li>
            <li>• +50% монет за обучение</li>
            <li>• Без рекламы и мгновенные подсказки</li>
            <li>• Ежемесячный бонус монет и эксклюзивные скины</li>
          </ul>

          <div className="grid gap-3">
            {plans.map((plan) => {
              const pkg = pricingPackages[plan.key];
              const priceCoins = pkg?.price_coins || 0;
              const priceStars = pkg?.price_stars || null;
              
              // Определяем, находимся ли в Telegram Mini App
              const isTelegram = isTelegramMiniApp();
              
              // Форматируем цену в зависимости от платформы
              const displayPrice = (() => {
                if (isTelegram && priceStars) {
                  // В Telegram Mini App показываем цену в Stars
                  return `${priceStars} ⭐`;
                } else {
                  // На Web показываем цену в EUR (из статического массива plans)
                  return plan.price;
                }
              })();

              return (
                <div key={plan.key} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <span className="text-sm font-medium">{displayPrice}</span>
                  </div>
                  
                  {/* Кнопки оплаты */}
                  <div className="flex flex-col gap-2">
                    {/* Telegram Stars (приоритетный метод в Telegram) */}
                    {showStarsPayment && priceCoins > 0 && (
                      <StarsPaymentButton
                        packageKey={plan.key}
                        priceCoins={priceCoins}
                        onSuccess={() => {
                          refresh(); // Обновить статус Premium
                          onOpenChange(false);
                        }}
                        variant="default"
                        size="default"
                        className="w-full"
                      />
                    )}
                    
                    
                    {/* Cryptomus (криптоплатежи) */}
                    {showCryptomusPayment && (
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!profileId) return;
                          setLoadingKey(plan.key);
                          try {
                            const { data, error } = await supabase.functions.invoke("cryptomus-payment", {
                              body: { user_id: profileId, catalog_key: plan.key },
                            });
                            
                            if (error) {
                              console.error("[PaywallModal] Cryptomus error", error);
                              alert(`Ошибка: ${error.message || 'Не удалось создать платеж'}\n\nПроверьте настройки Cryptomus в Supabase Dashboard → Edge Functions → Settings`);
                              return;
                            }
                            
                            if (data?.error) {
                              console.error("[PaywallModal] Cryptomus error in response", data.error);
                              alert(`Ошибка: ${data.error}`);
                              return;
                            }
                            
                            if (data?.url && data?.orderId) {
                              // Показываем предварительный экран вместо прямого редиректа
                              const packageInfo = pricingPackages[plan.key];
                              let amount = 0;
                              
                              if (packageInfo?.price_coins) {
                                amount = packageInfo.price_coins / 100;
                              } else {
                                // Парсим цену из строки типа "€9.99 / мес"
                                const priceMatch = plan.price.match(/[\d.]+/);
                                amount = priceMatch ? parseFloat(priceMatch[0]) : 0;
                              }
                              
                              // Убеждаемся, что amount - число
                              amount = Number(amount) || 0;
                              
                              setCryptomusPreview({
                                open: true,
                                paymentUrl: data.url,
                                orderId: data.orderId,
                                amount: amount,
                                currency: 'EUR',
                                itemName: plan.title,
                              });
                            } else {
                              alert("Не удалось получить ссылку на оплату");
                            }
                          } catch (err: any) {
                            console.error("[PaywallModal] Cryptomus error", err);
                            alert(`Ошибка: ${err?.message || JSON.stringify(err)}`);
                          } finally {
                            setLoadingKey(null);
                          }
                        }}
                        disabled={loadingKey === plan.key || !profileId}
                        variant="outline"
                      >
                        {loadingKey === plan.key ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Создаём платёж...
                          </>
                        ) : (
                          "Оплатить криптовалютой"
                        )}
                      </Button>
                    )}
                    
                    {/* PayPal (альтернатива для веб) */}
                    {showPaypalPayment && !showStarsPayment && !showCryptomusPayment && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          // TODO: Реализовать PayPal интеграцию
                          alert('PayPal интеграция в разработке. Пока используйте Telegram Stars в Telegram Mini App или Cryptomus.');
                        }}
                        disabled={loadingKey === plan.key || !profileId}
                        variant="outline"
                      >
                        Оплатить через PayPal
                      </Button>
                    )}
                    
                    {/* Сообщение если нет доступных методов */}
                    {availableMethods.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        Методы оплаты временно недоступны
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Предварительный экран Cryptomus */}
        {cryptomusPreview && (
          <CryptomusPaymentPreview
            open={cryptomusPreview.open}
            onOpenChange={(open) => {
              if (!open) {
                setCryptomusPreview(null);
              }
            }}
            paymentUrl={cryptomusPreview.paymentUrl}
            orderId={cryptomusPreview.orderId}
            amount={cryptomusPreview.amount}
            currency={cryptomusPreview.currency}
            itemName={cryptomusPreview.itemName}
            onPaymentComplete={() => {
              // Обновляем статус Premium после успешной оплаты
              refresh();
              onOpenChange(false);
            }}
            onCancel={() => {
              setLoadingKey(null);
            }}
          />
        )}
    </UnifiedModal>
  );
}


