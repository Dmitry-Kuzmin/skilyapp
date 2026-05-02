import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { XCircle, Clock, CheckCircle2, ChevronDown, Target, BookOpen, Sparkles, Zap, AlertTriangle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { getImageUrl } from "@/utils/imageUtils";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import Confetti from "react-confetti";

import SmartDebriefCard, { FailedQuestion } from "@/components/test-results/SmartDebriefCardV3";
import { AIInsightsLibrary } from "@/components/test-results/AIInsightsLibrary";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import type { QuestUpdateParams } from "@/hooks/useQuestProgress";
import { QuestCompletionOverlay } from "@/components/quests/QuestCompletionOverlay";
import { useLanguage } from "@/contexts/LanguageContext";
import { maybeTriggerLevelUp } from "@/store/levelUpStore";

type TestRewardPayload = {
  coins_awarded?: number;
  sp_awarded?: number;
  sp_base?: number;
  sp_bonus?: number;
  xp_awarded?: number;
  base_coins?: number;
  base_sp?: number;
  level_up?: boolean;
  new_level?: number;
  message?: string;
};

type QuestionData = {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
  image_url: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topics: {
    title_ru: string;
    title_es: string;
  } | null;
  answer_options: {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
  }[];
};

type Answer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

// Компонент для отображения изображения вопроса
const QuestionImageComponent = ({
  imageUrl,
  loadingLabel,
  altLabel,
}: {
  imageUrl: string;
  loadingLabel: string;
  altLabel: string;
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      const url = getImageUrl(imageUrl);
      if (url) {
        setImageSrc(url);
        setIsLoading(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    };
    loadImage();
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden border border-border/50 bg-muted/20 animate-pulse aspect-video max-h-[250px] flex items-center justify-center">
        <span className="text-muted-foreground text-xs opacity-50 uppercase tracking-widest">{loadingLabel}</span>
      </div>
    );
  }

  if (hasError || !imageSrc) return null;

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-border/50 bg-black/5">
      <img src={imageSrc} alt={altLabel} className="w-full h-auto max-h-[300px] object-contain" />
    </div>
  );
};

// Компонент кругового графика
const ResultDonut = ({ score, total, passed }: { score: number, total: number, passed: boolean }) => {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? (score / total) * circumference : 0;

  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-4">
      <div className="absolute inset-0 bg-secondary/20 rounded-full blur-2xl transform scale-90" />
      <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
        {/* Background Circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-slate-200/20 dark:text-slate-800/40"
        />
        {/* Progress Circle */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          cx="80"
          cy="80"
          r={radius}
          stroke={passed ? "#10b981" : "#ef4444"} // green-500 : red-500
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          className="transition-colors duration-500"
        />
      </svg>
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className={cn("text-2xl sm:text-3xl font-black tracking-tighter whitespace-nowrap px-4", passed ? "text-emerald-500" : "text-red-500")}
        >
          {score}/{total}
        </motion.span>
      </div>
    </div>
  );
};

// Удалён AICoachBanner — заменён на SmartDebriefCard

// Main Component
const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const { completedQuests, updateProgress, clearCompleted } = useQuestProgress();
  const { language, t } = useLanguage();

  // State for toggles
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Refs
  const hasShownRewardsRef = useRef(false);
  const duelPassSyncRef = useRef(false);
  const questSyncRef = useRef(false);

  // Parse state
  const state = location.state as {
    questions: QuestionData[];
    answers: Answer[];
    mode: string;
    timeSpent: number;
    testId?: string;
    rewardResult?: TestRewardPayload | null;
    russiaExamStats?: { totalQuestions: number; totalErrors: number; status?: string; timeSpent?: number; }; // Add stats support
    country?: string;
    isRedemptionSuccess?: boolean;
    isRussianFailed?: boolean;
    masteryRound?: number;
  } | null;

  const questions = state?.questions || [];
  const answers = state?.answers || [];
  const mode = state?.mode || 'practice';
  const timeSpent = state?.timeSpent || 0;
  const rewardResult = state?.rewardResult;
  const russiaExamStats = state?.russiaExamStats;
  const country = state?.country;
  const masteryRound = state?.masteryRound;

  const profileId = (supabase.auth.getUser() as any)?.data?.user?.id; // Safe access

  // 🔍 DEBUG: Что приходит из TestSession
  console.log('🔍 [TestResults] answers from state:', {
    answersLength: answers?.length,
    answersData: answers?.slice(0, 3), // Первые 3 для примера
    correctCount: answers?.filter(a => a.isCorrect).length,
    questionsLength: questions?.length
  });

  console.log('[TestResults] Country from state:', country);

  // Автоматическая реклама удалена


  // Sync rewards
  useEffect(() => {
    if (!rewardResult || hasShownRewardsRef.current) return;
    try {
      if (rewardResult.coins_awarded || rewardResult.xp_awarded || rewardResult.sp_awarded || rewardResult.level_up) {
        toast.success(t("testResults.rewardToast.title"), {
          description: t("testResults.rewardToast.description", {
            coins: rewardResult.coins_awarded || 0,
            xp: rewardResult.xp_awarded ?? rewardResult.sp_awarded ?? 0,
          }),
        });
        hasShownRewardsRef.current = true;
      }
    } catch (e) { console.error(e); }
  }, [rewardResult, t]);

  // Sync Duel Pass XP (только если есть награды)
  useEffect(() => {
    const syncDuelPassXP = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !rewardResult || duelPassSyncRef.current) return;
      duelPassSyncRef.current = true;
      try {
        await supabase.functions.invoke("duel-pass-xp", {
          body: { user_id: user.id, source_type: "test" },
        });
      } catch (e) { console.error('[TestResults] duel-pass-xp error:', e); }
    };
    syncDuelPassXP();
  }, [rewardResult]);

  // Sync Daily Quests — ВСЕГДА при показе результатов (не зависит от rewardResult)
  useEffect(() => {
    const syncQuests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || questSyncRef.current || !state) return;
      questSyncRef.current = true;

      try {
        const hasNoErrors = answers.length > 0 && answers.every(a => a.isCorrect);
        const updates: QuestUpdateParams[] = [];

        if (answers.length > 0) {
          updates.push({ userId: user.id, category: 'questions', delta: answers.length });
        }
        if (hasNoErrors) {
          updates.push({ userId: user.id, category: 'accuracy', delta: answers.length });
        }
        if (mode === 'exam' || mode === 'exam-russia') {
          updates.push({ userId: user.id, category: 'exams', delta: 1 });
          if (passed && hasNoErrors) {
            updates.push({ userId: user.id, category: 'perfect_exams', delta: 1 });
          }
        }

        if (updates.length > 0) {
          await updateProgress(updates);
        }
      } catch (e) { console.error('[TestResults] Quest sync error:', e); }
    };
    syncQuests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Invalidate cache
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  }, [queryClient]);

  // 🧠 AI Memory: Загружаем контекст студента для персонализации
  const [studentStats, setStudentStats] = useState<{
    name: string;
    xp: number;
    streak: number;
    prevWeakness?: string | null;
    trend?: 'rising' | 'stable' | 'falling';
  } | undefined>(undefined);

  // Calculate statistics
  const correctCount = answers.filter(a => a.isCorrect).length;
  // FALLBACK: Если answers пустой, но questions есть — считаем все вопросы ошибками
  const incorrectCount = answers.length > 0
    ? answers.filter(a => !a.isCorrect).length
    : questions.length;
  const totalQuestions = questions.length;

  // Passed logic
  let passed = false;
  let maxErrors = 0;

  if (mode === 'exam' || mode === 'exam-russia') {
    maxErrors = mode === 'exam-russia' ? 2 : 3;
    if (mode === 'exam-russia') {
      if (state?.isRussianFailed !== undefined) {
        passed = !state?.isRussianFailed;
      } else if (russiaExamStats && russiaExamStats.status) {
        passed = russiaExamStats.status === 'passed';
      } else {
        const totalErrors = russiaExamStats ? russiaExamStats.totalErrors : incorrectCount;
        passed = totalErrors <= maxErrors;
      }
    } else {
      passed = incorrectCount <= maxErrors;
    }
  } else if (mode === 'marathon' || mode === 'mastery') {
    // В марафоне мы считаем "сданным", если ошибок 0 (так как это работа над ними)
    passed = incorrectCount === 0;
  } else {
    passed = totalQuestions > 0 ? (correctCount / totalQuestions) >= 0.8 : false;
  }

  // Trigger confetti and sounds
  useEffect(() => {
    if (passed && totalQuestions > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      // Play victory sound and haptic if it was a redemption success
      if (state?.isRedemptionSuccess) {
        sounds.victory();
        haptics.victory();
      }
    }
  }, [passed, state?.isRedemptionSuccess, totalQuestions]);

  // Format Helpers
  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getAccuracy = () => {
    return totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  };

  const getLocalizedCopy = (values: { ru?: string | null; es?: string | null; en?: string | null }) => {
    if (language === "es") return values.es || values.en || values.ru || "";
    if (language === "en") return values.en || values.es || values.ru || "";
    return values.ru || values.es || values.en || "";
  };

  const getErrorWord = (count: number) => {
    if (language === "ru") {
      if (count % 10 === 1 && count % 100 !== 11) return t("testResults.errorWords.one");
      if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return t("testResults.errorWords.few");
      }
      return t("testResults.errorWords.many");
    }

    return count === 1 ? t("testResults.errorWords.one") : t("testResults.errorWords.many");
  };

  const getLocalizedQuestionText = (q: QuestionData) =>
    getLocalizedCopy({
      ru: q.question_ru,
      es: q.question_es,
      en: q.question_en,
    });

  const getLocalizedExplanation = (q: QuestionData) =>
    getLocalizedCopy({
      ru: q.explanation_ru,
      es: q.explanation_es,
      en: q.explanation_en,
    });

  const getLocalizedTopicTitle = (topic?: QuestionData["topics"] | null) =>
    getLocalizedCopy({
      ru: topic?.title_ru,
      es: topic?.title_es,
      en: topic?.title_es,
    });

  const getLocalizedOptionText = (opt: QuestionData["answer_options"][number]) =>
    getLocalizedCopy({
      ru: opt.text_ru,
      es: opt.text_es,
      en: opt.text_en,
    });

  // Identify weak topic (most incorrects)
  const weakTopic = useMemo(() => {
    if (incorrectCount === 0) return undefined;
    const topicsCount: Record<string, number> = {};
    const isSpain = country === 'spain';

    answers.filter(a => !a.isCorrect).forEach(ans => {
      const q = questions.find(q => q.id === ans.questionId);
      const topicTitle = isSpain ? q?.topics?.title_es : q?.topics?.title_ru;
      if (topicTitle) {
        topicsCount[topicTitle] = (topicsCount[topicTitle] || 0) + 1;
      }
    });

    const sorted = Object.entries(topicsCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  }, [incorrectCount, answers, questions, country]);

  // 🧠 AI Memory: Загружаем контекст студента ПОСЛЕ объявления weakTopic
  useEffect(() => {
    const loadStudentContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        // Получаем профиль пользователя
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, username, xp, streak_days')
          .eq('id', user.id)
          .single();

        if (profile) {
          const p = profile as any;
          console.log('[TestResults] 🔍 Profile data from DB:', {
            first_name: p.first_name,
            username: p.username,
            user_metadata_first_name: user.user_metadata?.first_name
          });

          setStudentStats({
            name: p.first_name || p.username || user.user_metadata?.first_name || 'Студент',
            xp: p.xp || 0,
            streak: p.streak_days || 1,
            prevWeakness: weakTopic || null,
            trend: 'stable'
          });
        } else {
          setStudentStats({
            name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Driver',
            xp: 0,
            streak: 1,
            prevWeakness: null,
            trend: 'stable'
          });
        }
      } catch (e) {
        console.error('[TestResults] Failed to load student context:', e);
        setStudentStats({
          name: 'Driver',
          xp: 0,
          streak: 1,
          prevWeakness: null,
          trend: 'stable'
        });
      }
    };
    loadStudentContext();
  }, [weakTopic]);

  // Handlers
  const toggleTranslation = (id: string) => setShowTranslation(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExplanation = (id: string) => setExpandedExplanations(prev => ({ ...prev, [id]: !prev[id] }));

  // Early return if no state
  if (!state) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">{t("testResults.noData")}</p>
          <Button onClick={() => navigate("/tests")}>{t("testResults.backToTests")}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.3} />}
      <QuestCompletionOverlay quests={completedQuests} onDismiss={clearCompleted} />

      <div className="container mx-auto px-4 py-6 max-w-3xl pb-24 sm:pb-8" translate="no">
        {state.isRedemptionSuccess && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="mb-8 p-8 rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-2xl shadow-amber-500/30 border border-white/20 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]" />
            <Sparkles className="mx-auto w-16 h-16 mb-4 text-amber-200" />
            <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">{t("testResults.redemption.title")}</h1>
            <p className="text-amber-50 font-medium">{t("testResults.redemption.description")}</p>
          </motion.div>
        )}

        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">

          <ResultDonut score={correctCount} total={totalQuestions} passed={passed} />

          <h1 className={cn("text-2xl sm:text-3xl font-bold mb-2", passed ? "text-emerald-500" : "text-red-500")}>
            {mode === 'marathon' ? (
              passed
                ? t("testResults.marathonGoalAchieved")
                : t("testResults.marathonRoundCompleted", { round: masteryRound || 1 })
            ) : (
              passed ? t("testResults.examPassed") : t("testResults.examFailed")
            )}
          </h1>

          {!passed && (mode === 'exam' || mode === 'exam-russia') && (
            <p className="text-red-400 font-medium bg-red-500/10 inline-block px-4 py-1.5 rounded-full text-sm border border-red-500/20">
              {t("testResults.failNotice", {
                count: incorrectCount,
                errorWord: getErrorWord(incorrectCount),
                exam: mode === 'exam-russia' || country === 'russia'
                  ? t("testResults.examLabels.russia")
                  : t("testResults.examLabels.dgt"),
              })}
            </p>
          )}

          {passed && (
            <p className="text-muted-foreground">
              {mode === 'marathon'
                ? t("testResults.passMessages.marathon")
                : t("testResults.passMessages.exam")}
            </p>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 sm:gap-4 mb-8"
        >
          {/* Time Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1">
            <Clock className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">{formatTime(timeSpent)}</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("testResults.stats.time")}</span>
          </div>

          {/* Accuracy Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1">
            <Target className={cn("w-5 h-5 mb-1", passed ? "text-emerald-400" : "text-orange-400")} />
            <span className={cn("text-xl sm:text-2xl font-bold", passed ? "text-emerald-400" : "text-orange-400")}>
              {getAccuracy()}%
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("testResults.stats.accuracy")}</span>
          </div>

          {/* Season Points Card — главная награда за тест */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-500/30 backdrop-blur-md flex flex-col items-center justify-center gap-1 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
            <Trophy className="w-6 h-6 text-indigo-400 mb-1 relative z-10 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
            <span className="text-xl sm:text-2xl font-black text-indigo-300 relative z-10 drop-shadow-sm tabular-nums">
              +{rewardResult?.sp_awarded ?? 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.15em] text-indigo-400/80 relative z-10">SP</span>
            {/* Маркер бонуса если был */}
            {(rewardResult?.sp_bonus ?? 0) > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-amber-950 text-[9px] font-black tracking-tight z-20"
              >
                +{rewardResult?.sp_bonus} bonus
              </motion.div>
            )}
          </motion.div>

          {/* XP Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-yellow-500/10 blur-xl" />
            <Zap className="w-5 h-5 text-yellow-400 mb-1 relative z-10" />
            <span className="text-xl sm:text-2xl font-bold text-yellow-400 relative z-10 tabular-nums">
              +{rewardResult?.xp_awarded ?? 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium relative z-10">XP</span>
          </div>
        </motion.div>

        {/* ── Плашка-подсказка о бонусах ─────────────────────────────────── */}
        {rewardResult && getAccuracy() < 90 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center gap-3"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">
                Достигни <span className="text-amber-400">90%</span> — получи <span className="text-amber-400">+30 SP бонус</span>
              </p>
              <p className="text-xs text-amber-300/60 mt-0.5">
                А за идеальный результат (100%) — <span className="text-amber-400 font-bold">+50 SP</span>!
              </p>
            </div>
          </motion.div>
        )}
        {rewardResult && getAccuracy() === 100 && (rewardResult.sp_bonus ?? 0) >= 50 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-400/10 blur-2xl" />
            <Sparkles className="w-6 h-6 text-emerald-400 relative z-10" />
            <div className="flex-1 relative z-10">
              <p className="text-sm font-bold text-emerald-200">Идеальный результат! 🔥</p>
              <p className="text-xs text-emerald-300/70 mt-0.5">+50 SP бонус за безошибочное прохождение</p>
            </div>
          </motion.div>
        )}
        {rewardResult && getAccuracy() >= 90 && getAccuracy() < 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="mb-6 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/30 flex items-center gap-3"
          >
            <Trophy className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-200">Отличный результат! +30 SP бонус ⚡</p>
              <p className="text-xs text-indigo-300/60 mt-0.5">100% даст ещё больше — <span className="text-emerald-400 font-bold">+50 SP</span></p>
            </div>
          </motion.div>
        )}

        {/* AI Insights Library (PRO only) */}
        {isPremium && (
          <div className="mb-8 flex justify-center w-full">
            <AIInsightsLibrary isPremium={isPremium} />
          </div>
        )}

        {/* Smart Debrief — AI анализ ошибок */}
        {incorrectCount > 0 && answers.length > 0 && (
          <SmartDebriefCard
            country={country}
            failedQuestions={
              // FALLBACK: Если answers пустой — используем все questions как ошибки
              answers.length > 0
                ? answers
                  .filter(a => !a.isCorrect)
                  .map(ans => {
                    const q: any = questions.find(q => q.id === ans.questionId);
                    if (!q) return null;

                    const isUniversal = 'text' in q && 'answers' in q;

                    let qText = '';
                    let qCorrect = '';
                    let qUser = '';
                    let qExp = '';
                    let qTopic = '';
                    let qImg: string | null = null;

                    if (isUniversal) {
                      // Russian PDD format (UniversalQuestion)
                      qText = q.text || '';
                      const correctOpt = q.answers?.find((a: any) => a.isCorrect);
                      const userOpt = q.answers?.find((a: any) => a.id === ans.selectedAnswerId);

                      qCorrect = correctOpt?.text || '';
                      qUser = userOpt?.text || 'NO_ANSWER_GIVEN';
                      qExp = q.explanation || '';
                      qTopic = q.topics?.[0] || t("testResults.defaultTopic");
                      qImg = q.image || null;
                    } else {
                      // DGT format (QuestionData)
                      const selectedOption = q.answer_options?.find((opt: any) => opt.id === ans.selectedAnswerId);
                      const correctOption = q.answer_options?.find((opt: any) => opt.is_correct);

                      const userAnswerText = selectedOption
                        ? getLocalizedOptionText(selectedOption)
                        : null;

                      qText = getLocalizedQuestionText(q);
                      qUser = userAnswerText || 'NO_ANSWER_GIVEN';
                      qCorrect = correctOption ? getLocalizedOptionText(correctOption) : '';
                      qTopic = getLocalizedTopicTitle(q.topics);
                      qExp = getLocalizedExplanation(q);
                      qImg = q.image_url || null;
                    }

                    return {
                      questionId: ans.questionId,
                      questionText: qText,
                      userAnswer: qUser,
                      correctAnswer: qCorrect,
                      topic: qTopic || t("testResults.defaultTopic"),
                      explanation: qExp,
                      imageUrl: qImg,
                    };
                  }).filter(Boolean) as any[]
                : questions.map((q: any) => {
                  const isUniversal = 'text' in q && 'answers' in q;

                  if (isUniversal) {
                    const correctOpt = q.answers?.find((a: any) => a.isCorrect);
                    return {
                      questionId: q.id,
                      questionText: q.text || '',
                      userAnswer: 'NO_ANSWER_GIVEN',
                      correctAnswer: correctOpt?.text || '',
                      topic: q.topics?.[0] || t("testResults.defaultTopic"),
                      explanation: q.explanation || '',
                      imageUrl: q.image || null,
                    };
                  } else {
                    const correctOption = q.answer_options?.find((opt: any) => opt.is_correct);
                    return {
                      questionId: q.id,
                      questionText: getLocalizedQuestionText(q),
                      userAnswer: 'NO_ANSWER_GIVEN',
                      correctAnswer: correctOption ? getLocalizedOptionText(correctOption) : '',
                      topic: getLocalizedTopicTitle(q.topics) || t("testResults.defaultTopic"),
                      explanation: getLocalizedExplanation(q),
                      imageUrl: q.image_url || null,
                    };
                  }
                })
            }
            weakTopic={weakTopic}
            studentStats={studentStats}
          />
        )}

        {/* Errors List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              {t("testResults.detailedReport")}
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
              {t("testResults.questionsCount", { count: questions.length })}
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const answer = answers.find(a => a.questionId === q.id);
              const isCorrect = answer?.isCorrect;
              const isExpanded = expandedExplanations[q.id];

              return (
                <div key={q.id} className="group">
                  {/* Glass Strip */}
                  <div
                    onClick={() => toggleExplanation(q.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4",
                      "bg-card hover:bg-card/80 shadow-sm hover:shadow-md",
                      isCorrect
                        ? "border-emerald-100 dark:border-emerald-500/20"
                        : "border-red-100 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5"
                    )}
                  >
                    {/* Number */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-inner",
                      isCorrect ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500"
                    )}>
                      {idx + 1}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold pr-2 leading-relaxed text-slate-700 dark:text-slate-200")}>
                        {getLocalizedQuestionText(q)}
                      </p>
                      {answer && !isCorrect && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-wider text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t("testResults.errorBadge")}</span>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400">
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-500", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  {/* Detailed Dropdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 mx-0 sm:mx-2 border border-t-0 border-border/50 rounded-b-2xl bg-slate-50/50 dark:bg-black/20 space-y-6 shadow-inner">
                          {/* Image */}
                          {q.image_url && (
                            <div className="w-full flex justify-center">
                              <QuestionImageComponent
                                imageUrl={q.image_url}
                                loadingLabel={t("testResults.loadingImage")}
                                altLabel={t("testResults.questionImageAlt")}
                              />
                            </div>
                          )}

                          {/* Question Text */}
                          <div className="space-y-4">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{t("testResults.questionDetails")}</h4>
                            <div className="grid gap-2.5">
                              {q.answer_options.map(opt => {
                                const isSelected = answer?.selectedAnswerId === opt.id;
                                const isOptCorrect = opt.is_correct;

                                return (
                                  <div key={opt.id} className={cn(
                                    "p-4 rounded-xl text-sm border flex items-center justify-between transition-colors",
                                    isOptCorrect
                                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-medium"
                                      : isSelected
                                        ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100"
                                        : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500"
                                  )}>
                                    <span className="flex-1 pr-4">{getLocalizedOptionText(opt)}</span>
                                    {isOptCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                                    {isSelected && !isOptCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Premium AI Explanation */}
                          {getLocalizedExplanation(q) && (
                            <div className="relative group/ai">
                              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-md opacity-0 group-hover/ai:opacity-100 transition duration-500" />
                              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
                                    {t("testResults.aiExplanation")}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                  {getLocalizedExplanation(q)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Button
            className="w-full h-12 text-base font-semibold"
            variant="outline"
            onClick={() => {
              setTimeout(() => navigate("/tests"), 100);

            }}
          >
            {t("testResults.backToTests")}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default TestResults;
