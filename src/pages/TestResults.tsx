import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, XCircle, Clock, CheckCircle2, Languages, ChevronDown, ChevronUp, Target, TrendingUp, BookOpen, ArrowRight, Play, Crown, Sparkles, Star, Zap, Coins, Loader2, Info, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { AnimatedCounter } from "@/components/AnimatedCounter";

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
  const rewardLoggedRef = useRef(false);
  const [isCalculatingRewards, setIsCalculatingRewards] = useState(true);
  const [rewards, setRewards] = useState<{
    coins?: number;
    sp?: number;
    levelUp?: boolean;
    newLevel?: number;
    details?: {
      baseCoins?: number;
      baseSP?: number;
      abusePenalty?: number;
      diminishingFactor?: number;
      testsToday?: number;
      premiumUsed?: boolean;
      doubleSPUsed?: boolean;
    };
  } | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [showRewardDetails, setShowRewardDetails] = useState(false);
  
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

  const { questions, answers, mode, timeSpent, testId, testInfo, sessionId } = location.state as {
    questions: QuestionData[];
    answers: Answer[];
    mode: string;
    timeSpent: number;
    testId?: string;
    testInfo?: { id: string; title: string };
    sessionId?: string;
  };

  // Начисление наград после получения данных (новая система)
  useEffect(() => {
    const handleRewards = async () => {
      if (!profileId || rewardLoggedRef.current || !questions || questions.length === 0 || !answers) {
        setIsCalculatingRewards(false);
        return;
      }
      rewardLoggedRef.current = true;
      setIsCalculatingRewards(true);
      
      // Вычисляем score из answers
      const correctCount = answers.filter(a => a.isCorrect).length;
      const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      
      // Используем session_id из state или генерируем новый
      const finalSessionId = sessionId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Проверяем Premium статус
        const { data: profile } = await supabase
          .from('profiles')
          .select('premium_until, trial_until')
          .eq('id', profileId)
          .single();
        
        const now = new Date();
        const isPremium = (profile?.premium_until && new Date(profile.premium_until) > now) ||
                         (profile?.trial_until && new Date(profile.trial_until) > now);
        
        // Проверяем активный Double SP boost
        // Важно: проверяем с небольшим запасом времени (5 секунд) для надежности
        const boostCheckTime = new Date(now.getTime() + 5000); // +5 секунд запас
        const { data: activeBoost, error: boostError } = await supabase
          .from('active_boosts')
          .select('effect_multiplier, expires_at')
          .eq('user_id', profileId)
          .eq('effect_type', 'sp_multiplier')
          .gt('expires_at', boostCheckTime.toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (boostError) {
          console.warn('[TestResults] Error checking active boost:', boostError);
        }
        
        const doubleSPActive = activeBoost && activeBoost.effect_multiplier && parseFloat(activeBoost.effect_multiplier.toString()) >= 2;
        
        if (doubleSPActive) {
          console.log('[TestResults] ✅ Double SP boost активен:', {
            multiplier: activeBoost.effect_multiplier,
            expiresAt: activeBoost.expires_at
          });
        } else {
          console.log('[TestResults] ℹ️ Double SP boost не активен или не найден');
        }
        
        // Вызываем новую функцию complete-test-and-award
        const { data: rewardData, error: rewardError } = await supabase.functions.invoke("complete-test-and-award", {
          body: {
            user_id: profileId,
            test_id: testId || null,
            session_id: finalSessionId,
            score: score,
            questions_count: questions.length,
            correct_count: correctCount,
            test_duration_seconds: timeSpent,
            premium_flag: isPremium,
            double_sp_active: doubleSPActive || false,
          },
        });
        
        if (rewardError) {
          console.error('[TestResults] Reward error:', rewardError);
          setIsCalculatingRewards(false);
          const errorMessage = rewardError.message || rewardError.toString() || "Неизвестная ошибка";
          toast.error("Ошибка при начислении наград", {
            description: errorMessage,
            duration: 8000,
          });
          return;
        }
        
        if (!rewardData || !rewardData.success) {
          console.error('[TestResults] Reward failed:', rewardData);
          setIsCalculatingRewards(false);
          const errorMessage = rewardData?.error || rewardData?.details || "Не удалось начислить награды";
          const errorCode = rewardData?.code ? ` (код: ${rewardData.code})` : '';
          toast.error("Не удалось начислить награды", {
            description: `${errorMessage}${errorCode}`,
            duration: 8000,
          });
          return;
        }
        
        // Также начисляем XP для обратной совместимости
        try {
          const { data: xpData } = await supabase.functions.invoke("duel-pass-xp", {
            body: { user_id: profileId, source_type: "test" },
          });
          
          if (xpData?.level_up) {
            const { data: suggestion } = await supabase.functions.invoke("assistant-suggest", {
              body: { trigger: "duel_pass_level_up" },
            });
            const message = suggestion?.suggestion?.message;
            if (message) {
              toast.info(message);
            }
          }
        } catch (xpError) {
          // Игнорируем ошибки XP (не критично)
          console.warn('[TestResults] XP error (non-critical):', xpError);
        }
        
        // Сохраняем результаты начислений с детальной информацией
        setRewards({
          coins: rewardData.coins_awarded || 0,
          sp: rewardData.sp_awarded || 0,
          levelUp: rewardData.level_up || false,
          newLevel: rewardData.new_level || undefined,
          // Детальная информация для UI
          details: {
            baseCoins: rewardData.base_coins,
            baseSP: rewardData.base_sp,
            abusePenalty: rewardData.abuse_penalty,
            diminishingFactor: rewardData.diminishing_factor,
            testsToday: rewardData.tests_today,
            premiumUsed: isPremium,
            doubleSPUsed: doubleSPActive || false,
          }
        });
        
        // Завершаем расчет сразу - анимация счетчика начнется автоматически
        setIsCalculatingRewards(false);
        
        // Показываем уведомление о начислениях
        const rewardMessages = [];
        if (rewardData.coins_awarded) {
          rewardMessages.push(`+${rewardData.coins_awarded} монет`);
        }
        if (rewardData.sp_awarded) {
          rewardMessages.push(`+${rewardData.sp_awarded} SP`);
        }
        if (rewardData.level_up) {
          rewardMessages.push(`🎉 Новый уровень Duel Pass: ${rewardData.new_level}!`);
        }
        
        if (rewardMessages.length > 0) {
          toast.success("Награды получены!", {
            description: rewardMessages.join(", "),
            duration: 5000,
          });
        }
        
        // Показываем уведомление о diminishing returns, если есть
        if (rewardData.message) {
          toast.info(rewardData.message, {
            duration: 6000,
          });
        }
        
      } catch (error: any) {
        console.error('[TestResults] Error handling rewards:', error);
        toast.error("Ошибка при начислении наград", {
          description: error?.message || "Попробуйте обновить страницу",
        });
        setIsCalculatingRewards(false);
      }
    };
    
    handleRewards();
  }, [profileId, questions, answers, timeSpent, testId]);

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
  
  // Стандарты DGT: минимум 90% правильных ответов для сдачи экзамена
  // Для exam и sequential режимов применяем стандарты DGT
  // Для practice режима более мягкие требования (80%)
  let passed: boolean;
  if (mode === "exam" || mode === "sequential") {
    // DGT стандарт: минимум 90% правильных (максимум 10% ошибок)
    // Для 30 вопросов = максимум 3 ошибки
    // Для любого количества: максимум Math.ceil(questions.length * 0.1) ошибок
    const maxAllowedErrors = Math.ceil(questions.length * 0.1);
    passed = incorrectCount <= maxAllowedErrors && percentage >= 90;
  } else {
    // Practice режим: более мягкие требования (80%)
    passed = percentage >= 80;
  }
  
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
        const { data: currentTest } = await supabase
          .from("tests")
          .select("min_pass_percent")
          .eq("id", testId)
          .single();

        if (!currentTest) return;

        // Проверяем, прошел ли пользователь тест
        const minPassPercent = currentTest.min_pass_percent || 80;
        if (percentage < minPassPercent) {
          setLoadingNextTest(false);
          return; // Тест не пройден, следующий не разблокирован
        }

        // Находим следующий тест
        const { data: nextTestData } = await supabase
          .from("tests")
          .select("id, title_ru, title_es")
          .eq("required_test_id", testId)
          .order("order_index")
          .limit(1)
          .single();

        if (!nextTestData) {
          setLoadingNextTest(false);
          return;
        }

        // Проверяем статус следующего теста
        const { data: nextTestProgress } = await supabase
          .from("user_test_progress")
          .select("status")
          .eq("user_id", profileId)
          .eq("test_id", nextTestData.id)
          .single();

        setNextTest({
          id: nextTestData.id,
          title: nextTestData.title_ru,
          status: nextTestProgress?.status || 'unlocked',
        });
      } catch (error) {
        console.error("Error loading next test:", error);
      } finally {
        setLoadingNextTest(false);
      }
    };

    loadNextTest();
  }, [testId, profileId, mode, percentage]);

  // Создаем уведомление о результатах теста
  useEffect(() => {
    const createTestNotification = async () => {
      if (!profileId) return;
      
      try {
        const motivationalMessages = {
          excellent: [
            "¡Increíble! 🎉 Has logrado un resultado perfecto. ¡Sigue así!",
            "¡Excelente trabajo! 🌟 Tu dedicación está dando resultados.",
            "¡Perfecto! ⭐ Has demostrado un gran conocimiento."
          ],
          good: [
            "¡Bien hecho! 👍 Has completado el test con buenos resultados.",
            "¡Muy bien! 💪 Estás en el camino correcto.",
            "¡Buen progreso! 🚀 Sigue practicando para mejorar aún más."
          ],
          needsImprovement: [
            "¡No te rindas! 💪 Cada error es una oportunidad de aprender.",
            "Sigue practicando 📚 y verás la mejora pronto.",
            "¡Ánimo! 🌱 El aprendizaje es un proceso continuo."
          ]
        };
        
        let messageCategory: keyof typeof motivationalMessages = 'needsImprovement';
        if (percentage >= 90) {
          messageCategory = 'excellent';
        } else if (percentage >= 70) {
          messageCategory = 'good';
        }
        
        const messages = motivationalMessages[messageCategory];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const title = mode === "exam" 
          ? (passed ? "✅ Examen aprobado" : "❌ Examen no aprobado")
          : "📝 Test completado";
        
        const message = `${randomMessage} ${correctCount} correctas de ${questions.length} (${percentage}%)`;
        
        // Проверяем, есть ли уже уведомление за сегодня о тесте
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existingNotification } = await supabase
          .from('duel_notifications')
          .select('id')
          .eq('user_id', profileId)
          .eq('type', 'test_result')
          .gte('created_at', today.toISOString())
          .single();
        
        if (!existingNotification) {
          await supabase
            .from('duel_notifications')
            .insert({
              user_id: profileId,
              type: 'test_result',
              title,
              message,
              icon: passed ? '🎉' : '📝',
              metadata: {
                mode,
                correctCount,
                incorrectCount,
                percentage,
                totalQuestions: questions.length,
                passed
              }
            });
        }
      } catch (error) {
        console.error('Error creating test notification:', error);
      }
    };
    
    createTestNotification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

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

              {/* Награды за тест - всегда показываем блок */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: isCalculatingRewards ? 0 : 0.45 }}
                className="mb-6 flex items-center justify-center gap-3 flex-wrap min-h-[60px]"
              >
                {isCalculatingRewards ? (
                  // Анимация загрузки расчета наград - показывается сразу без задержки
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground font-medium">
                      Расчет наград...
                    </span>
                  </motion.div>
                ) : rewards && (rewards.coins || rewards.sp) ? (
                  // Отображение начисленных наград с анимацией счетчика и индикаторами бонусов
                  <>
                    {rewards.coins && rewards.coins > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0, type: "spring", stiffness: 200 }}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 shadow-lg shadow-yellow-500/10"
                      >
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
                          <Coins className="w-5 h-5 text-yellow-500" />
                        </motion.div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-yellow-600 dark:text-yellow-500">
                            +<AnimatedCounter value={rewards.coins} suffix=" монет" />
                          </span>
                          {rewards.details?.premiumUsed && (
                            <span className="text-xs text-yellow-500/70 flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Premium x1.5
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                    {rewards.sp && rewards.sp > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/10"
                      >
                        <motion.div
                          animate={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <Trophy className="w-5 h-5 text-purple-500" />
                        </motion.div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-purple-600 dark:text-purple-500">
                            +<AnimatedCounter value={rewards.sp} suffix=" SP" />
                          </span>
                          <div className="flex items-center gap-2 text-xs text-purple-500/70">
                            {rewards.details?.premiumUsed && (
                              <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Premium x1.2
                              </span>
                            )}
                            {rewards.details?.doubleSPUsed && (
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Double SP x2
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {/* Визуализация diminishing returns */}
                    {rewards.details?.diminishingFactor && rewards.details.diminishingFactor < 1 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20"
                      >
                        <TrendingDown className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-600 dark:text-orange-500 font-medium">
                          Снижение: {Math.round((1 - rewards.details.diminishingFactor) * 100)}%
                        </span>
                      </motion.div>
                    )}
                    {/* Индикатор abuse penalty - переименован в более мягкую формулировку */}
                    {rewards.details?.abusePenalty && rewards.details.abusePenalty < 1 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20"
                      >
                        <Info className="w-4 h-4 text-orange-500" />
                        <div className="flex flex-col">
                          <span className="text-xs text-orange-600 dark:text-orange-500 font-medium">
                            Снижение: {Math.round((1 - rewards.details.abusePenalty) * 100)}%
                          </span>
                          <span className="text-[10px] text-orange-500/70">
                            Несколько быстрых тестов подряд
                          </span>
                        </div>
                      </motion.div>
                    )}
                    {/* Кнопка детальной информации о расчете */}
                    {rewards.details && (
                      <Dialog open={showRewardDetails} onOpenChange={setShowRewardDetails}>
                        <DialogTrigger asChild>
                          <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                          >
                            <Info className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-blue-600 dark:text-blue-500 font-medium">
                              Подробнее
                            </span>
                          </motion.button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Детали расчета наград</DialogTitle>
                            <DialogDescription>
                              Подробная информация о том, как были рассчитаны награды за этот тест
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Базовые значения */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Базовые значения</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="p-2 rounded bg-muted/50">
                                  <div className="text-xs text-muted-foreground">Базовые монеты</div>
                                  <div className="font-semibold">{rewards.details.baseCoins || 0}</div>
                                </div>
                                <div className="p-2 rounded bg-muted/50">
                                  <div className="text-xs text-muted-foreground">Базовые SP</div>
                                  <div className="font-semibold">{rewards.details.baseSP || 0}</div>
                                </div>
                              </div>
                            </div>

                            {/* Множители и бонусы */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Множители и бонусы</h4>
                              <div className="space-y-1.5">
                                {rewards.details.premiumUsed ? (
                                  <div className="flex items-center justify-between p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                    <div className="flex items-center gap-2">
                                      <Crown className="w-4 h-4 text-yellow-500" />
                                      <span className="text-sm">Premium бонус</span>
                                    </div>
                                    <span className="text-sm font-semibold text-yellow-600">
                                      Монеты: x1.5, SP: x1.2
                                    </span>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded bg-muted/30 text-sm text-muted-foreground text-center">
                                    Premium не активен
                                  </div>
                                )}
                                {rewards.details.doubleSPUsed ? (
                                  <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-purple-500" />
                                      <span className="text-sm">Double SP</span>
                                    </div>
                                    <span className="text-sm font-semibold text-purple-600">x2</span>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded bg-muted/30 text-sm text-muted-foreground text-center">
                                    Double SP не активен
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Штрафы и снижения */}
                            {(rewards.details.abusePenalty !== undefined && rewards.details.abusePenalty < 1) ||
                            (rewards.details.diminishingFactor !== undefined && rewards.details.diminishingFactor < 1) ? (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Примененные штрафы</h4>
                                <div className="space-y-1.5">
                                  {rewards.details.abusePenalty !== undefined && rewards.details.abusePenalty < 1 && (
                                    <div className="flex items-center justify-between p-2 rounded bg-orange-500/10 border border-orange-500/20">
                                      <div className="flex items-center gap-2">
                                        <Info className="w-4 h-4 text-orange-500" />
                                        <div className="flex flex-col">
                                          <span className="text-sm">Снижение за быстрые тесты</span>
                                          <span className="text-xs text-muted-foreground">
                                            Система обнаружила несколько быстрых тестов подряд. Это нормально, если вы просто быстро отвечаете!
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-sm font-semibold text-orange-600">
                                        -{Math.round((1 - rewards.details.abusePenalty) * 100)}%
                                      </span>
                                    </div>
                                  )}
                                  {rewards.details.diminishingFactor !== undefined && rewards.details.diminishingFactor < 1 && (
                                    <div className="flex items-center justify-between p-2 rounded bg-orange-500/10 border border-orange-500/20">
                                      <div className="flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm">Снижение за частые тесты</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-semibold text-orange-600">
                                          -{Math.round((1 - rewards.details.diminishingFactor) * 100)}%
                                        </span>
                                        {rewards.details.testsToday !== undefined && (
                                          <div className="text-xs text-muted-foreground">
                                            Тестов сегодня: {rewards.details.testsToday}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                <div className="text-sm text-green-600 dark:text-green-500 text-center">
                                  ✓ Штрафы не применялись
                                </div>
                              </div>
                            )}

                            {/* Итоговые значения */}
                            <div className="space-y-2 pt-2 border-t">
                              <h4 className="font-semibold text-sm">Итоговые награды</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                  <div className="text-xs text-muted-foreground mb-1">Монеты</div>
                                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-500">
                                    +{rewards.coins || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                  <div className="text-xs text-muted-foreground mb-1">SP</div>
                                  <div className="text-lg font-bold text-purple-600 dark:text-purple-500">
                                    +{rewards.sp || 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {rewards.levelUp && rewards.newLevel && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, delay: 0.4, repeat: 2 }}
                        >
                          <Sparkles className="w-5 h-5 text-purple-500" />
                        </motion.div>
                        <span className="font-semibold text-purple-600 dark:text-purple-500">
                          🎉 Уровень {rewards.newLevel}!
                        </span>
                      </motion.div>
                    )}
                  </>
                ) : null}
              </motion.div>

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
