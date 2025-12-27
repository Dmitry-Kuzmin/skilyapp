import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { XCircle, Clock, CheckCircle2, ChevronDown, Target, BookOpen, Sparkles, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { getImageUrl } from "@/utils/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useVignetteBanner } from "@/hooks/useVignetteBanner";
import { useInterstitialBanner } from "@/hooks/useInterstitialBanner";
import SmartDebriefCard, { FailedQuestion } from "@/components/test-results/SmartDebriefCard";

type TestRewardPayload = {
  coins_awarded?: number;
  sp_awarded?: number;
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
const QuestionImageComponent = ({ imageUrl }: { imageUrl: string }) => {
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
        <span className="text-muted-foreground text-xs opacity-50 uppercase tracking-widest">Cargando...</span>
      </div>
    );
  }

  if (hasError || !imageSrc) return null;

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-border/50 bg-black/5">
      <img src={imageSrc} alt="Question" className="w-full h-auto max-h-[300px] object-contain" />
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

  // State for toggles
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Refs
  const hasShownRewardsRef = useRef(false);
  const duelPassSyncRef = useRef(false);

  // Parse state
  const state = location.state as {
    questions: QuestionData[];
    answers: Answer[];
    mode: string;
    timeSpent: number;
    testId?: string;
    rewardResult?: TestRewardPayload | null;
    russiaExamStats?: { totalQuestions: number; totalErrors: number; status?: string; timeSpent?: number; }; // Add stats support
  } | null;

  // Early return if no state
  if (!state) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Нет данных о результатах</p>
          <Button onClick={() => navigate("/tests")}>Вернуться к тестам</Button>
        </div>
      </Layout>
    );
  }

  const { questions, answers, mode, timeSpent, testId, rewardResult, russiaExamStats } = state;
  const profileId = (supabase.auth.getUser() as any)?.data?.user?.id; // Safe access

  // Banner hooks
  const [shouldShowInterstitial, setShouldShowInterstitial] = useState(false);
  useVignetteBanner(!!questions && !!answers, 1500);
  useInterstitialBanner(shouldShowInterstitial, 300);

  // Sync rewards
  useEffect(() => {
    if (!rewardResult || hasShownRewardsRef.current) return;
    try {
      if (rewardResult.coins_awarded || rewardResult.sp_awarded || rewardResult.level_up) {
        toast.success("Награды получены!", {
          description: `+${rewardResult.coins_awarded || 0} монет, +${rewardResult.sp_awarded || 0} XP`,
        });
        hasShownRewardsRef.current = true;
      }
    } catch (e) { console.error(e); }
  }, [rewardResult]);

  // Sync Duel Pass
  useEffect(() => {
    const syncDuelPass = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !rewardResult || duelPassSyncRef.current) return;
      duelPassSyncRef.current = true;
      try {
        await supabase.functions.invoke("duel-pass-xp", {
          body: { user_id: user.id, source_type: "test" },
        });
      } catch (e) { console.error(e); }
    };
    syncDuelPass();
  }, [rewardResult]);

  // Invalidate cache
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  }, [queryClient]);

  // Calculate statistics
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.filter(a => !a.isCorrect).length;
  const totalQuestions = questions.length;

  // Passed logic
  let passed = false;
  let maxErrors = 0;

  if (mode === 'exam' || mode === 'exam-russia') {
    maxErrors = mode === 'exam-russia' ? 2 : 3;
    if (mode === 'exam-russia' && russiaExamStats && russiaExamStats.status) {
      passed = russiaExamStats.status === 'passed';
    } else {
      const totalErrors = russiaExamStats ? russiaExamStats.totalErrors : incorrectCount;
      passed = totalErrors <= maxErrors;
    }
  } else {
    passed = (correctCount / totalQuestions) >= 0.8;
  }

  // Trigger confetti
  useEffect(() => {
    if (passed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [passed]);

  // Format Helpers
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getAccuracy = () => {
    return totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  };

  // Identify weak topic (most incorrects)
  const getWeakTopic = () => {
    const wrongAnswers = answers.filter(a => !a.isCorrect);
    if (wrongAnswers.length === 0) return undefined;

    // Simple frequency map
    const topicCounts: Record<string, number> = {};
    let maxCount = 0;
    let weakTopic = "";

    wrongAnswers.forEach(ans => {
      const q = questions.find(q => q.id === ans.questionId);
      if (q?.topics?.title_ru) {
        const topic = q.topics.title_ru;
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        if (topicCounts[topic] > maxCount) {
          maxCount = topicCounts[topic];
          weakTopic = topic;
        }
      }
    });

    return weakTopic || undefined;
  };

  const weakTopic = getWeakTopic();

  // Handlers
  const toggleTranslation = (id: string) => setShowTranslation(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExplanation = (id: string) => setExpandedExplanations(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <Layout>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.3} />}

      <div className="container mx-auto px-4 py-6 max-w-3xl pb-24 sm:pb-8">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">

          <ResultDonut score={correctCount} total={totalQuestions} passed={passed} />

          <h1 className={cn("text-2xl sm:text-3xl font-bold mb-2", passed ? "text-emerald-500" : "text-red-500")}>
            {passed ? "🎉 Экзамен сдан!" : "Экзамен не сдан"}
          </h1>

          {!passed && (mode === 'exam' || mode === 'exam-russia') && (
            <p className="text-red-400 font-medium bg-red-500/10 inline-block px-4 py-1.5 rounded-full text-sm border border-red-500/20">
              Допущено {incorrectCount} {incorrectCount === 1 ? 'ошибка' : 'ошибки'}. Это критично для экзамена РФ.
            </p>
          )}

          {passed && (
            <p className="text-muted-foreground">Отличный результат! Продолжайте в том же духе.</p>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 sm:gap-4 mb-8"
        >
          {/* Time Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1">
            <Clock className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">{formatTime(timeSpent)}</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">Время</span>
          </div>

          {/* Accuracy Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1">
            <Target className={cn("w-5 h-5 mb-1", passed ? "text-emerald-400" : "text-orange-400")} />
            <span className={cn("text-xl sm:text-2xl font-bold", passed ? "text-emerald-400" : "text-orange-400")}>
              {getAccuracy()}%
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">Точность</span>
          </div>

          {/* XP/Streak Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-yellow-500/10 blur-xl" />
            <Zap className="w-5 h-5 text-yellow-400 mb-1 relative z-10" />
            <span className="text-xl sm:text-2xl font-bold text-yellow-400 relative z-10">
              +{rewardResult?.sp_awarded || (passed ? 20 : 5)}
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium relative z-10">XP получен</span>
          </div>
        </motion.div>

        {/* Smart Debrief — AI анализ ошибок */}
        {incorrectCount > 0 && (
          <SmartDebriefCard
            failedQuestions={answers
              .filter(a => !a.isCorrect)
              .map(ans => {
                const q = questions.find(q => q.id === ans.questionId);
                const selectedOption = q?.answer_options.find(opt => opt.id === ans.selectedAnswerId);
                const correctOption = q?.answer_options.find(opt => opt.is_correct);

                return {
                  questionId: ans.questionId,
                  questionText: q?.question_ru || '',
                  userAnswer: selectedOption?.text_ru || 'Не выбран',
                  correctAnswer: correctOption?.text_ru || '',
                  topic: q?.topics?.title_ru,
                  explanation: q?.explanation_ru,
                };
              })
            }
            weakTopic={weakTopic}
            onUpgradeClick={() => navigate('/premium')}
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
              Детальный отчет
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
              {questions.length} вопросов
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
                        {q.question_ru}
                      </p>
                      {answer && !isCorrect && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-wider text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Ошибка</span>
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
                              <QuestionImageComponent imageUrl={q.image_url} />
                            </div>
                          )}

                          {/* Question Text */}
                          <div className="space-y-4">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Детали вопроса</h4>
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
                                    <span className="flex-1 pr-4">{opt.text_ru}</span>
                                    {isOptCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                                    {isSelected && !isOptCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Premium AI Explanation */}
                          {q.explanation_ru && (
                            <div className="relative group/ai">
                              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-md opacity-0 group-hover/ai:opacity-100 transition duration-500" />
                              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
                                    Объяснение AI
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                  {q.explanation_ru}
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
              if (!isPremium) setShouldShowInterstitial(true);
              setTimeout(() => navigate("/tests"), 100);
            }}
          >
            Вернуться к тестам
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default TestResults;
