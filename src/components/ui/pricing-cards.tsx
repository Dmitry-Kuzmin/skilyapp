import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  Check, 
  X, 
  Sparkles,
  Target,
  BookOpen,
  Layers,
  Gamepad2,
  Swords,
  Bot,
  Flame,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORM_FEATURES = [
  { icon: <Target className="w-[14px] h-[14px] text-red-400" />, text: "Экзамен DGT — полная симуляция (30 вопросов, 30 мин)" },
  { icon: <BookOpen className="w-[14px] h-[14px] text-blue-400" />, text: "3 000+ вопросов с подробными объяснениями" },
  { icon: <Layers className="w-[14px] h-[14px] text-amber-400" />, text: "Тесты по темам и тест на ошибки" },
  { icon: <Gamepad2 className="w-[14px] h-[14px] text-emerald-400" />, text: "Флеш-карточки и интерактивные игры" },
  { icon: <Swords className="w-[14px] h-[14px] text-zinc-400" />, text: "Дуэли, Гонка, Блиц, Угадай Знак" },
  { icon: <Bot className="w-[14px] h-[14px] text-cyan-400" />, text: "Адаптивное обучение с ИИ" },
  { icon: <Flame className="w-[14px] h-[14px] text-orange-400" />, text: "Ежедневные серии, сезоны и рейтинг" },
  { icon: <Trophy className="w-[14px] h-[14px] text-yellow-400" />, text: "Достижения, значки и уровни" },
];

interface Plan {
  id: string;
  badge?: string;
  name: string;
  subtitle: string;
  oldPrice: number;
  price: number;
  platformMonths: number;
  features: { text: string; included: boolean }[];
  cta: string;
  botParam?: string;
  highlight: boolean;
  accentColor: string;
}

const BASE_PLANS: Plan[] = [
  {
    id: "theory",
    name: "Теория",
    subtitle: "Живой курс + платформа в подарок",
    oldPrice: 199,
    price: 199,
    platformMonths: 3,
    highlight: false,
    accentColor: "zinc",
    cta: "Занять место",
    botParam: "buy_basic",
    features: [
      { text: "16 живых эфиров (2 мес × 2/нед × 2ч)", included: true },
      { text: "Платформа Skilyapp на 3 мес в подарок", included: true },
      { text: "Записи занятий (доступ 30 дней)", included: true },
      { text: "Общий Telegram-чат учеников", included: true },
      { text: "Пошаговые инструкции по сбору документов", included: false },
      { text: "Полное ведение и запись на экзамен (помощь)", included: false },
    ],
  },
  {
    id: "pro",
    badge: "Хит потока",
    name: "С сопровождением",
    subtitle: "Курс + помощь с документами",
    oldPrice: 324,
    price: 259,
    platformMonths: 6,
    highlight: true,
    accentColor: "blue",
    cta: "Занять место",
    botParam: "buy_pro",
    features: [
      { text: "16 живых эфиров (2 мес × 2/нед × 2ч)", included: true },
      { text: "Платформа Skilyapp на 6 мес", included: true },
      { text: "Записи занятий (сохраняются на 6 месяцев)", included: true },
      { text: "Закрытый чат с кураторами и преподавателем", included: true },
      { text: "Испанский для водителей (мини-курс)", included: true },
      { text: "Пошаговые инструкции по сбору документов", included: true },
      { text: "Полное ведение и запись на экзамен (помощь)", included: false },
    ],
  },
  {
    id: "vip",
    badge: "Под ключ",
    name: "VIP",
    subtitle: "Полное ведение до получения прав",
    oldPrice: 437,
    price: 349,
    platformMonths: 12,
    highlight: false,
    accentColor: "violet",
    cta: "Занять место VIP",
    botParam: "buy_vip",
    features: [
      { text: "16 живых эфиров (2 мес × 2/нед × 2ч)", included: true },
      { text: "Платформа Skilyapp на 12 мес (Unlimited)", included: true },
      { text: "Записи занятий (сохраняются на 12 месяцев)", included: true },
      { text: "VIP-чат: личная поддержка 24/7", included: true },
      { text: "Испанский для водителей (мини-курс)", included: true },
      { text: "Индивидуальный разбор твоих документов", included: true },
      { text: "Полное ведение и запись на экзамен (помощь)", included: true },
    ],
  },
];

// Map DB plan id → index in BASE_PLANS
const DB_ID_MAP: Record<string, number> = { theory: 0, basic: 0, pro: 1, vip: 2 };

const ACCENT = {
  blue: {
    border: "border-blue-500/40",
    glow: "from-blue-500/30 via-cyan-500/20 to-transparent",
    badge: "bg-blue-500 text-white",
    btn: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/25",
    check: "text-blue-400",
    platform: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  },
  zinc: {
    border: "border-white/8",
    glow: "from-white/5 to-transparent",
    badge: "bg-zinc-700 text-zinc-200",
    btn: "bg-white/8 border border-white/10 hover:bg-white/12",
    check: "text-zinc-400",
    platform: "bg-white/5 border-white/10 text-zinc-400",
  },
  violet: {
    border: "border-violet-500/30",
    glow: "from-violet-500/30 via-purple-500/15 to-transparent",
    badge: "bg-gradient-to-r from-violet-500 to-purple-500 text-white",
    btn: "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/25",
    check: "text-violet-400",
    platform: "bg-violet-500/10 border-violet-500/20 text-violet-300",
  },
};

function PlatformAccordion({ accentColor }: { accentColor: keyof typeof ACCENT }) {
  const [open, setOpen] = useState(false);
  const acc = ACCENT[accentColor];

  return (
    <div className={cn("rounded-xl border mt-5", acc.platform)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest"
      >
        <span>Что входит в платформу Skilyapp</span>
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-1 gap-2">
              {PLATFORM_FEATURES.map((f) => (
                <div key={f.text} className="flex items-start gap-2.5 text-xs text-zinc-400">
                  <span className="shrink-0 mt-[1px]">{f.icon}</span>
                  <span className="leading-relaxed">{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DbPlanPrices {
  [planId: string]: { price_eur: number; original_price_eur: number | null; payment_link?: string | null };
}

interface PricingCardsProps {
  onBooking: () => void;
  dbPrices?: DbPlanPrices;
}

export function PricingCards({ onBooking, dbPrices }: PricingCardsProps) {
  const [recommendedPlanId, setRecommendedPlanId] = useState<string | null>(() =>
    sessionStorage.getItem("recommendedPlan")
  );
  const [flashPlanId, setFlashPlanId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleRecommend(e: Event) {
      const planId = (e as CustomEvent<{ planId: string }>).detail.planId;
      setRecommendedPlanId(planId);
      // Remove flash from all, then set on target
      setFlashPlanId(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlashPlanId(planId);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlashPlanId(null), 4000);
        });
      });
    }
    window.addEventListener("recommendPlan", handleRecommend);
    return () => window.removeEventListener("recommendPlan", handleRecommend);
  }, []);

  // Merge DB prices into BASE_PLANS (DB wins if available)
  const PLANS = BASE_PLANS.map((plan) => {
    const dbKey = Object.keys(DB_ID_MAP).find((k) => DB_ID_MAP[k] === BASE_PLANS.indexOf(plan));
    const dbPlan = dbKey && dbPrices?.[dbKey];
    if (dbPlan) {
      return {
        ...plan,
        price: dbPlan.price_eur,
        oldPrice: dbPlan.original_price_eur ?? plan.oldPrice,
        paymentLink: dbPlan.payment_link ?? undefined,
      };
    }
    return plan;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-[1325px] mx-auto px-4">
      {PLANS.map((plan) => {
        const acc = ACCENT[plan.accentColor as keyof typeof ACCENT];
        const isRecommended = recommendedPlanId === plan.id;
        const isFlashing = flashPlanId === plan.id;
        return (
          <div key={plan.id} id={`plan-${plan.id}`} className="relative flex flex-col">
            {/* Glow border */}
            {plan.highlight && (
              <div className={cn("absolute -inset-[1px] rounded-3xl bg-gradient-to-b blur-[1px]", acc.glow)} />
            )}

            <div
              className={cn(
                "relative flex flex-col flex-1 rounded-3xl border backdrop-blur-sm overflow-hidden",
                acc.border,
                plan.highlight && "ring-1 ring-blue-500/20",
                isRecommended && !isFlashing && "ring-1 ring-amber-500/30"
              )}
              style={{
                backgroundColor: isFlashing ? "rgba(245, 158, 11, 0.2)" : "#080e1c",
                boxShadow: isFlashing
                  ? "0 0 0 2px rgba(245,158,11,0.6), 0 0 50px 10px rgba(245,158,11,0.25), inset 0 0 60px 0 rgba(245,158,11,0.15)"
                  : isRecommended
                  ? "0 0 0 1px rgba(245,158,11,0.2)"
                  : "none",
                transition: "background-color 0.7s ease, box-shadow 0.7s ease",
              }}
            >
              {/* Card header */}
              <div className="p-6 pb-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {plan.badge && (
                    <div className={cn("inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest", acc.badge)}>
                      {plan.badge}
                    </div>
                  )}
                  {isRecommended && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-400"
                    >
                      <Sparkles className="w-3 h-3" />
                      Рекомендуем
                    </motion.div>
                  )}
                </div>
                {!plan.badge && !isRecommended && <div className="h-[26px]" />}
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-zinc-500 text-sm mb-5">{plan.subtitle}</p>

                {/* Price */}
                {plan.oldPrice > plan.price ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-600 text-sm line-through">€{plan.oldPrice}</span>
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        −{Math.round((1 - plan.price / plan.oldPrice) * 100)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-[26px]" /> // Spacer to keep alignment
                )}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-5xl font-black text-white tracking-tighter">€{plan.price}</span>
                  <span className="text-zinc-500 text-sm">разово</span>
                </div>
                <p className="text-zinc-600 text-[11px] mb-6">
                  Платформа {plan.platformMonths} мес · Полная оплата при бронировании
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 mx-6" />

              {/* Features */}
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-5">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-3 text-sm">
                      {f.included ? (
                        <Check className={cn("w-4 h-4 shrink-0 mt-0.5", acc.check)} />
                      ) : (
                        <X className="w-4 h-4 shrink-0 mt-0.5 text-zinc-700" />
                      )}
                      <span className={f.included ? "text-zinc-300" : "text-zinc-600"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Platform accordion */}
                <PlatformAccordion accentColor={plan.accentColor as keyof typeof ACCENT} />

                {/* CTA */}
                {plan.botParam ? (
                  <a
                    href={`https://t.me/skilyapp_bot?start=${plan.botParam}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (typeof window !== "undefined" && (window as any).gtag) {
                        (window as any).gtag("event", "conversion", {
                          send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                        });
                      }
                    }}
                    className={cn(
                      "w-full mt-5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] text-center block",
                      acc.btn,
                      "text-white"
                    )}
                  >
                    {plan.cta} →
                  </a>
                ) : (
                  <button
                    onClick={onBooking}
                    className={cn(
                      "w-full mt-5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]",
                      acc.btn,
                      "text-white"
                    )}
                  >
                    {plan.cta} →
                  </button>
                )}

                {/* Telegram question link */}
                <a
                  href="https://t.me/skilyapp_bot?start=course_qualify"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "conversion", {
                        send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                      });
                    }
                  }}
                  className="mt-2 text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1 block"
                >
                  Задать вопрос в Telegram
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
