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
  X,
  Rocket,
  Flame,
  Calendar,
  Star,
  CheckCircle2,
  Award,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

const getOnboardingScreens = (activeSeason?: { days_remaining?: number; name_ru?: string; season_number?: number } | null) => [
  {
    id: 1,
    icon: Rocket,
    title: "Добро пожаловать в сезон!",
    subtitle: activeSeason?.days_remaining
      ? `${activeSeason.days_remaining} дней до финала сезона`
      : "30 дней до финала сезона",
    description: "Твой месячный челлендж к экзамену DGT\n\n30 уровней наград за регулярные занятия.\nЭто не просто игра — это твой путь к сдаче экзамена.",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    showCards: "welcome",
  },
  {
    id: 2,
    icon: TrendingUp,
    title: "Прокачивай навыки — получай Season Points",
    subtitle: "За каждое действие ты получаешь SP",
    description: "🎯 100 SP = 1 уровень = новая награда\n\nЧем больше ты занимаешься, тем выше твой уровень и больше наград!",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    showCards: "sp",
  },
  {
    id: 3,
    icon: Gift,
    title: "Выигрывай, обучаясь",
    subtitle: "Что ты получишь в этом сезоне",
    description: "💎 Premium: эксклюзивные награды на каждом уровне\n\nPremium пользователи получают удвоенные награды!",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    showCards: "rewards",
  },
  {
    id: 4,
    icon: Flame,
    title: "Миссии ускоряют прогресс",
    subtitle: "Система подбирает миссии под твои пробелы",
    description: "Выполняй миссии → получай бонусные SP → быстрее растёшь\n\nКаждый сезон — новые миссии и награды.",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    showCards: "missions",
  },
  {
    id: 5,
    icon: Trophy,
    title: "Готов начать челлендж?",
    subtitle: "Твой сезон уже начался!",
    description: "🚀 Включи Duel Pass и пройди его до конца.\n\nТы увидишь, как быстро растут твои результаты.\nКаждый уровень приближает тебя к успеху!",
    gradient: "from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    showCards: "final",
  },
];

export function DuelPassOnboarding({ 
  open, 
  onOpenChange, 
  onComplete,
  activeSeason 
}: DuelPassOnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const isMobile = useIsMobile();
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
        className={cn(
          "p-0 overflow-hidden border-0 bg-transparent shadow-none",
          isMobile 
            ? "max-w-full w-full max-h-[90vh] h-auto" 
            : "max-w-2xl max-h-[85vh] h-auto"
        )}
        hideCloseButton
        modalType="duelPass"
      >
        <div className={cn(
          "relative overflow-hidden text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.35)]",
          isMobile 
            ? "rounded-t-3xl border-t border-x px-4 py-5" 
            : "rounded-3xl border px-6 py-6"
        )}>
          {/* Декоративные элементы */}
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativeSecondary)} />
          
          {/* Кнопка закрытия */}
          <button
            onClick={handleComplete}
            className={cn(
              "absolute z-20 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center",
              isMobile ? "top-3 right-3" : "top-4 right-4"
            )}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className={cn(
            "relative z-10 flex flex-col",
            isMobile ? "space-y-4 min-h-0" : "space-y-6"
          )}>
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={cn("space-y-4", isMobile ? "pb-2" : "space-y-6 pb-2")}
                >
                  <div className={cn("flex items-center gap-3", isMobile && "gap-3")}>
                    <div className={cn(
                      "rounded-2xl bg-white/10 flex items-center justify-center shrink-0",
                      isMobile ? "w-12 h-12 rounded-xl" : "w-16 h-16"
                    )}>
                      <Icon className={cn("text-cyan-400", isMobile ? "w-6 h-6" : "w-8 h-8")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className={cn(
                        "font-black tracking-tight mb-1",
                        isMobile ? "text-xl" : "text-2xl md:text-3xl"
                      )}>
                        {current.title}
                      </h2>
                      {current.subtitle && (
                        <p className={cn(
                          "text-white/80",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          {current.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={cn("space-y-2", isMobile ? "space-y-2" : "space-y-3")}>
                    {current.description.split('\n').map((line, index) => {
                      // Проверяем, содержит ли строка эмодзи и текст
                      const emojiMatch = line.match(/^([^\s]+)\s(.+)$/);
                      if (emojiMatch) {
                        const [, emoji, text] = emojiMatch;
                        return (
                          <div key={index} className="flex items-start gap-2">
                            <span className={cn("shrink-0", isMobile ? "text-lg" : "text-xl")}>{emoji}</span>
                            <p className={cn(
                              "text-white/90 leading-relaxed",
                              isMobile ? "text-sm" : "text-base"
                            )}>{text}</p>
                          </div>
                        );
                      }
                      return (
                        <p key={index} className={cn(
                          "text-white/90 leading-relaxed",
                          isMobile ? "text-sm" : "text-base"
                        )}>
                          {line}
                        </p>
                      );
                    })}
                  </div>

                    {/* Дополнительные визуальные элементы для разных экранов */}
                  {current.showCards === "welcome" && (
                    <div className={cn("space-y-3 pt-2", isMobile && "pt-1")}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-2xl">📚</div>
                          <span className={cn("text-white/90 font-medium text-center", isMobile ? "text-xs" : "text-sm")}>30 уровней</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-2xl">🎯</div>
                          <span className={cn("text-white/90 font-medium text-center", isMobile ? "text-xs" : "text-sm")}>Месячный план</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className={cn("text-cyan-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          <span className={cn("font-bold text-cyan-300", isMobile ? "text-xs" : "text-sm")}>Цель сезона</span>
                        </div>
                        <p className={cn("text-white/80", isMobile ? "text-xs" : "text-sm")}>
                          Пройди все 30 уровней и получи максимум наград!
                        </p>
                      </div>
                    </div>
                  )}

                  {current.showCards === "sp" && (
                    <div className={cn(
                      "grid gap-2 pt-2",
                      isMobile ? "grid-cols-2 gap-2" : "grid-cols-2 md:grid-cols-4 gap-3"
                    )}>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <BookOpen className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-7 h-7")} />
                        <span className={cn("text-white/80 font-medium", isMobile ? "text-xs" : "text-xs")}>Тест</span>
                        <span className={cn("font-bold text-cyan-400", isMobile ? "text-sm" : "text-base")}>10-30 SP</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Zap className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-7 h-7")} />
                        <span className={cn("text-white/80 font-medium", isMobile ? "text-xs" : "text-xs")}>Дуэль</span>
                        <span className={cn("font-bold text-cyan-400", isMobile ? "text-sm" : "text-base")}>15-60 SP</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Sparkles className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-7 h-7")} />
                        <span className={cn("text-white/80 font-medium", isMobile ? "text-xs" : "text-xs")}>Челлендж</span>
                        <span className={cn("font-bold text-cyan-400", isMobile ? "text-sm" : "text-base")}>100-1500 SP</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Calendar className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-7 h-7")} />
                        <span className={cn("text-white/80 font-medium text-center", isMobile ? "text-xs" : "text-xs")}>Ежедневный</span>
                        <span className={cn("font-bold text-cyan-400", isMobile ? "text-sm" : "text-base")}>15 SP</span>
                      </div>
                    </div>
                  )}

                  {current.showCards === "rewards" && (
                    <div className={cn("space-y-2 pt-2", isMobile ? "space-y-2" : "space-y-3")}>
                      <div className={cn("grid grid-cols-2 gap-2", isMobile ? "gap-2" : "gap-3")}>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <span className={cn(isMobile ? "text-2xl" : "text-3xl")}>💰</span>
                          <span className={cn("text-white/80 text-center font-medium", isMobile ? "text-xs" : "text-xs")}>Монеты</span>
                          <span className={cn("text-white/60 text-center", isMobile ? "text-[10px]" : "text-xs")}>для бустов</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <span className={cn(isMobile ? "text-2xl" : "text-3xl")}>🎨</span>
                          <span className={cn("text-white/80 text-center font-medium", isMobile ? "text-xs" : "text-xs")}>Скины</span>
                          <span className={cn("text-white/60 text-center", isMobile ? "text-[10px]" : "text-xs")}>профиля</span>
                        </div>
                      </div>
                      <div className={cn("grid grid-cols-2 gap-2", isMobile ? "gap-2" : "gap-3")}>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <span className={cn(isMobile ? "text-2xl" : "text-3xl")}>🏅</span>
                          <span className={cn("text-white/80 text-center font-medium", isMobile ? "text-xs" : "text-xs")}>Бейджи</span>
                          <span className={cn("text-white/60 text-center", isMobile ? "text-[10px]" : "text-xs")}>достижения</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <span className={cn(isMobile ? "text-2xl" : "text-3xl")}>⚡</span>
                          <span className={cn("text-white/80 text-center font-medium", isMobile ? "text-xs" : "text-xs")}>Бусты</span>
                          <span className={cn("text-white/60 text-center", isMobile ? "text-[10px]" : "text-xs")}>помощь в играх</span>
                        </div>
                      </div>
                      <div className={cn(
                        "rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30",
                        isMobile ? "mt-2 p-3" : "mt-4 p-4"
                      )}>
                        <div className={cn("flex items-center gap-2 mb-1", isMobile && "mb-1.5")}>
                          <Crown className={cn("text-yellow-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          <span className={cn("font-bold text-yellow-300", isMobile ? "text-xs" : "text-sm")}>Premium награды</span>
                        </div>
                        <p className={cn("text-white/80", isMobile ? "text-xs" : "text-xs")}>
                          Эксклюзивные награды на каждом уровне. Удвоенный прогресс!
                        </p>
                      </div>
                    </div>
                  )}

                  {current.showCards === "missions" && (
                    <div className={cn("space-y-2 pt-2", isMobile ? "space-y-2" : "space-y-3")}>
                      <div className="flex flex-col gap-2">
                        <div className={cn(
                          "flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors",
                          isMobile ? "p-3 gap-2" : "p-4 gap-3"
                        )}>
                          <div className={cn(
                            "rounded-lg bg-green-500/20 flex items-center justify-center shrink-0",
                            isMobile ? "w-8 h-8" : "w-10 h-10"
                          )}>
                            <CheckCircle2 className={cn("text-green-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("flex items-center gap-1.5 mb-0.5", isMobile && "mb-1")}>
                              <Flame className={cn("text-orange-400", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                              <span className={cn("font-bold text-white", isMobile ? "text-xs" : "text-sm")}>Ежедневные</span>
                            </div>
                            <p className={cn("text-white/70", isMobile ? "text-[10px]" : "text-xs")}>
                              Простые задания каждый день. +50 SP за выполнение
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors",
                          isMobile ? "p-3 gap-2" : "p-4 gap-3"
                        )}>
                          <div className={cn(
                            "rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0",
                            isMobile ? "w-8 h-8" : "w-10 h-10"
                          )}>
                            <Calendar className={cn("text-blue-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("flex items-center gap-1.5 mb-0.5", isMobile && "mb-1")}>
                              <Star className={cn("text-blue-400", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                              <span className={cn("font-bold text-white", isMobile ? "text-xs" : "text-sm")}>Недельные</span>
                            </div>
                            <p className={cn("text-white/70", isMobile ? "text-[10px]" : "text-xs")}>
                              Более сложные цели на неделю. +200 SP за выполнение
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors",
                          isMobile ? "p-3 gap-2" : "p-4 gap-3"
                        )}>
                          <div className={cn(
                            "rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0",
                            isMobile ? "w-8 h-8" : "w-10 h-10"
                          )}>
                            <Target className={cn("text-purple-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("flex items-center gap-1.5 mb-0.5", isMobile && "mb-1")}>
                              <Trophy className={cn("text-purple-400", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                              <span className={cn("font-bold text-white", isMobile ? "text-xs" : "text-sm")}>Сезонные</span>
                            </div>
                            <p className={cn("text-white/70", isMobile ? "text-[10px]" : "text-xs")}>
                              Большие достижения за месяц. +500 SP за выполнение
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {current.showCards === "final" && (
                    <div className={cn("space-y-3 pt-2", isMobile && "pt-1 space-y-2")}>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10">
                          <BarChart3 className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-6 h-6")} />
                          <span className={cn("text-white/90 font-medium text-center", isMobile ? "text-[10px]" : "text-xs")}>Прогресс</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10">
                          <Award className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-6 h-6")} />
                          <span className={cn("text-white/90 font-medium text-center", isMobile ? "text-[10px]" : "text-xs")}>Награды</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10">
                          <TrendingUp className={cn("text-cyan-400", isMobile ? "w-5 h-5" : "w-6 h-6")} />
                          <span className={cn("text-white/90 font-medium text-center", isMobile ? "text-[10px]" : "text-xs")}>Рост</span>
                        </div>
                      </div>
                      <div className={cn(
                        "rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30",
                        isMobile ? "p-3" : "p-4"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Rocket className={cn("text-cyan-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                          <span className={cn("font-bold text-cyan-300", isMobile ? "text-xs" : "text-sm")}>Начни прямо сейчас!</span>
                        </div>
                        <p className={cn("text-white/80", isMobile ? "text-xs" : "text-sm")}>
                          Каждый день занятий приближает тебя к успеху на экзамене DGT
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Навигационные кнопки */}
            <div className={cn(
              "flex items-center justify-between gap-3 border-t border-white/10 shrink-0",
              isMobile ? "pt-3 mt-2" : "pt-4"
            )}>
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={isFirstScreen}
                className={cn(
                  "text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed",
                  isMobile ? "h-9 px-3 text-sm" : "h-10 px-4"
                )}
              >
                Назад
              </Button>

              <Button
                onClick={handleNext}
                className={cn(
                  "bg-cyan-500 hover:bg-cyan-600 text-white font-semibold gap-2",
                  isMobile ? "h-9 px-4 text-sm" : "h-10 px-6"
                )}
              >
                {isLastScreen ? (
                  <>
                    {isMobile ? "Начать" : "Начать челлендж"}
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

