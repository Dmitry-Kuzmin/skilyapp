import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { useUserContext } from "@/contexts/UserContext";
import { Crown, Check, ShieldCheck, Zap, Star, Sparkles, Trophy, Lock, CreditCard, Bitcoin, Wallet, ChevronRight, X as XIcon, Brain, BarChart3, Infinity, Swords } from "lucide-react";
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
import { TrialCTA } from "@/components/monetization/TrialCTA";
import { SocialTrustBadge } from "@/components/shared/SocialTrustBadge";

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

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { profileId, platform } = useUserContext();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const [paymentMethod, setPaymentMethod] = useState<'paddle' | 'cryptomus'>(
    showPaddlePayment ? 'paddle' : 'cryptomus'
  );

  useEffect(() => {
    if (!open || !showPaddlePayment) return;
    const existing = getPaddleInstanceSync();
    if (existing) { setPaddle(existing); return; }
    getPaddleInstance().then(inst => inst && setPaddle(inst)).catch(() => { });
  }, [open, showPaddlePayment]);

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
      unknownError: "Непредвиденная ошибка. Попробуйте позже."
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
      unknownError: "An unexpected error occurred. Please try again later."
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
      unknownError: "Error inesperado. Inténtalo de nuevo más tarde."
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [showComparison, setShowComparison] = useState(false);

  const BENEFITS = [
    { icon: Zap,      color: "text-amber-400",  bg: "bg-amber-500/10",   text: language === 'ru' ? "Безлимит тестов каждый день" : language === 'es' ? "Tests ilimitados cada día" : "Unlimited daily tests" },
    { icon: Brain,    color: "text-violet-400",  bg: "bg-violet-500/10",  text: language === 'ru' ? "AI запоминает твои слабые темы" : language === 'es' ? "IA recuerda tus puntos débiles" : "AI remembers your weak spots" },
    { icon: BarChart3,color: "text-emerald-400", bg: "bg-emerald-500/10", text: language === 'ru' ? "Глубокая статистика и прогноз" : language === 'es' ? "Estadísticas profundas y pronóstico" : "Deep stats & forecast" },
    { icon: Swords,   color: "text-rose-400",    bg: "bg-rose-500/10",    text: language === 'ru' ? "Комиссия дуэлей 0% (было 10%)" : language === 'es' ? "Comisión 0% en duelos" : "0% duel fee (was 10%)" },
    { icon: Infinity, color: "text-indigo-400",  bg: "bg-indigo-500/10",  text: language === 'ru' ? "2157 вопросов вместо 300" : language === 'es' ? "2157 preguntas en lugar de 300" : "2157 questions instead of 300" },
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
        { icon: Infinity,  label: isRu ? 'База вопросов' : isEs ? 'Base de preguntas' : 'Question bank',       free: '300',                                                  pro: '2 157',                                                        type: 'value', accent: 'violet',  highlight: true },
        { icon: Trophy,    label: isRu ? 'Вопросов за сессию' : isEs ? 'Preguntas por sesión' : 'Per session',  free: '20',                                                  pro: isRu ? 'Без лимита' : isEs ? 'Sin límite' : 'Unlimited',        type: 'value', accent: 'emerald' },
      ],
    },
    {
      title: isRu ? '🤖 AI & Аналитика' : isEs ? '🤖 IA & Análisis' : '🤖 AI & Analytics',
      rows: [
        { icon: Brain,     label: isRu ? 'AI-Помощник' : isEs ? 'Asistente IA' : 'AI Assistant',              free: isRu ? '5 / день' : isEs ? '5 / día' : '5 / day',      pro: isRu ? 'Безлимит' : isEs ? 'Ilimitado' : 'Unlimited',          type: 'value', accent: 'violet',  highlight: true },
        { icon: Brain,     label: isRu ? 'AI помнит твои ошибки' : isEs ? 'IA recuerda tus errores' : 'AI remembers mistakes', free: false, pro: true,                       type: 'bool',  accent: 'emerald', highlight: true },
        { icon: BarChart3, label: isRu ? 'Глубокая статистика' : isEs ? 'Estadísticas avanzadas' : 'Deep stats', free: isRu ? 'Базовая' : isEs ? 'Básica' : 'Basic',       pro: 'Deep AI',                                                      type: 'value', accent: 'indigo' },
        { icon: BarChart3, label: isRu ? 'AI-прогноз сдачи' : isEs ? 'Pronóstico IA' : 'AI pass forecast',   free: false,                                                  pro: true,                                                           type: 'bool',  accent: 'indigo' },
      ],
    },
    {
      title: isRu ? '⚔️ Дуэли & Прогресс' : isEs ? '⚔️ Duelos & Progreso' : '⚔️ Duels & Progress',
      rows: [
        { icon: Swords,    label: isRu ? 'Комиссия дуэлей' : isEs ? 'Comisión de duelos' : 'Duel fee',        free: '10%',                                                  pro: '0%',                                                           type: 'value', accent: 'rose',    highlight: true },
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

  const handlePurchase = async (planId: string) => {
    if (!profileId) {
      toast({ title: "Error", description: t.loginRequired, variant: "destructive" });
      return;
    }

    const catalogKey = PLAN_TO_CATALOG[planId];
    if (!catalogKey) {
      toast({ title: "Error", description: t.unknownPlan, variant: "destructive" });
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
        const { data, error } = await supabase.functions.invoke("paddle-payment", {
          body: {
            user_id: profileId,
            catalog_key: catalogKey,
            ...(partnerCode ? { partner_code: partnerCode } : {}),
          },
        });

        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            console.error("[PaywallModal] Failed to parse data string:", e);
          }
        }

        if (error || parsedData?.error || !parsedData?.transaction_id) {
          const rawError = error?.message || parsedData?.error || (error ? JSON.stringify(error) : null);
          const errMsg = rawError && rawError !== "null" ? rawError : "Paddle API Error";

          if (errMsg.includes('Refresh Token')) {
            toast({ title: t.sessionExpired, description: t.refreshPage, variant: "destructive" });
          } else {
            toast({ title: "Error", description: errMsg, variant: "destructive" });
          }
          setSelectedPlanId(null);
          return;
        }

        sessionStorage.setItem('paddle_transaction_id', parsedData.transaction_id);
        localStorage.setItem('paddle_transaction_id', parsedData.transaction_id);

        setSelectedPlanId(null);
        if (paddleInstance) {
          paddleInstance.Checkout.open({
            transactionId: parsedData.transaction_id,
            settings: { displayMode: "overlay", theme: "dark" },
          });
        }
      } else if (paymentMethod === 'cryptomus') {
        const { data, error } = await supabase.functions.invoke("cryptomus-payment", {
          body: {
            user_id: profileId,
            catalog_key: catalogKey,
          },
        });

        const parsed = typeof data === 'string' ? JSON.parse(data) : data;

        if (error || parsed?.error || !parsed?.url) {
          toast({
            title: "Error (Cryptomus)",
            description: (error?.message || parsed?.error || t.unknownError),
            variant: "destructive"
          });
          setSelectedPlanId(null);
          return;
        }

        window.open(parsed.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || t.unknownError, variant: "destructive" });
      setSelectedPlanId(null);
    }
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
              <SocialTrustBadge totalCount="50,000+" />
            </motion.div>
          </div>

          {/* RIGHTSIDE (PLANS) */}
          <div className="flex-1 bg-[#FDFDFF] dark:bg-[#0F121E] p-4 md:p-8 md:pl-10 flex flex-col overflow-y-auto relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/[0.03] dark:bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex-1 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4"
              >
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t.selectPlan}</h3>
                  <p className="text-sm text-slate-500 font-medium">{t.investmentText}</p>
                </div>
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
                      <span>{t.card}</span>
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
                      <span>{t.crypto}</span>
                    </button>
                  )}
                </div>
              </motion.div>

              <TrialCTA onTrialStarted={() => onOpenChange(false)} />

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
                          {isTelegramMiniApp() ? (
                            <div className="space-y-2">
                              <StarsPaymentButton
                                packageKey={PLAN_TO_CATALOG[plan.id]}
                                priceCoins={0}
                                className={cn(
                                  "w-full font-bold h-12 rounded-xl transition-all duration-300 shadow-lg",
                                  isPopular ? "bg-white text-slate-900 hover:bg-slate-100 shadow-black/20" : "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-white"
                                )}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePurchase(plan.id); }}
                                className="w-full text-[10px] text-muted-foreground hover:text-violet-500 transition-colors uppercase tracking-widest font-bold text-center"
                              >{t.payWithCard}</button>
                            </div>
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
                                  {t.select}
                                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: 999, ease: "easeInOut", repeatDelay: 3 }}>
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

      {/* Comparison popup — portal escapes framer-motion transform stacking context */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
              style={{ zIndex: 99999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)' }}
              onClick={() => setShowComparison(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-[480px] bg-[#080c18] border border-white/8 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/60 flex flex-col max-h-[92vh]"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400 mb-1">
                      {isRu ? 'Детальное сравнение' : isEs ? 'Comparación detallada' : 'Detailed comparison'}
                    </p>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-white">Free</h3>
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="text-xs">vs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-400">Premium</h3>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
                  >
                    <XIcon className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Column header bar */}
                <div className="grid grid-cols-[1fr_90px_108px] px-4 py-2 mx-4 mb-2 rounded-2xl bg-white/[0.03] border border-white/5 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 pl-7">
                    {isRu ? 'Функция' : isEs ? 'Función' : 'Feature'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">Free</span>
                  <div className="flex items-center justify-center gap-1">
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Premium</span>
                  </div>
                </div>

                {/* Scrollable rows */}
                <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
                  {TABLE_SECTIONS.map((section, si) => (
                    <div key={si}>
                      {/* Section title */}
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{section.title}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>

                      {/* Rows */}
                      <div className="space-y-0.5">
                        {section.rows.map((row, ri) => {
                          const globalIdx = si * 10 + ri;

                          // Render free cell
                          const FreeCell = () => {
                            if (row.type === 'bool') return (
                              <div className="flex justify-center">
                                <span className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                                  <XIcon className="w-3 h-3 text-red-500" />
                                </span>
                              </div>
                            );
                            if (row.type === 'bool-inv') return (
                              <div className="flex justify-center">
                                <span className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                                  <XIcon className="w-3 h-3 text-red-500" />
                                </span>
                              </div>
                            );
                            return <span className="text-[11px] text-center text-slate-600 font-medium block">{String(row.free)}</span>;
                          };

                          // Render pro cell
                          const accentColors: Record<string, string> = {
                            amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                            violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
                            emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                            indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                            rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                          };
                          const accentCls = accentColors[row.accent] || accentColors.violet;

                          const ProCell = () => {
                            if (row.type === 'bool') return (
                              <div className="flex justify-center">
                                <span className={cn("w-6 h-6 rounded-full border flex items-center justify-center", accentCls)}>
                                  <Check className="w-3 h-3" />
                                </span>
                              </div>
                            );
                            if (row.type === 'bool-inv') return (
                              <div className="flex justify-center">
                                <span className={cn("w-6 h-6 rounded-full border flex items-center justify-center", accentCls)}>
                                  <Check className="w-3 h-3" />
                                </span>
                              </div>
                            );
                            return (
                              <span className={cn(
                                "text-[11px] text-center font-black block px-2 py-1 rounded-xl border leading-tight",
                                accentCls
                              )}>
                                {String(row.pro)}
                              </span>
                            );
                          };

                          return (
                            <motion.div
                              key={ri}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + globalIdx * 0.025, duration: 0.3 }}
                              className={cn(
                                "grid grid-cols-[1fr_90px_108px] items-center py-2.5 px-2 rounded-xl transition-colors",
                                row.highlight ? "bg-white/[0.025] hover:bg-white/[0.04]" : "hover:bg-white/[0.025]"
                              )}
                            >
                              {/* Label */}
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                                  `bg-${row.accent}-500/10`
                                )}>
                                  <row.icon className={cn("w-3 h-3", `text-${row.accent}-500`)} />
                                </div>
                                <span className={cn(
                                  "text-[12px] font-medium leading-tight",
                                  row.highlight ? "text-slate-200" : "text-slate-400"
                                )}>
                                  {row.label}
                                </span>
                              </div>
                              {/* Free */}
                              <FreeCell />
                              {/* Pro */}
                              <div className="flex justify-center items-center">
                                <ProCell />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-5 pb-6 pt-3 border-t border-white/5 flex-shrink-0">
                  <button
                    onClick={() => setShowComparison(false)}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black hover:opacity-90 transition-opacity shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
                  >
                    <span>←</span>
                    <span>{isRu ? 'Выбрать план' : isEs ? 'Elegir plan' : 'Choose plan'}</span>
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

function CheckoutModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { language } = useLanguage();
  const TRANSLATIONS: Record<string, any> = {
    ru: { securePayment: "Безопасная оплата" },
    en: { securePayment: "Secure Payment" },
    es: { securePayment: "Pago Seguro" }
  };
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/95"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            {t.securePayment}
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
