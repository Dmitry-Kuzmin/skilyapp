import { lazy } from "react";
import { Flame, Zap, Sparkles, BarChart3, Trophy } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface TrialExpiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysRemaining: number;
  onUpgrade: () => void;
}

const DISMISS_KEY = "trial_expiry_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

const T = {
  ru: {
    title: "Пробный период истекает",
    days: (n: number) => n === 1 ? "через 1 день" : n === 0 ? "сегодня" : `через ${n} дня`,
    lose: "Что потеряешь:",
    b1: "3000+ вопросов, Challenge Bank и разборы ИИ",
    b2: "Профессор Skily без ограничений",
    b3: "Глубокая статистика и прогноз сдачи",
    b4: "Duel Pass Premium: скины, монеты и бонусы",
    cta: "Сохранить Premium",
    later: "Напомнить позже",
  },
  es: {
    title: "Tu período de prueba termina",
    days: (n: number) => n === 0 ? "hoy" : `en ${n} día${n === 1 ? "" : "s"}`,
    lose: "Perderás acceso a:",
    b1: "3000+ preguntas, Challenge Bank y análisis IA",
    b2: "Profesor Skily sin límites",
    b3: "Estadísticas avanzadas y pronóstico de aprobado",
    b4: "Duel Pass Premium: skins, monedas y bonos",
    cta: "Mantener Premium",
    later: "Recordarme después",
  },
  en: {
    title: "Your trial is ending",
    days: (n: number) => n === 0 ? "today" : `in ${n} day${n === 1 ? "" : "s"}`,
    lose: "You'll lose access to:",
    b1: "3000+ questions, Challenge Bank & AI breakdowns",
    b2: "Professor Skily without limits",
    b3: "Deep stats & pass forecast",
    b4: "Duel Pass Premium: skins, coins & bonuses",
    cta: "Keep Premium",
    later: "Remind me later",
  },
};

const BENEFITS = [
  { icon: Zap,      color: "text-amber-400",   bg: "bg-amber-500/10",   key: "b1" as const },
  { icon: Sparkles, color: "text-violet-400",   bg: "bg-violet-500/10",  key: "b2" as const },
  { icon: BarChart3,color: "text-emerald-400",  bg: "bg-emerald-500/10", key: "b3" as const },
  { icon: Trophy,   color: "text-rose-400",     bg: "bg-rose-500/10",    key: "b4" as const },
];

export function TrialExpiryModal({ open, onOpenChange, daysRemaining, onUpgrade }: TrialExpiryModalProps) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const t = T[language as keyof typeof T] ?? T.en;

  const handleLater = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    onOpenChange(false);
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgrade();
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      showHandle={true}
      showTitleBar={false}
      className="p-0 border-0"
      contentClassName="p-0"
    >
      <div className={cn(
        "bg-[#0A0D1B] rounded-t-[24px] flex flex-col",
        !isMobile && "rounded-[24px]"
      )}>
        {/* Header */}
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Flame className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">{t.title}</h2>
          <p className="text-amber-400 font-semibold text-base mt-1">{t.days(daysRemaining)}</p>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/5" />

        {/* Benefits */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.lose}</p>
          <div className="space-y-3">
            {BENEFITS.map(({ icon: Icon, color, bg, key }) => (
              <div key={key} className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <span className="text-sm text-slate-200 leading-snug">{t[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="px-6 pt-5 pb-7 space-y-2.5">
          <Button
            onClick={handleUpgrade}
            className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-amber-500 hover:from-violet-500 hover:to-amber-400 text-white border-0 shadow-lg shadow-violet-900/30"
          >
            {t.cta}
          </Button>
          <button
            onClick={handleLater}
            className="w-full h-10 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t.later}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}

export function shouldShowTrialExpiry(daysRemaining: number): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return true;
  return Date.now() - Number(raw) > DISMISS_TTL_MS;
}
