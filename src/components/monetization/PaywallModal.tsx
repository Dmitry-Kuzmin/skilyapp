import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown } from "lucide-react";
import { StarsPaymentButton } from "./StarsPaymentButton";
import { getTelegramWebApp } from "@/lib/telegram";

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
  const route = useModalRoute('paywall');
  const isOpen = open ?? route.isOpen;
  const handleOpenChange = (state: boolean) => {
    if (onOpenChange) onOpenChange(state);
    if (!state) route.closeModal();
  };
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [pricingPackages, setPricingPackages] = useState<Record<string, PricingPackage>>({});
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Проверка, показывать ли кнопку Stars (только в Telegram Mini App)
  const webApp = getTelegramWebApp();
  const showStarsPayment = platform === 'telegram' && !!webApp;

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
        .select('id, package_key, title_ru, description_ru, price_coins, premium_days')
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
      const { data, error } = await supabase.functions.invoke("purchase-create", {
        body: { user_id: profileId, catalog_key: catalogKey },
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
        
        alert(`Ошибка при создании покупки:\n\n${errorDetails}\n\nПроверьте настройки секретов в:\nSupabase Dashboard → Edge Functions → Settings\n\nУбедитесь, что добавлены:\n- STRIPE_SECRET_KEY\n- STRIPE_SUCCESS_URL\n- STRIPE_CANCEL_URL`);
        throw error;
      }
      
      if (data?.error) {
        console.error("[PaywallModal] Error in response", data.error);
        alert(`Ошибка: ${data.error}\n\nПроверьте настройки секретов в Supabase Dashboard → Edge Functions → Settings`);
        return;
      }
      
      if (data?.url) {
        // Сохраняем session_id перед редиректом (для восстановления после возврата с Stripe)
        if (data?.sessionId) {
          console.log("[PaywallModal] Saving session_id:", data.sessionId);
          // Используем sessionStorage для Telegram (более надежно при переходах между доменами)
          sessionStorage.setItem('stripe_checkout_session_id', data.sessionId);
          localStorage.setItem('stripe_checkout_session_id', data.sessionId); // Fallback
          if (profileId) {
            sessionStorage.setItem('stripe_user_id', profileId);
          }
        }
        
        // Проверяем, находимся ли в Telegram Web App
        const webApp = getTelegramWebApp();
        const isTelegram = platform === 'telegram' && !!webApp;
        
        if (isTelegram && webApp) {
          // В Telegram используем webApp.openLink для открытия в браузере Telegram
          console.log("[PaywallModal] Opening Stripe in Telegram Web App");
          if ((webApp as any).openLink) {
            (webApp as any).openLink(data.url);
          } else if ((webApp as any).openTelegramLink) {
            (webApp as any).openTelegramLink(data.url);
          } else {
            // Fallback: прямой редирект
            window.location.href = data.url;
          }
        } else {
          // В обычном браузере используем прямой редирект
          console.log("[PaywallModal] Redirecting to:", data.url);
          window.location.href = data.url;
        }
      } else {
        console.error("[PaywallModal] No URL in response", data);
        alert("Не удалось получить ссылку на оплату. Проверьте настройки Stripe в Supabase Dashboard.");
      }
    } catch (err: any) {
      console.error("[PaywallModal] purchase error", err);
      const errorMessage = err?.message || err?.error?.message || JSON.stringify(err);
      alert(`Ошибка: ${errorMessage}\n\nПроверьте:\n1. Настроены ли секреты Stripe в Supabase Dashboard → Edge Functions → Settings\n2. Правильны ли URL для success/cancel (НЕ используйте localhost!)`);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Получить Premium"
      showTitleBar={false}
      className="sm:max-w-lg"
      loading={loadingPackages && Object.keys(pricingPackages).length === 0}
      skeletonVariant="shop"
      modalRouteKey="paywall"
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

              return (
                <div key={plan.key} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <span className="text-sm font-medium">{plan.price}</span>
                  </div>
                  
                  {/* Кнопки оплаты */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handlePurchase(plan.key)}
                      disabled={loadingKey === plan.key || !profileId}
                    >
                      {loadingKey === plan.key ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Перенаправляем...
                        </>
                      ) : (
                        "Выбрать"
                      )}
                    </Button>
                    
                    {/* Кнопка оплаты Stars (только в Telegram) */}
                    {showStarsPayment && priceCoins > 0 && (
                      <StarsPaymentButton
                        packageKey={plan.key}
                        priceCoins={priceCoins}
                        onSuccess={() => {
                          refresh(); // Обновить статус Premium
                          onOpenChange(false);
                        }}
                        variant="outline"
                        size="default"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </UnifiedModal>
  );
}


