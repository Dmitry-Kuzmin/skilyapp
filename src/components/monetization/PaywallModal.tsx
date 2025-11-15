import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    key: "premium_monthly",
    title: "Premium на месяц",
    price: "€9.99 / мес",
    description: "Полный доступ ко всем материалам, ускоренные монеты и без рекламы.",
  },
  {
    key: "premium_yearly",
    title: "Premium на год",
    price: "€59.99 / год",
    description: "Сэкономь 50% и учись без ограничений весь год.",
  },
];

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { profileId } = useUserContext();
  const { isPremium, isTrial, daysRemaining } = usePremium();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

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
        console.log("[PaywallModal] Redirecting to:", data.url);
        window.location.href = data.url;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Получи Premium
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            {plans.map((plan) => (
              <div key={plan.key} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{plan.title}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <span className="text-sm font-medium">{plan.price}</span>
                </div>
                <Button
                  className="w-full"
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
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


