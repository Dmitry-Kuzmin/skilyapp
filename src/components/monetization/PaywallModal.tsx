import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { Crown, Check, ShieldCheck, Zap, Star, Sparkles, Trophy, Lock, CreditCard, Bitcoin, Wallet } from "lucide-react";
import { isTelegramMiniApp, getTelegramWebApp } from "@/lib/telegram";
import { PRICING_PLANS } from "@/lib/pricing-config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { isPaymentMethodAvailable } from "@/lib/payment-config";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Paddle } from "@paddle/paddle-js";

import { StarsPaymentButton } from "@/components/monetization/StarsPaymentButton";
import { TonPaymentWidget } from "@/components/monetization/TonPaymentWidget";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Маппинг planId (из pricing-config) → catalog_key (для Paddle Edge Function)
 */
const PLAN_TO_CATALOG: Record<string, string> = {
  monthly: 'premium_monthly',
  quarterly: 'premium_quarterly',
  biannual: 'premium_biannual',
  yearly: 'premium_yearly',
  lifetime: 'premium_lifetime',
};

// Компонент живого фона (Lava Lamp Bubbles)
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 20, 0],
        y: [0, -20, 0],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600 rounded-full blur-[120px] mix-blend-screen"
    />
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.2, 0.4, 0.2],
        x: [0, -30, 0],
        y: [0, 30, 0],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-500 rounded-full blur-[100px] mix-blend-screen"
    />
    <motion.div
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.2, 0.3, 0.2],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-[140px] mix-blend-screen"
    />
  </div>
);

// Анимированный список преимуществ
const BenefitItem = ({ icon: Icon, text, color, delay }: { icon: any, text: string, color: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="flex items-center gap-3 group"
  >
    <div className={cn(
      "p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
      color.replace('text-', 'text-')
    )}>
      <Icon className={cn("w-5 h-5 transition-colors", color)} />
    </div>
    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{text}</span>
  </motion.div>
);

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { profileId, platform } = useUserContext();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const showTonPayment = isPaymentMethodAvailable('ton', currentPlatform);

  const [paymentMethod, setPaymentMethod] = useState<'paddle' | 'cryptomus' | 'ton'>(
    showPaddlePayment ? 'paddle' : (showCryptomusPayment ? 'cryptomus' : 'ton')
  );

  useEffect(() => {
    if (!open || !showPaddlePayment) return;
    const existing = getPaddleInstanceSync();
    if (existing) { setPaddle(existing); return; }
    getPaddleInstance().then(inst => inst && setPaddle(inst)).catch(() => { });
  }, [open, showPaddlePayment]);

  // Handle outside click close for CheckoutModal
  useEffect(() => {
    if (!!selectedPlanId && paymentMethod === 'paddle') {
      // logic handled in modal backdrop click
    }
  }, [selectedPlanId]);

  const handlePurchase = async (planId: string) => {
    if (!profileId) {
      toast({ title: "Ошибка", description: "Необходимо войти в аккаунт. Если вы вошли, попробуйте перезайти.", variant: "destructive" });
      return;
    }

    const catalogKey = PLAN_TO_CATALOG[planId];
    if (!catalogKey) {
      toast({ title: "Ошибка", description: "Неизвестный план", variant: "destructive" });
      return;
    }

    setSelectedPlanId(planId);

    try {
      if (paymentMethod === 'paddle') {
        let paddleInstance = paddle || getPaddleInstanceSync();
        if (!paddleInstance && showPaddlePayment) {
          paddleInstance = await getPaddleInstance();
          if (paddleInstance) setPaddle(paddleInstance);
        }

        const partnerCode = localStorage.getItem('partner_code');
        console.log("[PaywallModal] Invoking paddle-payment...", { catalogKey });
        const { data, error } = await supabase.functions.invoke("paddle-payment", {
          body: {
            user_id: profileId,
            catalog_key: catalogKey,
            ...(partnerCode ? { partner_code: partnerCode } : {}),
          },
        });

        console.log("[PaywallModal] Function response (raw):", { data, error });

        // ФИКС: Если Supabase вернул строку вместо объекта, парсим её
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
            console.log("[PaywallModal] Parsed function data:", parsedData);
          } catch (e) {
            console.error("[PaywallModal] Failed to parse data string:", e);
          }
        }

        if (error || parsedData?.error || !parsedData?.transaction_id) {
          const rawError = error?.message || parsedData?.error || (error ? JSON.stringify(error) : null);
          const errMsg = rawError && rawError !== "null" ? rawError : "Paddle API Error (Check Console)";

          console.error("[PaywallModal] Paddle purchase failure:", { error, data: parsedData, errMsg });

          if (errMsg.includes('Refresh Token')) {
            toast({ title: "Сессия истекла", description: "Пожалуйста, обновите страницу", variant: "destructive" });
          } else {
            toast({ title: "Ошибка оплаты (Paddle)", description: errMsg, variant: "destructive" });
          }
          setSelectedPlanId(null);
          return;
        }

        sessionStorage.setItem('paddle_transaction_id', parsedData.transaction_id);
        localStorage.setItem('paddle_transaction_id', parsedData.transaction_id);

        const paddleCheckoutUrl = `https://checkout.paddle.com/transaction/${parsedData.transaction_id}`;
        const isTelegram = isTelegramMiniApp();
        const webApp = getTelegramWebApp();


        if (paddleInstance) {
          try {
            console.log("[PaywallModal] Opening Paddle Checkout (Overlay)...", parsedData.transaction_id);
            paddleInstance.Checkout.open({
              transactionId: parsedData.transaction_id,
              settings: {
                displayMode: "inline",
                theme: "light", // Inline mode works best with light theme inside our custom dark modal
                frameTarget: "paddle-checkout-container", // Target our custom container
                frameInitialHeight: 450,
                frameStyle: "width:100%; min-width:312px; background-color: transparent; border: none;",
                // No successUrl — handle via eventCallback to avoid page navigation
              },
            });
            setSelectedPlanId(null);
          } catch {
            setSelectedPlanId(null);
            window.location.href = paddleCheckoutUrl;
          }
        } else {
          setSelectedPlanId(null);
          window.location.href = paddleCheckoutUrl;
        }
      } else if (paymentMethod === 'cryptomus') {
        const { data, error } = await supabase.functions.invoke("cryptomus-payment", {
          body: {
            user_id: profileId,
            catalog_key: catalogKey,
          },
        });

        if (error || data?.error || !data?.url) {
          console.error("[PaywallModal] Cryptomus purchase error:", error || data?.error);
          toast({
            title: "Ошибка оплаты (Cryptomus)",
            description: (error?.message || data?.error || "Попробуйте позже"),
            variant: "destructive"
          });
          setSelectedPlanId(null);
          return;
        }

        // Перенаправляем на страницу оплаты Cryptomus
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("[PaywallModal] Global error:", err);
      toast({ title: "Ошибка", description: err?.message || "Непредвиденная ошибка. Попробуйте позже.", variant: "destructive" });
      setSelectedPlanId(null);
    }
  };

  // Варианты анимации для контейнера
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <>
      <UnifiedModal
        open={open}
        onOpenChange={onOpenChange}
        modalRouteKey="paywall"
        showTitleBar={false}
        className={cn(
          "sm:max-w-[950px] p-0 overflow-hidden border-0",
          !isMobile && "bg-transparent shadow-none"
        )}
        contentClassName="p-0 bg-transparent border-0"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "relative overflow-hidden flex flex-col md:flex-row bg-white dark:bg-slate-950 rounded-[32px] shadow-2xl",
            "min-h-[85vh] md:min-h-[650px] md:max-h-[85vh]"
          )}
        >

          {/* LEFTSIDE (PREMIUM DARK) */}
          <div className="relative w-full md:w-[42%] bg-[#080B16] text-white p-6 md:p-10 flex flex-col justify-between overflow-hidden z-10">
            {/* Animated BG */}
            <AnimatedBackground />

            {/* Content with Delay */}
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-8 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg shadow-violet-900/20"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-amber-100">Premium Access</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-4xl md:text-5xl font-black mb-6 leading-[0.95] tracking-tight"
              >
                Сдай экзамен <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 animate-gradient-x">
                  с первого раза
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 text-sm md:text-base mb-10 leading-relaxed max-w-[90%]"
              >
                Разблокируй <span className="text-white font-semibold">AI-технологии</span> обучения и получи unfair advantage перед другими кандидатами.
              </motion.p>

              <div className="space-y-5 mb-8">
                <BenefitItem icon={Zap} text="AI-Помощник с мгновенными объяснениями" color="text-amber-400" delay={0.5} />
                <BenefitItem icon={ShieldCheck} text="Гарантия сдачи (Smart Score)" color="text-emerald-400" delay={0.6} />
                <BenefitItem icon={Trophy} text="Premium-турниры и x2 опыт" color="text-violet-400" delay={0.7} />
                <BenefitItem icon={Sparkles} text="Без рекламы, полная концентрация" color="text-sky-400" delay={0.8} />
              </div>
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="relative z-10 hidden md:flex items-center gap-4 pt-8 border-t border-white/5"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-9 h-9 rounded-full border-2 border-[#080B16] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-lg z-${30 - i * 10}`}>
                    <span className="opacity-50">👤</span>
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full border-2 border-[#080B16] bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg z-0">
                  +50k
                </div>
              </div>
              <div>
                <div className="flex text-amber-400 text-[10px] gap-0.5 mb-1">
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                </div>
                <p className="text-[11px] font-medium text-slate-400">Доверяют 50,000+ учеников</p>
              </div>
            </motion.div>
          </div>

          {/* RIGHTSIDE (PLANS) */}
          <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0F121E] p-4 md:p-8 md:pl-10 flex flex-col overflow-y-auto relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex-1 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4"
              >
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Выберите план</h3>
                  <p className="text-sm text-slate-500 font-medium">Инвестиция в ваши водительские права</p>
                </div>

                {/* Payment Method Selector */}
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {showPaddlePayment && (
                    <button
                      onClick={() => setPaymentMethod('paddle')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        paymentMethod === 'paddle'
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Карта</span>
                    </button>
                  )}
                  {showCryptomusPayment && (
                    <button
                      onClick={() => setPaymentMethod('cryptomus')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        paymentMethod === 'cryptomus'
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <Bitcoin className="w-3.5 h-3.5" />
                      <span>Крипта</span>
                    </button>
                  )}
                  {showTonPayment && (
                    <button
                      onClick={() => setPaymentMethod('ton')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        paymentMethod === 'ton'
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>TON</span>
                    </button>
                  )}
                </div>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {PRICING_PLANS.map((plan) => {
                  const isPopular = plan.popular;
                  const isBestValue = plan.savings === '50%';

                  return (
                    <motion.div
                      key={plan.id}
                      variants={itemVariants}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative group rounded-[24px] transition-all duration-500 isolate",
                        "z-0 hover:z-10" // Lift up on hover
                      )}
                    >
                      {/* Intense Glow Shadow for Popular */}
                      {isPopular && (
                        <div className="absolute inset-0 -z-10 rounded-[24px] bg-violet-600/0 group-hover:bg-violet-600/40 blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                      )}

                      {/* Standard Shadow for others */}
                      {!isPopular && (
                        <div className="absolute inset-0 -z-10 rounded-[24px] bg-black/5 group-hover:bg-black/10 blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                      )}

                      <div className={cn(
                        "relative h-full p-6 rounded-[24px] border flex flex-col transition-all duration-300 overflow-hidden",
                        isPopular
                          ? "border-transparent bg-[#1E1B2E] text-white shadow-2xl shadow-violet-900/20 group-hover:shadow-[0_0_60px_-15px_rgba(139,92,246,0.5)]"
                          : "bg-white dark:bg-[#151926] border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm group-hover:shadow-xl dark:shadow-black/50"
                      )}>

                        {/* Softher, Sleeker Shimmer (Блик) */}
                        {isPopular && (
                          <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none mix-blend-overlay">
                            <motion.div
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                              className="absolute top-0 bottom-0 w-[40%] -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-md"
                            />
                          </div>
                        )}

                        {/* Header Row: Badges */}
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-5 min-h-[28px]">
                          {isPopular ? (
                            <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-[0_4px_12px_rgba(124,58,237,0.3)] text-[10px] py-1 px-3 tracking-wider font-bold animate-pulse hover:scale-105 transition-transform">
                              🔥 MOST POPULAR
                            </Badge>
                          ) : isBestValue ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-0 font-bold text-[10px] py-1 px-3 hover:scale-105 transition-transform">
                              👑 BEST VALUE
                            </Badge>
                          ) : (
                            <div /> // spacer
                          )}

                          {plan.savings && (
                            <div className={cn(
                              "text-[10px] font-bold px-3 py-1 rounded-full border transform transition-transform group-hover:scale-110",
                              isPopular
                                ? "bg-white/10 text-white border-white/10 backdrop-blur-sm"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            )}>
                              SAVE {plan.savings}
                            </div>
                          )}
                        </div>

                        {/* Plan Title & Price */}
                        <div className="mb-6 relative">
                          <h4 className={cn(
                            "text-xs font-bold uppercase tracking-widest mb-2 transition-colors",
                            isPopular ? "text-violet-200 opacity-80 group-hover:text-white group-hover:opacity-100" : "text-slate-400 group-hover:text-violet-500"
                          )}>
                            {plan.title}
                          </h4>
                          <div className="flex items-baseline gap-1.5">
                            <span className={cn(
                              "text-4xl font-black tracking-tighter transition-all duration-300",
                              isPopular ? "text-white group-hover:scale-105 origin-left shadow-black drop-shadow-lg" : "text-slate-900 dark:text-white group-hover:scale-105 origin-left"
                            )}>
                              {plan.price}
                            </span>
                          </div>
                          {plan.pricePerMonth && (
                            <p className={cn("text-[11px] font-semibold mt-1.5 transition-colors", isPopular ? "text-violet-200" : "text-slate-500 dark:text-slate-400")}>
                              {plan.pricePerMonth} / месяц
                            </p>
                          )}
                        </div>

                        {/* Visual Divider */}
                        <div className={cn(
                          "h-px w-full mb-5 transition-colors duration-300",
                          isPopular ? "bg-white/10 group-hover:bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30"
                        )} />

                        {/* Action Button */}
                        <div className="mt-auto">
                          {isTelegramMiniApp() ? (
                            <div className="space-y-2">
                              {paymentMethod === 'ton' ? (
                                <TonPaymentWidget
                                  mode="compact"
                                  defaultAmount={
                                    plan.id === 'yearly' ? '9.9' :
                                      plan.id === 'quarterly' ? '3.9' :
                                        plan.id === 'lifetime' ? '25' : '1.5'
                                  }
                                  defaultComment={`${plan.title} Subscription`}
                                />
                              ) : (
                                <StarsPaymentButton
                                  packageKey={PLAN_TO_CATALOG[plan.id]}
                                  priceCoins={0}
                                  className={cn(
                                    "w-full font-bold h-12 rounded-xl transition-all duration-300 shadow-lg",
                                    isPopular
                                      ? "bg-white text-slate-900 hover:bg-slate-100 shadow-black/20"
                                      : "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-white"
                                  )}
                                />
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePurchase(plan.id); }}
                                className="w-full text-[10px] text-muted-foreground hover:text-violet-500 transition-colors uppercase tracking-widest font-bold text-center"
                              >
                                Оплатить картой / Криптой
                              </button>
                            </div>
                          ) : paymentMethod === 'ton' ? (
                            <TonPaymentWidget
                              mode="compact"
                              defaultAmount={
                                plan.id === 'yearly' ? '9.9' :
                                  plan.id === 'quarterly' ? '3.9' :
                                    plan.id === 'lifetime' ? '25' : '1.5'
                              }
                              defaultComment={`${plan.title} Subscription`}
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handlePurchase(plan.id); }}
                              className={cn(
                                "w-full font-bold h-12 rounded-xl transition-all duration-300 relative overflow-hidden group/btn",
                                isPopular
                                  ? "bg-white text-slate-900 hover:bg-white hover:text-violet-700 shadow-lg shadow-black/20"
                                  : "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-violet-900/30 dark:hover:border-violet-500/30"
                              )}
                            >
                              {selectedPlanId === plan.id ? (
                                <svg className="w-5 h-5 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                  Выбрать
                                  <motion.div
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                                  >
                                    {isPopular ? <Sparkles className="w-4 h-4" /> : <span className="text-lg leading-none">→</span>}
                                  </motion.div>
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Footer Trust */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/50 text-center"
            >
              <p className="text-[10px] font-medium text-slate-400 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Гарантия безопасности</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-violet-500" /> Мгновенный доступ</span>
                <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-slate-500" /> Отмена в любой момент</span>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </UnifiedModal>

      <CheckoutModal
        open={!!selectedPlanId && paymentMethod === 'paddle'}
        onClose={() => {
          if (paddle) paddle.Checkout.close();
          setSelectedPlanId(null);
        }}
      >
        <div id="paddle-checkout-container" className="w-full h-full" />
      </CheckoutModal>
    </>
  );
}
// Компонент кастомного модального окна для чекаута
function CheckoutModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/95"
        onClick={onClose}
      />
      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            Безопасная оплата
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.1929 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.1929 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
          </button>
        </div>
        <div className="p-0 bg-white min-h-[400px] relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-8 h-8 text-slate-300 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div id="paddle-checkout-container" className="relative z-10 w-full h-full min-h-[450px]"></div>
        </div>
      </motion.div>
    </div>
  );
}
