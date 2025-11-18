import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Gift, 
  Crown,
  BookOpen,
  Zap,
  Sparkles,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DuelPassOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  activeSeason?: {
    name_ru: string;
    days_remaining: number;
    season_number: number;
  } | null;
}

const seasonTheme = {
  gradient: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800",
  border: "border-cyan-500/30",
  chip: "bg-white/10 text-white/80",
  accent: "text-cyan-200",
  glow: "shadow-[0_0_40px_rgba(34,211,238,0.35)]",
  decorativePrimary: "bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.35),transparent_60%)]",
  decorativeSecondary: "bg-[radial-gradient(circle_at_80%_100%,rgba(251,191,36,0.25),transparent_55%)]",
};

const onboardingScreens = [
  {
    id: 1,
    icon: Target,
    title: "Месячный челлендж к экзамену",
    subtitle: activeSeason 
      ? `${activeSeason.days_remaining} дней до финала сезона`
      : "30 дней до финала сезона",
    description: "30 уровней наград за регулярные занятия.\nЭто не просто игра — это твой путь к цели.",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
  },
  {
    id: 2,
    icon: TrendingUp,
    title: "Получай Season Points за любой прогресс",
    subtitle: "Занимайся и зарабатывай SP",
    description: "📝 Тест → 10-30 SP\n⚔️ Дуэль → 15-60 SP\n🔥 Челлендж → 100-1500 SP\n\n100 SP = 1 уровень = новая награда",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
  },
  {
    id: 3,
    icon: Gift,
    title: "Открывай уровни — получай награды",
    subtitle: "Что ты получишь",
    description: "💰 Монеты (для бустов)\n🎨 Скины и бейджи\n⚡ Бусты (50/50, +30 сек, перевод)\n\n💎 Premium награды ещё круче!",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
  },
  {
    id: 4,
    icon: Trophy,
    title: "Готов к челленджу?",
    subtitle: "Твой сезон уже начался!",
    description: "Включи Duel Pass и пройди его до конца.\nТы увидишь, как быстро растут твои результаты.",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
  },
];

export function DuelPassOnboarding({ 
  open, 
  onOpenChange, 
  onComplete,
  activeSeason 
}: DuelPassOnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const onboardingScreens = getOnboardingScreens(activeSeason);

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('duel-pass-onboarding-seen', 'true');
    setCurrentScreen(0);
    onComplete();
    onOpenChange(false);
  };

  const current = onboardingScreens[currentScreen];
  const Icon = current.icon;
  const isLastScreen = currentScreen === onboardingScreens.length - 1;
  const isFirstScreen = currentScreen === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none"
        hideCloseButton
      >
        <div className="relative overflow-hidden rounded-3xl border px-5 py-6 text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
          {/* Декоративные элементы */}
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativeSecondary)} />
          
          {/* Кнопка закрытия */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="relative z-10 space-y-6">
            {/* Индикатор прогресса */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {activeSeason && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.3em] bg-white/10 text-white/80">
                    СЕЗОН №{activeSeason.season_number}
                  </span>
                )}
                <span className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                  {activeSeason?.name_ru || "Duel Pass"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">
                  {currentScreen + 1} / {onboardingScreens.length}
                </span>
                <div className="flex gap-1">
                  {onboardingScreens.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentScreen 
                          ? "bg-cyan-400 w-6" 
                          : "bg-white/20"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Контент экрана */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScreen}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                      {current.title}
                    </h2>
                    {current.subtitle && (
                      <p className="text-sm text-white/80">
                        {current.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {current.description.split('\n').map((line, index) => {
                    // Проверяем, содержит ли строка эмодзи и текст
                    const emojiMatch = line.match(/^([^\s]+)\s(.+)$/);
                    if (emojiMatch) {
                      const [, emoji, text] = emojiMatch;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <span className="text-xl shrink-0">{emoji}</span>
                          <p className="text-base text-white/90 leading-relaxed">{text}</p>
                        </div>
                      );
                    }
                    return (
                      <p key={index} className="text-base text-white/90 leading-relaxed">
                        {line}
                      </p>
                    );
                  })}
                </div>

                {/* Дополнительные визуальные элементы для разных экранов */}
                {currentScreen === 1 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <BookOpen className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs text-white/70">Тест</span>
                      <span className="text-sm font-bold text-cyan-400">10-30 SP</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Zap className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs text-white/70">Дуэль</span>
                      <span className="text-sm font-bold text-cyan-400">15-60 SP</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Sparkles className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs text-white/70">Челлендж</span>
                      <span className="text-sm font-bold text-cyan-400">100-1500 SP</span>
                    </div>
                  </div>
                )}

                {currentScreen === 2 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-2xl">💰</span>
                      <span className="text-xs text-white/70 text-center">Монеты</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-2xl">🎨</span>
                      <span className="text-xs text-white/70 text-center">Скины</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-2xl">⚡</span>
                      <span className="text-xs text-white/70 text-center">Бусты</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Навигационные кнопки */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={isFirstScreen}
                className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Назад
              </Button>

              <Button
                onClick={handleNext}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 gap-2"
              >
                {isLastScreen ? (
                  <>
                    Начать челлендж
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Далее
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

