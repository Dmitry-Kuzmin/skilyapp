import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, XCircle, Clock, CheckCircle2, Languages, ChevronDown, ChevronUp, Target, TrendingUp, BookOpen, ArrowRight, Play, Crown, Sparkles, Star, Zap, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { TestUpsellBanner } from "@/components/monetization/TestUpsellBanner";
import { getImageUrl } from "@/utils/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { improvementTips, encouragements } from "@/data/lumiHints";

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

// Компонент для отображения изображения вопроса с обработкой ошибок
const QuestionImageComponent = ({ imageUrl }: { imageUrl: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      // Получаем URL изображения
      const url = getImageUrl(imageUrl);
      
      if (url) {
        setImageSrc(url);
        setIsLoading(false);
      } else {
        console.warn(`[TestResults] Could not generate URL for image: ${imageUrl}`);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden border border-border/50 bg-muted/20 animate-pulse">
        <div className="w-full h-48 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-border/50">
      <img 
        src={imageSrc} 
        alt="Pregunta" 
        className="w-full max-h-48 object-contain bg-muted/30"
        loading="lazy"
        decoding="async"
        // КРИТИЧНО: width/height для предотвращения CLS
        // Используем стандартные размеры для вопросов (обычно 800x600)
        width={800}
        height={600}
        style={{ aspectRatio: '4/3' }}
        onError={() => {
          console.error(`[TestResults] Failed to load image: ${imageSrc}`);
          setHasError(true);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
      />
    </div>
  );
};

const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const duelPassSyncRef = useRef(false);
  const [rewards, setRewards] = useState<{
    coins?: number;
    sp?: number;
    levelUp?: boolean;
    newLevel?: number;
  } | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  
  // Check if location.state exists
  if (!location.state) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">No hay datos de resultados del test</p>
          <Button onClick={() => navigate("/tests")}>
            Volver a los tests
          </Button>
        </div>
      </Layout>
    );
  }

  const { questions, answers, mode, timeSpent, testId, testInfo, rewardResult } = location.state as {
    questions: QuestionData[];
    answers: Answer[];
    mode: string;
    timeSpent: number;
    testId?: string;
    testInfo?: { id: string; title: string };
    rewardResult?: TestRewardPayload | null;
  };

  // Синхронизируем награды, переданные с экрана теста (только один раз!)
  const hasShownRewardsRef = useRef(false);
  
  useEffect(() => {
    if (!rewardResult || hasShownRewardsRef.current) return;

    try {
      setRewards({
        coins: typeof rewardResult.coins_awarded === "number" ? rewardResult.coins_awarded : undefined,
        sp: typeof rewardResult.sp_awarded === "number" ? rewardResult.sp_awarded : undefined,
        levelUp: rewardResult.level_up,
        newLevel: rewardResult.new_level,
      });

      const rewardMessages: string[] = [];
      if (rewardResult.coins_awarded && rewardResult.coins_awarded > 0) {
        rewardMessages.push(`+${rewardResult.coins_awarded} монет`);
      }
      if (rewardResult.sp_awarded && rewardResult.sp_awarded > 0) {
        rewardMessages.push(`+${rewardResult.sp_awarded} SP`);
      }
      if (rewardResult.level_up && rewardResult.new_level) {
        rewardMessages.push(`🎉 Новый уровень Duel Pass: ${rewardResult.new_level}!`);
      }

      // Показываем уведомление только если есть новые награды (не "already processed")
      if ((rewardMessages.length > 0 || rewardResult.message) && rewardResult.message !== "Test already processed") {
        toast.success("Награды получены!", {
          description: rewardResult.message || rewardMessages.join(", "),
          duration: 5000,
        });
        hasShownRewardsRef.current = true; // Помечаем что уже показали
      }
    } catch (error) {
      console.error("[TestResults] Error processing rewards:", error);
      // Не показываем ошибку пользователю, так как это не критично для отображения результатов
    }
  }, [rewardResult]);

  // Дуэльный пасс все еще синхронизируем отдельно
  useEffect(() => {
    const syncDuelPass = async () => {
      if (!profileId || !rewardResult || duelPassSyncRef.current) return;
      duelPassSyncRef.current = true;

      try {
        const { data: xpData, error: xpError } = await supabase.functions.invoke("duel-pass-xp", {
          body: { user_id: profileId, source_type: "test" },
        });

        if (xpError) throw xpError;

        if (xpData?.level_up) {
          const { data: suggestion } = await supabase.functions.invoke("assistant-suggest", {
            body: { trigger: "duel_pass_level_up" },
          });
          const message = suggestion?.suggestion?.message;
          if (message) {
            toast.info(message);
          }
        }
      } catch (error) {
        console.error("[TestResults] Duel Pass XP error:", error);
        // Игнорируем ошибки синхронизации Duel Pass (offline режим)
        // Результаты теста все равно будут отображены
      }
    };

    syncDuelPass();
  }, [profileId, rewardResult]);

  const [nextTest, setNextTest] = useState<{ id: string; title: string; status: string } | null>(null);
  const [loadingNextTest, setLoadingNextTest] = useState(false);

  // Исправляем подсчет - используем уникальные questionId для правильного подсчета
  const correctAnswersMap = new Map<string, Answer>();
  const incorrectAnswersMap = new Map<string, Answer>();
  
  answers.forEach(answer => {
    if (answer.isCorrect) {
      if (!correctAnswersMap.has(answer.questionId)) {
        correctAnswersMap.set(answer.questionId, answer);
      }
    } else {
      if (!incorrectAnswersMap.has(answer.questionId)) {
        incorrectAnswersMap.set(answer.questionId, answer);
      }
    }
  });
  
  const correctAnswers = Array.from(correctAnswersMap.values());
  const incorrectAnswers = Array.from(incorrectAnswersMap.values());
  const correctCount = correctAnswers.length;
  const incorrectCount = incorrectAnswers.length;
  const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  
  // Логика определения успешности теста:
  // - Для экзамена: максимум 3 ошибки (из 30 вопросов = 90%)
  // - Для практики: минимум 80% правильных ответов
  // - Для sequential: минимум 80% правильных ответов
  const passed = mode === "exam" ? incorrectCount <= 3 : percentage >= 80;
  
  // Статистика по темам для рекомендаций
  const topicStats: Record<string, { correct: number; incorrect: number; total: number; questions: QuestionData[] }> = {};
  const processedQuestions = new Set<string>();
  
  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && question.topics) {
      const topicId = question.topics.title_es || question.topics.title_ru || 'Sin tema';
      if (!topicStats[topicId]) {
        topicStats[topicId] = { correct: 0, incorrect: 0, total: 0, questions: [] };
      }
      // Считаем только один раз для каждого вопроса
      if (!processedQuestions.has(question.id)) {
        processedQuestions.add(question.id);
        topicStats[topicId].total++;
        if (answer.isCorrect) {
          topicStats[topicId].correct++;
        } else {
          topicStats[topicId].incorrect++;
        }
        if (!topicStats[topicId].questions.find(q => q.id === question.id)) {
          topicStats[topicId].questions.push(question);
        }
      }
    }
  });
  
  // Топики с низкой точностью (для рекомендаций)
  const weakTopics = Object.entries(topicStats)
    .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.7)
    .sort(([_, a], [__, b]) => (a.correct / a.total) - (b.correct / b.total))
    .slice(0, 3);
  
  // Загружаем следующий тест, если текущий пройден
  useEffect(() => {
    const loadNextTest = async () => {
      if (!testId || !profileId || mode !== 'sequential') return;

      setLoadingNextTest(true);
      try {
        // Получаем информацию о текущем тесте
        const { data: currentTest, error: currentTestError } = await supabase
          .from("tests")
          .select("min_pass_percent")
          .eq("id", testId)
          .single();

        if (currentTestError) {
          console.error("[TestResults] Error loading current test:", currentTestError);
          // В offline режиме просто не показываем следующий тест
          return;
        }

        if (!currentTest) return;

        // Проверяем, прошел ли пользователь тест
        const minPassPercent = currentTest.min_pass_percent || 80;
        if (percentage < minPassPercent) {
          setLoadingNextTest(false);
          return; // Тест не пройден, следующий не разблокирован
        }

        // Находим следующий тест
        const { data: nextTestData, error: nextTestError } = await supabase
          .from("tests")
          .select("id, title_ru, title_es")
          .eq("required_test_id", testId)
          .order("order_index")
          .limit(1)
          .single();

        if (nextTestError) {
          console.error("[TestResults] Error loading next test:", nextTestError);
          return;
        }

        if (!nextTestData) {
          setLoadingNextTest(false);
          return;
        }

        // Проверяем статус следующего теста
        const { data: nextTestProgress, error: progressError } = await supabase
          .from("user_test_progress")
          .select("status")
          .eq("user_id", profileId)
          .eq("test_id", nextTestData.id)
          .single();

        if (progressError) {
          console.error("[TestResults] Error loading test progress:", progressError);
          // Не критично, показываем тест как unlocked
        }

        setNextTest({
          id: nextTestData.id,
          title: nextTestData.title_ru,
          status: nextTestProgress?.status || 'unlocked',
        });
      } catch (error) {
        console.error("[TestResults] Error loading next test:", error);
        // В offline режиме игнорируем ошибки - результаты все равно отобразятся
      } finally {
        setLoadingNextTest(false);
      }
    };

    loadNextTest();
  }, [testId, profileId, mode, percentage]);

  // УДАЛЕНО: Создание уведомлений через duel_notifications
  // Это создавало ошибки, так как test_result не всегда в ENUM
  // Уведомления для тестов должны создаваться через другую систему или не создаваться вообще

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTranslation = (questionId: string) => {
    setShowTranslation(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const isExplanationLong = (text: string | null) => {
    if (!text) return false;
    // Примерно 3 строки = 150-200 символов
    return text.length > 150;
  };

  const renderQuestionCard = (answer: Answer, question: QuestionData, isCorrect: boolean) => {
    const selectedAnswer = question.answer_options.find(opt => opt.id === answer.selectedAnswerId);
    const correctAnswer = question.answer_options.find(opt => opt.is_correct);
    const showTrans = showTranslation[question.id];
    const isExpanded = expandedExplanations[question.id];
    // Переключаем объяснение в зависимости от языка перевода
    const explanation = showTrans ? (question.explanation_ru || question.explanation_es) : (question.explanation_es || question.explanation_ru);
    const isLongExplanation = isExplanationLong(explanation);

    return (
      <Card key={question.id} className="p-4 sm:p-6 gradient-card border-border/50 animate-fade-in">
        <div className="flex items-start gap-3 mb-3">
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {question.topics?.title_es || 'Sin tema'}
                </p>
                <p className="font-semibold text-sm sm:text-base">
                  {showTrans ? question.question_ru : question.question_es}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleTranslation(question.id)}
                className="h-8 w-8 shrink-0"
                title="Traducir"
              >
                <Languages className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {question.image_url && (
          <QuestionImageComponent imageUrl={question.image_url} />
        )}

        <div className="ml-0 sm:ml-8 space-y-3">
          {!isCorrect && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                ❌ Tu respuesta:
              </p>
              <p className="text-sm">{showTrans ? selectedAnswer?.text_ru : selectedAnswer?.text_es}</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              ✅ Respuesta correcta:
            </p>
            <p className="text-sm">{showTrans ? correctAnswer?.text_ru : correctAnswer?.text_es}</p>
          </div>

          {explanation && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-secondary">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs sm:text-sm font-medium">💡 Explicación:</p>
                {isLongExplanation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExplanation(question.id);
                    }}
                    className="h-6 px-2 text-xs shrink-0"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Mostrar
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className={cn(
                "text-sm text-muted-foreground leading-relaxed transition-all",
                isLongExplanation && !isExpanded && "line-clamp-3"
              )}>
                {explanation}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const [showConfetti, setShowConfetti] = useState(false);

  // Запускаем конфетти при успешном прохождении
  useEffect(() => {
    if (passed && percentage >= 80) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [passed, percentage]);

  // ОПТИМИЗАЦИЯ: Используем React Query для инвалидации кэша
  const queryClient = useQueryClient();
  
  // Инвалидируем кэш dashboard при монтировании страницы результатов
  useEffect(() => {
    // Это гарантирует, что статистика обновится при следующем визите на dashboard
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    queryClient.invalidateQueries({ queryKey: ['profile-data'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
    console.log('[TestResults] Dashboard cache invalidated - stats will refresh');
  }, [queryClient]);

  return (
    <Layout>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-20 md:pb-4">
        {/* Главная карточка результатов с улучшенным дизайном */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6 sm:p-8 border-2 text-center mb-6 relative overflow-hidden">
            {/* Градиентный фон */}
            <div className={cn(
              "absolute inset-0 opacity-10",
              passed ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-red-500 to-orange-600"
            )} />
            
            <div className="relative z-10">
              {/* Иконка результата с анимацией */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full flex items-center justify-center border-4",
                  passed 
                    ? "bg-emerald-500/20 border-emerald-500/30 shadow-lg shadow-emerald-500/20" 
                    : "bg-red-500/20 border-red-500/30 shadow-lg shadow-red-500/20"
                )}
              >
                {passed ? (
                  <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
                ) : (
                  <Target className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
                )}
              </motion.div>

              {/* Заголовок */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  "text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                  passed 
                    ? "from-emerald-500 to-green-600" 
                    : "from-red-500 to-orange-600"
                )}
              >
                {passed ? "🎉 ¡Test Aprobado!" : "😔 Test No Aprobado"}
              </motion.h1>
              
              {/* Lumi's Comment */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mb-4 flex items-center justify-center gap-3"
              >
                <LumiCharacter 
                  size="md" 
                  mood={percentage >= 90 ? "celebrating" : percentage >= 70 ? "happy" : percentage >= 50 ? "encouraging" : "encouraging"}
                />
                <div className="text-left max-w-md">
                  <p className="text-sm font-medium text-foreground">
                    {percentage >= 90 ? (
                      encouragements.completed[Math.floor(Math.random() * encouragements.completed.length)]
                    ) : percentage >= 70 ? (
                      improvementTips.mediumScore[Math.floor(Math.random() * improvementTips.mediumScore.length)]
                    ) : (
                      improvementTips.lowScore[Math.floor(Math.random() * improvementTips.lowScore.length)]
                    )}
                  </p>
                </div>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-4 flex items-center justify-center gap-2"
              >
                {mode === "exam" ? "Modo examen" : mode === "sequential" ? "Тест последовательный" : "Modo práctica"}
              </motion.p>

              {/* Награды за тест */}
              {rewards && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mb-6 flex items-center justify-center gap-3 flex-wrap"
                >
                  {rewards.coins && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold text-yellow-600 dark:text-yellow-500">
                        +{rewards.coins} монет
                      </span>
                    </div>
                  )}
                  {rewards.sp && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Trophy className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-blue-600 dark:text-blue-500">
                        +{rewards.sp} SP
                      </span>
                    </div>
                  )}
                  {rewards.levelUp && rewards.newLevel && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-blue-600 dark:text-blue-500">
                        🎉 Уровень {rewards.newLevel}!
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Статистика с улучшенным дизайном */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6"
              >
                <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-600/5 border-2 border-emerald-500/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-emerald-500">{correctCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Correctas</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-600/5 border-2 border-red-500/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-red-500">{incorrectCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Errores</p>
                </Card>
                <Card className={cn(
                  "p-4 border-2",
                  passed
                    ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
                    : "bg-gradient-to-br from-orange-500/10 to-red-600/5 border-orange-500/20"
                )}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className={cn(
                      "w-5 h-5",
                      passed ? "text-primary" : "text-orange-500"
                    )} />
                  </div>
                  <p className={cn(
                    "text-3xl sm:text-4xl font-bold",
                    passed ? "text-primary" : "text-orange-500"
                  )}>{percentage}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Precisión</p>
                </Card>
              </motion.div>

              {/* Время прохождения */}
              {(mode === "exam" || mode === "sequential") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6"
                >
                  <Clock className="w-4 h-4" />
                  <span>Tiempo: {formatTime(timeSpent)}</span>
                </motion.div>
              )}

              {/* Micro Upsell - только для не-Premium пользователей с низким результатом */}
              {!isPremium && percentage < 70 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="mb-6"
                >
                  <TestUpsellBanner trigger="failed_tests" failedCount={incorrectCount} />
                </motion.div>
              )}

              {/* Мотивационное сообщение */}
              {passed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-600/5 border-2 border-emerald-500/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ¡Excelente trabajo!
                    </p>
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Continúa así y alcanzarás nuevos niveles
                  </p>
                </motion.div>
              )}

              {/* Следующий тест для sequential тестов */}
              <AnimatePresence>
                {mode === "sequential" && nextTest && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 p-5 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-2 border-blue-500/30 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        ¡Siguiente test desbloqueado!
                      </p>
                      <Sparkles className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{nextTest.title}</p>
                    <Button
                      onClick={() => navigate(`/test/sequential/${nextTest.id}`)}
                      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
                      size="lg"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Comenzar siguiente test
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Завершение всех тестов */}
              {mode === "sequential" && !nextTest && percentage >= 80 && !loadingNextTest && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 p-5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-600/5 border-2 border-yellow-500/30"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <p className="font-bold text-yellow-600 dark:text-yellow-400">
                      ¡Felicidades!
                    </p>
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Has completado todos los tests disponibles en este tema.
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>

        {(incorrectCount > 0 || correctCount > 0) && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Revisión de preguntas</h2>
            
            <Tabs defaultValue="incorrect" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="incorrect" className="relative">
                  Incorrectas
                  {incorrectCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                      {incorrectCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="correct" className="relative">
                  Correctas
                  {correctCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {correctCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incorrect" className="space-y-4">
                {incorrectAnswers.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">¡Perfecto! No hay respuestas incorrectas 🎉</p>
                  </Card>
                ) : (
                  incorrectAnswers.map((answer) => {
                    const question = questions.find((q) => q.id === answer.questionId);
                    if (!question) return null;
                    return renderQuestionCard(answer, question, false);
                  })
                )}
              </TabsContent>

              <TabsContent value="correct" className="space-y-4">
                {correctAnswers.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">No hay respuestas correctas</p>
                  </Card>
                ) : (
                  correctAnswers.map((answer) => {
                    const question = questions.find((q) => q.id === answer.questionId);
                    if (!question) return null;
                    return renderQuestionCard(answer, question, true);
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Статистика по темам и рекомендации */}
        {weakTopics.length > 0 && (
          <Card className="p-4 sm:p-6 gradient-card border-border/50 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold">Recomendaciones</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Basado en tus resultados, te recomendamos practicar más estas áreas:
            </p>
            <div className="space-y-3">
              {weakTopics.map(([topicName, stats]) => {
                const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={topicName} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{topicName}</span>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        accuracy < 50 ? "text-red-500" : "text-orange-500"
                      )}>
                        {accuracy}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{stats.correct} correctas</span>
                      <span>•</span>
                      <span>{stats.incorrect} incorrectas</span>
                      <span>•</span>
                      <span>{stats.total} total</span>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate(mode === "sequential" ? "/tests/sequential" : "/tests")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Practicar más temas
            </Button>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={() => navigate(mode === "sequential" ? "/tests/sequential" : "/tests")} 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            ← Volver a los tests
          </Button>
          <Button 
            onClick={() => navigate(`/test/${mode}`)} 
            className="flex-1"
            size="lg"
          >
            Hacer otro test 🔄
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default TestResults;
