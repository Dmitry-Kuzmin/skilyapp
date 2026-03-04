import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import {
  CheckCircle2,
  Infinity as InfinityIcon,
  Crown,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PRICING_PLANS } from "@/lib/pricing-config";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { isPaymentMethodAvailable } from "@/lib/payment-config";
import { isTelegramMiniApp, getTelegramWebApp } from "@/lib/telegram";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Paddle } from "@paddle/paddle-js";

const PLAN_TO_CATALOG: Record<string, string> = {
  monthly: 'premium_monthly',
  quarterly: 'premium_quarterly',
  biannual: 'premium_biannual',
  yearly: 'premium_yearly',
};

interface PremiumPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerSource?: 'duel_pass' | 'settings' | 'paywall';
}

export function PremiumPlanSelector({ open, onOpenChange, triggerSource = 'duel_pass' }: PremiumPlanSelectorProps) {
  const { profileId, platform } = useUserContext();
  const { isPremium, refresh: refreshPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { language } = useLanguage();
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);

  useEffect(() => {
    if (!open || !showPaddlePayment) return;
    const existing = getPaddleInstanceSync();
    if (existing) { setPaddle(existing); return; }
    getPaddleInstance().then(inst => inst && setPaddle(inst)).catch(() => { /* ignore */ });
  }, [open, showPaddlePayment]);

  const handlePurchase = async (planId: string) => {
    if (!profileId) {
      toast.error('Ошибка: пользователь не найден');
      return;
    }

    const catalogKey = PLAN_TO_CATALOG[planId];
    if (!catalogKey) {
      toast.error('Неизвестный план');
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      let paddleInstance = paddle || getPaddleInstanceSync();
      if (!paddleInstance && showPaddlePayment) {
        paddleInstance = await getPaddleInstance();
        if (paddleInstance) setPaddle(paddleInstance);
      }

      const partnerCode = localStorage.getItem('partner_code');
      const { data, error } = await supabase.functions.invoke("paddle-payment", {
        body: {
          user_id: profileId,
          catalog_key: catalogKey,
          ...(partnerCode ? { partner_code: partnerCode } : {}),
        },
      });

      if (error || data?.error || !data?.transaction_id) {
        console.error("[PremiumPlanSelector] Purchase error:", error || data?.error);
        toast.error('Ошибка оплаты', {
          description: error?.message || data?.error || 'Попробуйте позже',
        });
        return;
      }

      sessionStorage.setItem('paddle_transaction_id', data.transaction_id);
      localStorage.setItem('paddle_transaction_id', data.transaction_id);

      // checkout_url — настоящий URL от Paddle API, он всегда валиден
      // Fallback на buy.paddle.com если сервер не вернул url (не должно происходить)
      const paddleCheckoutUrl = data.checkout_url
        ?? `https://buy.paddle.com/checkout/${data.transaction_id}`;

      const isTelegram = isTelegramMiniApp();
      const webApp = getTelegramWebApp();

      if (isTelegram && webApp) {
        if ((webApp as any).openLink) {
          (webApp as any).openLink(paddleCheckoutUrl);
        } else {
          window.location.href = paddleCheckoutUrl;
        }
        return;
      }

      // Пробуем SDK overlay первым — лучший UX
      let sdkInstance = paddleInstance || getPaddleInstanceSync();
      if (!sdkInstance && showPaddlePayment) {
        sdkInstance = await getPaddleInstance();
        if (sdkInstance) setPaddle(sdkInstance);
      }

      if (sdkInstance) {
        try {
          sdkInstance.Checkout.open({
            transactionId: data.transaction_id,
            settings: {
              displayMode: "overlay",
              successUrl: `${window.location.origin}/purchase/success?transaction_id={transaction_id}`,
              theme: "dark",
              locale: language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en',
            },
          });
        } catch (e) {
          console.warn('[PremiumPlanSelector] Paddle overlay failed, redirecting:', e);
          window.location.href = paddleCheckoutUrl;
        }
      } else {
        // Fallback: открываем прямую ссылку Paddle
        window.location.href = paddleCheckoutUrl;
      }
    } catch (error: any) {
      console.error('[PremiumPlanSelector] Purchase error:', error);
      toast.error('Ошибка при покупке', {
        description: error.message || 'Попробуй еще раз',
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
        setSelectedPlan(null);
      }, 1500);
    }
  };



  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto w-[95%] sm:w-full p-0 rounded-[2.5rem] border-0 shadow-2xl bg-[#0A0D14] [&>button]:z-50 [&>button]:top-4 [&>button]:right-4">
          {/* Background Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[100px] pointer-events-none z-0" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] pointer-events-none z-0" />

          <div className="relative z-10 p-6 sm:p-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] sm:pt-10">
            <DialogHeader className="mb-10 space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                    Premium Доступ
                  </span>
                </div>
              </div>
              <DialogTitle className="text-3xl sm:text-5xl font-black text-center text-white leading-tight">
                Инвестируй <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  в свои права
                </span>
              </DialogTitle>
              <DialogDescription className="text-center text-base sm:text-lg mt-2 max-w-2xl mx-auto font-medium text-slate-400">
                Сдай теорию DGT с первого раза благодаря AI-технологиям и геймификации 🚀
              </DialogDescription>
            </DialogHeader>

            {/* PLANS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              {PRICING_PLANS.map((plan, index) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                const isPurchasing = loading && isSelected;
                const isPopular = plan.popular;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative flex flex-col rounded-3xl border p-6 transition-all cursor-pointer h-full group overflow-hidden",
                      isPopular
                        ? "border-indigo-500/50 bg-[#161B2E]/80 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 scale-[1.03] z-10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
                      isSelected && "border-indigo-500 bg-indigo-500/10"
                    )}
                    onClick={() => !loading && setSelectedPlan(plan.id)}
                  >
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-4">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[8px] font-black uppercase tracking-[0.2em] py-1.5 rounded-full shadow-lg shadow-indigo-500/40">
                          🔥 Самый популярный
                        </div>
                      </div>
                    )}
                    {plan.savings && (
                      <div className="absolute top-4 right-4">
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black">
                          -{plan.savings}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col">
                      <div className="text-center mb-6 mt-2">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl transition-transform duration-300 group-hover:scale-110",
                          `bg-gradient-to-br ${plan.gradient}`
                        )}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight mb-1">
                          {plan.title}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{plan.subtitle}</p>
                      </div>

                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-black text-white">{plan.price}</span>
                        </div>
                        {plan.pricePerMonth && (
                          <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-widest mt-1">
                            {plan.pricePerMonth} / мес
                          </p>
                        )}
                      </div>

                      <ul className="space-y-3 mb-6 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-left">
                            <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", isPopular ? "text-indigo-400" : "text-slate-600")} />
                            <span className="leading-snug text-slate-400 font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        className={cn(
                          "w-full font-black h-11 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 relative overflow-hidden group/btn",
                          isPopular
                            ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(plan.id);
                        }}
                        disabled={loading}
                      >
                        <span className="relative z-10">
                          {isPurchasing ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Ждем...
                            </>
                          ) : (
                            "Выбрать"
                          )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10 pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex flex-wrap items-center justify-center gap-4">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Безопасная оплата</span>
                <span className="flex items-center gap-1.5"><InfinityIcon className="w-3.5 h-3.5 text-indigo-400" /> Мгновенный доступ</span>
                <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-500" /> Все функции Premium</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}
