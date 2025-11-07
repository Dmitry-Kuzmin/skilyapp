import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, XCircle, Clock, CheckCircle2, Languages, ChevronDown, ChevronUp, Target, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

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

const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
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

  const { questions, answers, mode, timeSpent } = location.state as {
    questions: QuestionData[];
    answers: Answer[];
    mode: string;
    timeSpent: number;
  };

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
  // Для экзамена: максимум 3 ошибки (из 30 вопросов = минимум 27 правильных = 90%)
  // Упрощенная логика: если ошибок <= 3, то процент всегда >= 90% при 30 вопросах
  const passed = mode === "exam" ? incorrectCount <= 3 : true;
  
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

        {question.image_url && getImageUrl(question.image_url) && (
          <div className="mb-4 rounded-lg overflow-hidden border border-border/50">
            <img 
              src={getImageUrl(question.image_url) || ''} 
              alt="Pregunta" 
              className="w-full max-h-48 object-contain bg-muted/30"
              loading="lazy"
            />
          </div>
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-20 md:pb-4">
        <Card className="p-6 sm:p-8 gradient-card border-border/50 text-center mb-6">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full flex items-center justify-center animate-scale-in ${
            passed ? "bg-emerald-500/20" : "bg-red-500/20"
          }`}>
            <Trophy className={`w-8 h-8 sm:w-10 sm:h-10 ${passed ? "text-emerald-500" : "text-red-500"}`} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {passed ? "🎉 ¡Test aprobado!" : "😔 Test no aprobado"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {mode === "exam" ? "Modo examen" : "Modo práctica"}
          </p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-500">{correctCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Correctas</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-red-500">{incorrectCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Errores</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{percentage}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Precisión</p>
            </div>
          </div>

          {mode === "exam" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Tiempo: {formatTime(timeSpent)}</span>
            </div>
          )}
        </Card>

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
              onClick={() => navigate("/tests")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Practicar más temas
            </Button>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={() => navigate("/tests")} 
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
