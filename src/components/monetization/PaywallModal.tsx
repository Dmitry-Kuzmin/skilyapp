import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Drawer as VaulDrawer } from "vaul";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { Crown, Check, ShieldCheck, Zap, Star, Sparkles, Trophy, Lock, ChevronRight, X as XIcon, ArrowLeft, Brain, BarChart3, Infinity, Swords } from "lucide-react";
import { isTelegramMiniApp } from "@/lib/telegram";
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

import { TrialCTA } from "@/components/monetization/TrialCTA";
import { SocialTrustBadge } from "@/components/shared/SocialTrustBadge";
import { useModalStack } from "@/hooks/useModalStack";
import { PaymentSelectorModal } from "@/components/shop/PaymentSelectorModal";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_TO_CATALOG: Record<string, string> = {
  monthly: 'premium_monthly',
  quarterly: 'premium_quarterly',
  biannual: 'premium_biannual',
  yearly: 'premium_yearly',
  lifetime: 'premium_lifetime',
};

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 20, 0],
        y: [0, -20, 0],
      }}
      transition={{ duration: 8, repeat: 999, ease: "easeInOut" }}
      className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600 rounded-full blur-[120px] mix-blend-screen"
    />
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.2, 0.4, 0.2],
        x: [0, -30, 0],
        y: [0, 30, 0],
      }}
      transition={{ duration: 10, repeat: 999, ease: "easeInOut", delay: 1 }}
      className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-500 rounded-full blur-[100px] mix-blend-screen"
    />
    <motion.div
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.2, 0.3, 0.2],
      }}
      transition={{ duration: 12, repeat: 999, ease: "easeInOut", delay: 2 }}
      className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-[140px] mix-blend-screen"
    />
  </div>
);

const BenefitItem = ({ icon: Icon, text, color, delay }: { icon: any, text: string, color: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="flex items-center gap-3 group"
  >
    <div className={cn(
      "p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
      color
    )}>
      <Icon className={cn("w-5 h-5 transition-colors", color)} />
    </div>
    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{text}</span>
  </motion.div>
);

const PADDLE_FRAME_CLASS = "paywall-paddle-frame";

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { profileId, platform } = useUserContext();
  const { isPremium } = usePremium();
  const [checkoutTransactionId, setCheckoutTransactionId] = useState<string | null>(null);
  const [showExitTrial, setShowExitTrial] = useState(false);
  const [hasSeenExitTrial, setHasSeenExitTrial] = useState(false);
  const isMobile = useIsMobile();

  // Принудительно держим пейволл в стеке, пока он открыт (даже если перешли к оплате),
  // чтобы GlobalModalManager не разблокировал скролл фона.
  useModalStack("paywall-global-lock", open, "Paywall");
  const { language } = useLanguage();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const paddleLocale = language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en';

  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !showPaddlePayment) return;
    const existing = getPaddleInstanceSync();
    if (existing) { setPaddle(existing); return; }
    getPaddleInstance().then(inst => inst && setPaddle(inst)).catch(() => { });
  }, [open, showPaddlePayment]);

  useEffect(() => {
    if (open) {
      setShowExitTrial(false);
      setCheckoutTransactionId(null);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isPremium && !hasSeenExitTrial && !checkoutTransactionId) {
      setShowExitTrial(true);
      setHasSeenExitTrial(true);
      return;
    }
    if (!newOpen) {
      setShowExitTrial(false);
    }
    onOpenChange(newOpen);
  };

  useEffect(() => {
    if (!open) {
      try { paddle?.Checkout.close(); } catch { /* noop */ }
      setCheckoutTransactionId(null);
    }
  }, [open, paddle]);

  useEffect(() => {
    if (!checkoutTransactionId) return;
    let cancelled = false;

    const openCheckout = async () => {
      const instance = paddle ?? getPaddleInstanceSync() ?? await getPaddleInstance();
      if (cancelled || !instance) return;

      // Wait for the container to mount in DOM after the React commit
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;

      const container = document.getElementsByClassName(PADDLE_FRAME_CLASS)[0];
      if (!container) return;
      container.innerHTML = '';

      (instance.Checkout.open as (opts: unknown) => void)({
        transactionId: checkoutTransactionId,
        settings: {
          displayMode: 'inline',
          frameTarget: PADDLE_FRAME_CLASS,
          frameInitialHeight: 450,
          frameStyle: 'width: 100%; border: none;',
          theme: 'light',
          locale: paddleLocale,
        },
        eventCallback: (event: { name: string }) => {
          if (event?.name === 'checkout.completed') {
            toast({ title: t.paymentSuccess, description: t.paymentSuccessDesc });
            setTimeout(() => { setCheckoutTransactionId(null); onOpenChange(false); }, 1200);
          }
        },
      });
    };

    openCheckout();
    return () => { cancelled = true; };
  }, [checkoutTransactionId, paddle, paddleLocale, onOpenChange]);

  const TRANSLATIONS: Record<string, any> = {
    ru: {
      premiumAccess: "Premium Access",
      headline: "Сдай экзамен",
      headlineSub: "с первого раза",
      description: "Разблокируй AI-технологии обучения и получи unfair advantage перед другими кандидатами.",
      benefit1: "AI-Помощник с мгновенными объяснениями",
      benefit2: "Гарантия сдачи (Smart Score)",
      benefit3: "Premium-турниры и x2 опыт",
      benefit4: "Без рекламы, полная концентрация",
      feature: "Функция",
      free: "Free",
      pro: "Premium",
      f_tests: "Тесты в день",
      f_base: "База вопросов",
      f_ai: "AI-Помощник",
      f_stats: "Статистика",
      f_duels: "Комиссия дуэлей",
      f_xp: "Опыт (XP)",
      unlimited: "Безлимит",
      trustText: "Доверяют 50,000+ учеников",
      selectPlan: "Выберите план",
      investmentText: "Инвестиция в ваши водительские права",
      card: "Карта",
      crypto: "Крипта",
      mostPopular: "MOST POPULAR",
      bestValue: "BEST VALUE",
      save: "SAVE",
      select: "Выбрать",
      securePayment: "Безопасная оплата",
      securityGuarantee: "Гарантия безопасности",
      instantAccess: "Мгновенный доступ",
      cancelAnytime: "Отмена в любой момент",
      perMonth: "в месяц",
      payWithCard: "Оплатить картой / Криптой",
      sessionExpired: "Сессия истекла",
      refreshPage: "Пожалуйста, обновите страницу",
      unknownPlan: "Неизвестный план",
      loginRequired: "Необходимо войти в аккаунт",
      unknownError: "Непредвиденная ошибка. Попробуйте позже.",
      backToPlans: "Назад к планам",
      protectedByPaddle: "Защищено Paddle",
      loadingCheckout: "Загрузка безопасной оплаты…",
      paymentSuccess: "Оплата прошла успешно",
      paymentSuccessDesc: "Premium активирован 🎉",
      tryAgain: "Повторить"
    },
    en: {
      premiumAccess: "Premium Access",
      headline: "Pass the exam",
      headlineSub: "on the first try",
      description: "Unlock AI learning technologies and gain an unfair advantage over other candidates.",
      benefit1: "AI Assistant with instant explanations",
      benefit2: "Passing Guarantee (Smart Score)",
      benefit3: "Premium tournaments and x2 experience",
      benefit4: "No ads, full concentration",
      feature: "Feature",
      free: "Free",
      pro: "Premium",
      f_tests: "Tests per day",
      f_base: "Question database",
      f_ai: "AI Assistant",
      f_stats: "Statistics",
      f_duels: "Duel Fee",
      f_xp: "Experience (XP)",
      unlimited: "Unlimited",
      trustText: "Trusted by 50,000+ students",
      selectPlan: "Select a plan",
      investmentText: "An investment in your driving license",
      card: "Card",
      crypto: "Crypto",
      mostPopular: "MOST POPULAR",
      bestValue: "BEST VALUE",
      save: "SAVE",
      select: "Select",
      securePayment: "Secure Payment",
      securityGuarantee: "Security Guarantee",
      instantAccess: "Instant Access",
      cancelAnytime: "Cancel anytime",
      perMonth: "per month",
      payWithCard: "Pay with Card / Crypto",
      sessionExpired: "Session expired",
      refreshPage: "Please refresh the page",
      unknownPlan: "Unknown plan",
      loginRequired: "Please log in first",
      unknownError: "An unexpected error occurred. Please try again later.",
      backToPlans: "Back to plans",
      protectedByPaddle: "Secured by Paddle",
      loadingCheckout: "Loading secure checkout…",
      paymentSuccess: "Payment successful",
      paymentSuccessDesc: "Premium activated 🎉",
      tryAgain: "Try again"
    },
    es: {
      premiumAccess: "Premium Access",
      headline: "Aprueba el examen",
      headlineSub: "a la primera",
      description: "Desbloquea tecnologías de IA y obtén una ventaja competitiva frente a otros candidatos.",
      benefit1: "Asistente IA con explicaciones al instante",
      benefit2: "Garantía de aprobado (Smart Score)",
      benefit3: "Torneos Premium y x2 de experiencia",
      benefit4: "Sin anuncios, concentración total",
      feature: "Función",
      free: "Gratis",
      pro: "Premium",
      f_tests: "Tests por día",
      f_base: "Base de preguntas",
      f_ai: "Asistente IA",
      f_stats: "Estadísticas",
      f_duels: "Comisión de duelos",
      f_xp: "Experiencia (XP)",
      unlimited: "Ilimitado",
      trustText: "Más de 50,000 alumnos confían en nosotros",
      selectPlan: "Elige tu plan",
      investmentText: "Una inversión en tu carnet de conducir",
      card: "Tarjeta",
      crypto: "Cripto",
      mostPopular: "MÁS POPULAR",
      bestValue: "MEJOR PRECIO",
      save: "AHORRA",
      select: "Seleccionar",
      securePayment: "Pago Seguro",
      securityGuarantee: "Seguridad garantizada",
      instantAccess: "Acceso instantáneo",
      cancelAnytime: "Cancela cuando quieras",
      perMonth: "al mes",
      payWithCard: "Pagar con Tarjeta / Cripto",
      sessionExpired: "Sesión caducada",
      refreshPage: "Por favor, actualiza la página",
      unknownPlan: "Plan desconocido",
      loginRequired: "Es necesario iniciar sesión",
      unknownError: "Error inesperado. Inténtalo de nuevo más tarde.",
      backToPlans: "Volver a los planes",
      protectedByPaddle: "Protegido por Paddle",
      loadingCheckout: "Cargando pago seguro…",
      paymentSuccess: "Pago realizado",
      paymentSuccessDesc: "Premium activado 🎉",
      tryAgain: "Reintentar"
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [showComparison, setShowComparison] = useState(false);

  const BENEFITS = [
    { icon: Zap,      color: "text-amber-400",  bg: "bg-amber-500/10",   text: language === 'ru' ? "Безлимит тестов каждый день" : language === 'es' ? "Tests ilimitados cada día" : "Unlimited daily tests" },
    { icon: Brain,    color: "text-violet-400",  bg: "bg-violet-500/10",  text: language === 'ru' ? "AI запоминает твои слабые темы" : language === 'es' ? "IA recuerda tus puntos débiles" : "AI remembers your weak spots" },
    { icon: BarChart3,color: "text-emerald-400", bg: "bg-emerald-500/10", text: language === 'ru' ? "Глубокая статистика и прогноз" : language === 'es' ? "Estadísticas profundas y pronóstico" : "Deep stats & forecast" },
    { icon: Swords,   color: "text-rose-400",    bg: "bg-rose-500/10",    text: language === 'ru' ? "Комиссия дуэлей 0% (было 10%)" : language === 'es' ? "Comisión 0% en duelos" : "0% duel fee (was 10%)" },
    { icon: Infinity, color: "text-indigo-400",  bg: "bg-indigo-500/10",  text: language === 'ru' ? "3000+ вопросов вместо 300" : language === 'es' ? "3000+ preguntas en lugar de 300" : "3000+ questions instead of 300" },
  ];

  const isRu = language === 'ru';
  const isEs = language === 'es';

  // type: 'value' = показывает текст; 'bool' = ✓/✗; 'bool-inv' = ✗ у premium (реклама)
  const TABLE_SECTIONS: Array<{
    title: string;
    rows: Array<{ icon: any; label: string; free: string | boolean; pro: string | boolean; type: 'value' | 'bool' | 'bool-inv'; accent: string; highlight?: boolean }>;
  }> = [
    {
      title: isRu ? '📚 Обучение' : isEs ? '📚 Aprendizaje' : '📚 Learning',
      rows: [
        { icon: Zap,       label: isRu ? 'Тестов в день' : isEs ? 'Tests por día' : 'Tests per day',          free: isRu ? '5 / день' : isEs ? '5 / día' : '5 / day',      pro: '∞ ' + (isRu ? 'Безлимит' : isEs ? 'Ilimitado' : 'Unlimited'), type: 'value', accent: 'amber',   highlight: true },
        { icon: Infinity,  label: isRu ? 'База вопросов' : isEs ? 'Base de preguntas' : 'Question bank',       free: '300',                                                  pro: '3000+',                                                        type: 'value', accent: 'violet',  highlight: true },
      ],
    },
    {
      title: isRu ? '🤖 AI & Аналитика' : isEs ? '🤖 IA & Análisis' : '🤖 AI & Analytics',
      rows: [
        { icon: Brain,     label: isRu ? 'AI-Помощник' : isEs ? 'Asistente IA' : 'AI Assistant',              free: isRu ? '5 / день' : isEs ? '5 / día' : '5 / day',      pro: isRu ? 'Безлимит' : isEs ? 'Ilimitado' : 'Unlimited',          type: 'value', accent: 'violet',  highlight: true },
        { icon: Brain,     label: isRu ? 'AI помнит твои ошибки' : isEs ? 'IA recuerda tus errores' : 'AI remembers mistakes', free: false, pro: true,                       type: 'bool',  accent: 'emerald', highlight: true },
        { icon: BarChart3, label: isRu ? 'Глубокая статистика' : isEs ? 'Estadísticas avanzadas' : 'Deep stats', free: isRu ? 'Базовая' : isEs ? 'Básica' : 'Basic',       pro: 'Deep AI',                                                      type: 'value', accent: 'indigo' },
        { icon: BarChart3, label: isRu ? 'AI-прогноз сдачи' : isEs ? 'Pronóstico IA' : 'AI pass forecast',   free: isRu ? 'Базовый' : isEs ? 'Básico' : 'Basic', pro: isRu ? 'Полноценный' : isEs ? 'Completo' : 'Full', type: 'value', accent: 'indigo' },
      ],
    },
    {
      title: isRu ? '⚔️ Дуэли & Прогресс' : isEs ? '⚔️ Duelos & Progreso' : '⚔️ Duels & Progress',
      rows: [
        { icon: Star,      label: isRu ? 'Опыт (XP)' : isEs ? 'Experiencia (XP)' : 'XP gain',                 free: '× 1',                                                 pro: '× 2',                                                          type: 'value', accent: 'amber' },
        { icon: Star,      label: 'Duel Pass',                                                                  free: isRu ? 'Free трек' : 'Free track',                     pro: isRu ? 'Premium трек' : isEs ? 'Pista Premium' : 'Premium track', type: 'value', accent: 'amber' },
      ],
    },
    {
      title: isRu ? '✨ Комфорт' : isEs ? '✨ Comodidad' : '✨ Comfort',
      rows: [
        { icon: ShieldCheck, label: isRu ? 'Реклама' : isEs ? 'Anuncios' : 'Ads',                             free: true,                                                   pro: false,                                                          type: 'bool-inv', accent: 'emerald', highlight: true },
        { icon: Crown,     label: isRu ? 'Приоритетная поддержка' : isEs ? 'Soporte prioritario' : 'Priority support', free: false,                                         pro: true,                                                           type: 'bool',  accent: 'violet' },
      ],
    },
  ];

  const ComparisonTable = () => (
    <div className="mt-6 space-y-3">
      {BENEFITS.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 + i * 0.07 }}
          className="flex items-center gap-3"
        >
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", b.bg)}>
            <b.icon className={cn("w-3.5 h-3.5", b.color)} />
          </div>
          <span className="text-[12px] text-slate-300 leading-tight">{b.text}</span>
        </motion.div>
      ))}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        onClick={() => setShowComparison(true)}
        className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 hover:text-violet-400 transition-colors cursor-pointer group"
      >
        <span>{language === 'ru' ? 'Подробное сравнение' : language === 'es' ? 'Comparación completa' : 'Full comparison'}</span>
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </motion.button>
    </div>
  );

  const handlePaddlePurchase = async (planId: string) => {
    if (!profileId) {
      toast({ title: "Error", description: t.loginRequired, variant: "destructive" });
      return;
    }
    const catalogKey = PLAN_TO_CATALOG[planId];
    if (!catalogKey) {
      toast({ title: "Error", description: t.unknownPlan, variant: "destructive" });
      return;
    }
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
      let parsedData = data;
      if (typeof data === 'string') {
        try { parsedData = JSON.parse(data); } catch (e) { console.error("[PaywallModal] Failed to parse data string:", e); }
      }
      if (error || parsedData?.error || !parsedData?.transaction_id) {
        const rawError = error?.message || parsedData?.error || (error ? JSON.stringify(error) : null);
        const errMsg = rawError && rawError !== "null" ? rawError : "Paddle API Error";
        if (errMsg.includes('Refresh Token')) {
          toast({ title: t.sessionExpired, description: t.refreshPage, variant: "destructive" });
        } else {
          toast({ title: "Error", description: errMsg, variant: "destructive" });
        }
        return;
      }
      sessionStorage.setItem('paddle_transaction_id', parsedData.transaction_id);
      localStorage.setItem('paddle_transaction_id', parsedData.transaction_id);
      setCheckoutTransactionId(parsedData.transaction_id);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || t.unknownError, variant: "destructive" });
    }
  };

  const handleCryptomusPurchase = async (planId: string) => {
    if (!profileId) throw new Error(t.loginRequired);
    const catalogKey = PLAN_TO_CATALOG[planId];
    if (!catalogKey) throw new Error(t.unknownPlan);
    const plan = PRICING_PLANS.find(p => p.id === planId);
    const { data, error } = await supabase.functions.invoke("cryptomus-payment", {
      body: { user_id: profileId, catalog_key: catalogKey },
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (error || parsed?.error || !parsed?.url) {
      throw new Error(error?.message || parsed?.error || t.unknownError);
    }
    return {
      paymentUrl: parsed.url as string,
      orderId: (parsed.order_id ?? parsed.orderId ?? '') as string,
      amount: (parsed.amount ?? 0) as number,
      currency: (parsed.currency ?? 'USD') as string,
      itemName: plan?.title ?? 'Premium',
    };
  };

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

  // On mobile: plain div (Vaul handles the spring animation)
  // On desktop: motion.div with scale/fade entrance
  const ContentWrapper = isMobile ? 'div' : motion.div;
  const wrapperAnimProps = isMobile ? {} : {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.4, ease: "easeOut" },
  };

  return (
    <>
      <UnifiedModal
        open={open && !checkoutTransactionId}
        onOpenChange={handleOpenChange}
        modalRouteKey="paywall"
        showTitleBar={false}
        showHandle={true}
        preventClose={showComparison}
        className={cn(
          "p-0 border-0",
          !isMobile && "sm:max-w-[950px] overflow-hidden bg-transparent shadow-none"
        )}
        contentClassName="p-0 bg-transparent border-0"
      >
        <ContentWrapper
          {...wrapperAnimProps}
          className={cn(
            "relative bg-[#0A0D1B] dark:bg-[#080B16] flex flex-col md:flex-row",
            !isMobile && "overflow-hidden rounded-[32px] shadow-2xl min-h-[650px] max-h-[85vh]"
          )}
        >
          {showExitTrial ? (
            <div className="flex-1 w-full flex flex-col items-center justify-center p-6 md:p-12 text-center bg-gradient-to-br from-[#080B16] to-[#1E1B2E]">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">Секретный бонус 🎁</h2>
              <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed text-sm md:text-base">
                Мы уверены в качестве платформы, поэтому даем тебе возможность протестировать всё лично, прежде чем принимать решение.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 w-full max-w-md text-left">
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                     <ShieldCheck className="w-4 h-4 text-emerald-400" />
                   </div>
                   <span className="text-sm font-medium text-slate-200">Без привязки карты</span>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                   <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                     <Infinity className="w-4 h-4 text-violet-400" />
                   </div>
                   <span className="text-sm font-medium text-slate-200">Безлимит тестов</span>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                     <Brain className="w-4 h-4 text-blue-400" />
                   </div>
                   <span className="text-sm font-medium text-slate-200">AI-ассистент</span>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                   <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                     <Zap className="w-4 h-4 text-amber-400" />
                   </div>
                   <span className="text-sm font-medium text-slate-200">Мгновенный доступ</span>
                 </div>
              </div>
              
              <div className="w-full max-w-sm mx-auto space-y-4">
                <TrialCTA onTrialStarted={() => onOpenChange(false)} variant="inline" />
                <button 
                  onClick={() => onOpenChange(false)}
                  className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Нет, спасибо
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* LEFTSIDE (PREMIUM DARK) */}
          <div className="relative w-full md:w-[42%] bg-[#0A0D1B] dark:bg-[#080B16] text-white p-6 md:p-8 flex flex-col justify-between overflow-hidden z-10 border-r border-white/5">
            <AnimatedBackground />
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-6 bg-white/10 dark:bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 shadow-lg shadow-violet-950/20"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-amber-100">{t.premiumAccess}</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl md:text-4xl font-black mb-4 leading-[0.95] tracking-tight"
              >
                {t.headline} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 animate-gradient-x">
                  {t.headlineSub}
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed max-w-[90%]"
              >
                {t.description}
              </motion.p>

              <ComparisonTable />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="relative z-10 hidden md:flex items-center gap-4 pt-6 border-t border-white/5 mt-6"
            >
              <SocialTrustBadge />
            </motion.div>
          </div>

          {/* RIGHTSIDE (PLANS) */}
          <div className={cn("flex-1 bg-[#FDFDFF] dark:bg-[#0F121E] p-4 md:p-8 md:pl-10 flex flex-col relative", !isMobile && "overflow-y-auto")}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/[0.03] dark:bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex-1 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t.selectPlan}</h3>
                <p className="text-sm text-slate-500 font-medium">{t.investmentText}</p>
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
                      className="relative group rounded-[24px] transition-all duration-500 isolate z-0 hover:z-10"
                    >
                      {isPopular && (
                        <div className="absolute inset-0 -z-10 rounded-[24px] bg-violet-600/0 group-hover:bg-violet-600/40 blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                      )}
                      {!isPopular && (
                        <div className="absolute inset-0 -z-10 rounded-[24px] bg-black/5 group-hover:bg-black/10 blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                      )}
                      <div className={cn(
                        "relative h-full p-6 rounded-[24px] border flex flex-col transition-all duration-300 overflow-hidden",
                        isPopular
                          ? "border-transparent bg-[#1E1B2E] text-white shadow-2xl shadow-violet-900/20 group-hover:shadow-[0_0_60px_-15px_rgba(139,92,246,0.5)]"
                          : "bg-white dark:bg-[#151926] border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm group-hover:shadow-xl dark:shadow-black/50"
                      )}>
                        {isPopular && (
                          <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none mix-blend-overlay">
                            <motion.div
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{ duration: 4, repeat: 999, ease: "linear", repeatDelay: 0.5 }}
                              className="absolute top-0 bottom-0 w-[40%] -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-md"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-5 min-h-[28px]">
                          {isPopular ? (
                            <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-[0_4px_12px_rgba(124,58,237,0.3)] text-[10px] py-1 px-3 tracking-wider font-bold animate-pulse hover:scale-105 transition-transform">
                              {t.mostPopular}
                            </Badge>
                          ) : isBestValue ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-0 font-bold text-[10px] py-1 px-3 hover:scale-105 transition-transform">
                              {t.bestValue}
                            </Badge>
                          ) : <div />}
                          {plan.savings && (
                            <div className={cn(
                              "text-[10px] font-bold px-3 py-1 rounded-full border transform transition-transform group-hover:scale-110",
                              isPopular
                                ? "bg-white/10 text-white border-white/10 backdrop-blur-sm"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            )}>
                              {t.save} {plan.savings}
                            </div>
                          )}
                        </div>
                        <div className="mb-6 relative">
                          <h4 className={cn(
                            "text-xs font-bold uppercase tracking-widest mb-2 transition-colors",
                            isPopular ? "text-violet-200 opacity-80 group-hover:text-white group-hover:opacity-100" : "text-slate-400 group-hover:text-violet-500"
                          )}>{plan.title}</h4>
                          <div className="flex items-baseline gap-1.5">
                            <span className={cn(
                              "text-4xl font-black tracking-tighter transition-all duration-300",
                              isPopular ? "text-white group-hover:scale-105 origin-left shadow-black drop-shadow-lg" : "text-slate-900 dark:text-white group-hover:scale-105 origin-left"
                            )}>{plan.price}</span>
                          </div>
                          {plan.pricePerMonth && (
                            <p className={cn("text-[11px] font-semibold mt-1.5 transition-colors", isPopular ? "text-violet-200" : "text-slate-500 dark:text-slate-400")}>
                              {plan.pricePerMonth} {t.perMonth}
                            </p>
                          )}
                        </div>
                        <div className={cn(
                          "h-px w-full mb-5 transition-colors duration-300",
                          isPopular ? "bg-white/10 group-hover:bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30"
                        )} />
                        <div className="mt-auto">
                          <Button
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setSelectedPlanForPayment(plan.id); }}
                            className={cn(
                              "w-full font-bold h-12 rounded-xl transition-all duration-300 relative overflow-hidden group/btn",
                              isPopular
                                ? "bg-white text-slate-900 hover:bg-white hover:text-violet-700 shadow-lg shadow-black/20"
                                : "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-violet-900/30 dark:hover:border-violet-500/30"
                            )}
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {t.select}
                              <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: 999, ease: "easeInOut", repeatDelay: 3 }}>
                                {isPopular ? <Sparkles className="w-4 h-4" /> : <span className="text-lg leading-none">→</span>}
                              </motion.div>
                            </span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/50 text-center"
            >
              <p className="text-[10px] font-medium text-slate-400 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500" /> {t.securityGuarantee}</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-violet-500" /> {t.instantAccess}</span>
                <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-slate-500" /> {t.cancelAnytime}</span>
              </p>
            </motion.div>
          </div>
            </>
          )}
        </ContentWrapper>
      </UnifiedModal>

      {selectedPlanForPayment && !checkoutTransactionId && (() => {
        const plan = PRICING_PLANS.find(p => p.id === selectedPlanForPayment)!;
        return (
          <PaymentSelectorModal
            open={true}
            onOpenChange={(open) => { if (!open) setSelectedPlanForPayment(null); }}
            pack={{
              id: selectedPlanForPayment,
              catalogKey: PLAN_TO_CATALOG[selectedPlanForPayment],
              packageKey: PLAN_TO_CATALOG[selectedPlanForPayment],
              title: plan?.title ?? '',
              price: plan?.price ?? '',
              priceValue: 0,
              priceCoins: 0,
            }}
            onSuccess={() => onOpenChange(false)}
            onTonClick={() => {}}
            onCryptoClick={async () => handleCryptomusPurchase(selectedPlanForPayment)}
            onCardClick={() => {
              const planId = selectedPlanForPayment;
              setSelectedPlanForPayment(null);
              if (planId) handlePaddlePurchase(planId);
            }}
            availability={{
              stars: isTelegramMiniApp(),
              ton: false,
              crypto: showCryptomusPayment,
              card: showPaddlePayment,
            }}
          />
        );
      })()}

      {/* Mobile checkout: Vaul drawer with transparent overlay, rounded corners, swipe-anywhere */}
      {isMobile && (
        <VaulDrawer.Root
          open={open && !!checkoutTransactionId}
          onOpenChange={(next) => {
            if (!next) {
              try { paddle?.Checkout.close(); } catch { /* noop */ }
              setCheckoutTransactionId(null);
            }
          }}
          closeThreshold={0.2}
          shouldScaleBackground={false}
          dismissible={true}
          modal={true}
          noBodyStyles={false}
        >
          <VaulDrawer.Portal>
            <VaulDrawer.Overlay className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-[8px]" />
            <VaulDrawer.Content
              className="fixed bottom-0 left-0 right-0 z-[99999] flex flex-col bg-white rounded-[40px] mx-2 mb-4 overflow-hidden outline-none shadow-[0_-12px_60px_rgba(0,0,0,0.35)] border border-slate-100"
              onContextMenu={e => e.stopPropagation()}
              onPointerOut={e => e.stopPropagation()}
            >
              {/* Apple-style Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" data-vaul-drag-region>
                <div className="w-9 h-1.5 rounded-full bg-slate-200/80" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 shrink-0" data-vaul-drag-region>
                <button
                  onClick={() => {
                    try { paddle?.Checkout.close(); } catch { /* noop */ }
                    setCheckoutTransactionId(null);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 active:scale-90 transition-all shadow-sm"
                  aria-label={t.backToPlans}
                  data-vaul-no-drag
                >
                  <XIcon className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{t.protectedByPaddle}</span>
                </div>
              </div>

              {/* Paddle iframe container */}
              <div
                className={cn(PADDLE_FRAME_CLASS, "px-2 pb-4 min-h-[480px] overflow-y-auto")}
                style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
              />
            </VaulDrawer.Content>
          </VaulDrawer.Portal>
        </VaulDrawer.Root>
      )}

      {/* Desktop checkout: dialog */}
      {!isMobile && (
        <UnifiedModal
          open={open && !!checkoutTransactionId}
          onOpenChange={(next) => {
            if (!next) {
              try { paddle?.Checkout.close(); } catch { /* noop */ }
              setCheckoutTransactionId(null);
            }
          }}
          showTitleBar={false}
          showHandle={false}
          hideCloseButton={true}
          className="p-0 border-0 bg-white sm:max-w-[560px] overflow-hidden rounded-3xl"
          contentClassName="p-0 bg-white border-0"
        >
          <div className="flex flex-col bg-white md:min-h-[640px]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
              <button
                onClick={() => {
                  try { paddle?.Checkout.close(); } catch { /* noop */ }
                  setCheckoutTransactionId(null);
                }}
                className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
                aria-label={t.backToPlans}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.protectedByPaddle}</span>
              </div>
            </div>
            <div
              className={cn(PADDLE_FRAME_CLASS, "px-4 pt-2 min-h-[450px] flex-1")}
              style={{ paddingBottom: '24px' }}
            />
          </div>
        </UnifiedModal>
      )}

      {/* Comparison popup — portal escapes framer-motion transform stacking context */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-6"
              style={{ zIndex: 200000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', pointerEvents: 'auto' }}
              onClick={() => setShowComparison(false)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-[540px] bg-slate-950 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
                style={{ maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {/* Drag handle visual */}
                <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
                  <div className="h-[5px] w-10 rounded-full bg-white/20" />
                </div>

                {/* Close — fixed top-right, always above scroll */}
                <button
                  onClick={() => setShowComparison(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <XIcon className="w-4 h-4 text-slate-400" />
                </button>

                {/* Header — fixed, not scrollable */}
                <div className="flex-shrink-0 px-6 pt-4 pb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    {isRu ? 'Детальное сравнение' : isEs ? 'Comparación detallada' : 'Detailed comparison'}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-slate-400">Free</span>
                    <span className="text-slate-600 text-sm">vs</span>
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                      <span className="text-2xl font-black text-white">Premium</span>
                    </div>
                  </div>
                </div>

                {/* Column labels */}
                <div className="flex-shrink-0 mx-5 mb-1">
                  <div className="grid items-center py-2 px-3 rounded-xl bg-white/[0.03]" style={{ gridTemplateColumns: '1fr 110px 130px' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {isRu ? 'Функция' : isEs ? 'Función' : 'Feature'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">Free</span>
                    <div className="flex items-center justify-center gap-1">
                      <Crown className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Premium</span>
                    </div>
                  </div>
                </div>

                {/* Scrollable body */}
                <div
                  className="overflow-y-auto flex-1 px-5 pb-2 min-h-0"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
                  data-vaul-no-drag
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  {TABLE_SECTIONS.map((section, si) => (
                    <div key={si} className="mb-1">
                      {/* Section title */}
                      <div className="flex items-center gap-2 py-3">
                        <span className="text-[11px] font-bold text-slate-500 tracking-wider">{section.title}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>

                      {/* Rows */}
                      {section.rows.map((row, ri) => {
                        const isBool = row.type === 'bool' || row.type === 'bool-inv';
                        const freeBoolBad = row.type === 'bool' ? true : row.type === 'bool-inv' ? true : false;
                        // free: для bool — крестик; для bool-inv — крестик у free (реклама есть = плохо)
                        // pro: для bool — галочка; для bool-inv — галочка у pro (рекламы нет = хорошо)

                        return (
                          <div
                            key={ri}
                            className="grid items-center py-3 border-b border-white/[0.04] last:border-0"
                            style={{ gridTemplateColumns: '1fr 110px 130px' }}
                          >
                            {/* Feature label */}
                            <div className="flex items-center gap-2.5 pr-3">
                              <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                <row.icon className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <span className="text-[13px] text-slate-300 leading-tight">{row.label}</span>
                            </div>

                            {/* Free value */}
                            <div className="flex justify-center items-center">
                              {isBool ? (
                                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                  <XIcon className="w-2.5 h-2.5 text-slate-600" />
                                </span>
                              ) : (
                                <span className="text-[12px] text-slate-600 font-medium text-center">{String(row.free)}</span>
                              )}
                            </div>

                            {/* Premium value */}
                            <div className="flex justify-center items-center">
                              {isBool ? (
                                <Check className="w-5 h-5 text-amber-400" />
                              ) : (
                                <span className="text-[13px] font-bold text-amber-400 text-center leading-tight">
                                  {String(row.pro)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* CTA — fixed bottom, respects home indicator */}
                <div
                  className="flex-shrink-0 px-5 pt-4 border-t border-white/5"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
                >
                  <button
                    onClick={() => setShowComparison(false)}
                    className="w-full h-12 rounded-2xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 active:scale-[0.99] transition-all shadow-lg"
                  >
                    ← {isRu ? 'Выбрать план' : isEs ? 'Elegir plan' : 'Choose plan'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
