import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Question = {
  id: string;
  question_ru: string;
  question_es: string;
  options_ru: string[];
  options_es: string[];
  correct_answer_ru: string;
  correct_answer_es: string;
  explanation_ru: string | null;
  explanation_es: string | null;
  topic_ru: string;
  topic_es: string;
};

type Answer = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
};

const parseOptions = (options: string[]): string[] => {
  if (!options || options.length === 0) return [];
  
  // Если это массив с одним элементом, содержащим все опции
  if (options.length === 1) {
    const singleString = options[0];
    // Разделяем по A), B), C)
    const parsed = singleString
      .split(/(?=[ABC]\))/)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0)
      .map(opt => opt.replace(/\s*(Correcta|Incorrecta|Правильно|Неправильно)\s*$/, '').trim());
    
    return parsed.length > 0 ? parsed : options;
  }
  
  // Если это уже массив опций, просто очищаем от маркеров
  return options.map(opt => 
    opt.replace(/\s*(Correcta|Incorrecta|Правильно|Неправильно)\s*$/, '').trim()
  );
};

const TestSession = () => {
  const { mode, topic } = useParams();
  const navigate = useNavigate();
  const [language] = useState<'ru' | 'es'>('ru'); // TODO: получать из контекста темы
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === "exam" ? 30 * 60 : 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [mode, topic]);

  useEffect(() => {
    if (mode === "exam" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, timeLeft]);

  const loadQuestions = async () => {
    try {
      let query = supabase.from("questions").select("*");

      if (mode === "exam") {
        const { data, error } = await query.limit(30);
        if (error) throw error;
        setQuestions(data?.sort(() => Math.random() - 0.5) || []);
      } else {
        if (topic) {
          query = query.eq("topic_ru", decodeURIComponent(topic));
        }
        const { data, error } = await query;
        if (error) throw error;
        setQuestions(data?.sort(() => Math.random() - 0.5) || []);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Ошибка загрузки вопросов");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!selectedOption) return;

    const currentQuestion = questions[currentIndex];
    const correctAnswer = language === 'ru' ? currentQuestion.correct_answer_ru : currentQuestion.correct_answer_es;
    const isCorrect = selectedOption === correctAnswer;

    setAnswers([
      ...answers,
      {
        questionId: currentQuestion.id,
        selectedAnswer: selectedOption,
        isCorrect,
      },
    ]);

    if (mode === "practice") {
      setShowExplanation(true);
    } else {
      const errorCount = [...answers, { isCorrect }].filter((a) => !a.isCorrect).length;
      if (errorCount >= 3) {
        finishTest();
        return;
      }
      nextQuestion();
    }
  };
  
  const jumpToQuestion = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    try {
      await supabase.from("game_sessions").insert({
        game_type: mode === "exam" ? "test_exam" : "test_practice",
        score,
        total_questions: questions.length,
        duration_seconds: mode === "exam" ? 30 * 60 - timeLeft : 0,
      });
    } catch (error) {
      console.error("Error saving results:", error);
    }

    navigate("/test/results", {
      state: {
        questions,
        answers,
        mode,
        timeSpent: mode === "exam" ? 30 * 60 - timeLeft : 0,
      },
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Загрузка вопросов...</p>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Вопросы не найдены</p>
          <Button onClick={() => navigate("/tests")} className="mt-4">
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const errorCount = answers.filter((a) => !a.isCorrect).length;
  
  const displayQuestion = language === 'ru' ? currentQuestion.question_ru : currentQuestion.question_es;
  const displayTopic = language === 'ru' ? currentQuestion.topic_ru : currentQuestion.topic_es;
  const displayOptions = parseOptions(language === 'ru' ? currentQuestion.options_ru : currentQuestion.options_es);
  const correctAnswer = language === 'ru' ? currentQuestion.correct_answer_ru : currentQuestion.correct_answer_es;
  const displayExplanation = language === 'ru' ? currentQuestion.explanation_ru : currentQuestion.explanation_es;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {mode === "exam" ? "Экзаменационный тест" : "Практический режим"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {displayTopic}
            </p>
          </div>
          {mode === "exam" && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border">
                <Clock className={`w-4 h-4 ${timeLeft < 300 ? "text-destructive" : "text-primary"}`} />
                <span className={`font-mono text-sm font-bold ${timeLeft < 300 ? "text-destructive" : ""}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold">{errorCount}/3</span>
              </div>
            </div>
          )}
        </div>

        {/* Question Navigation Grid */}
        <Card className="p-4 mb-6 gradient-card border-border/50">
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, idx) => {
              const answer = answers.find((a) => a.questionId === questions[idx].id);
              const isAnswered = answer !== undefined;
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => jumpToQuestion(idx)}
                  className={`
                    aspect-square rounded-lg font-semibold text-sm transition-all duration-300
                    ${isCurrent 
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" 
                      : "hover:scale-105"
                    }
                    ${!isAnswered 
                      ? "bg-muted text-muted-foreground border border-border" 
                      : answer.isCorrect
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50"
                        : "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-center h-full relative">
                    {idx + 1}
                    {isAnswered && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {answer.isCorrect ? (
                          <Check className="w-3 h-3 absolute top-0.5 right-0.5" />
                        ) : (
                          <X className="w-3 h-3 absolute top-0.5 right-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Progress value={progress} className="mb-6 h-2" />

        {/* Question Card */}
        <Card className="p-6 sm:p-8 gradient-card border-border/50 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                {displayTopic}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-relaxed">{displayQuestion}</h2>
          </div>

          <div className="space-y-3">
            {displayOptions.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === correctAnswer;
              const showResult = showExplanation && mode === "practice";

              return (
                <button
                  key={idx}
                  onClick={() => !showExplanation && setSelectedOption(option)}
                  disabled={showExplanation}
                  className={`
                    w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-300
                    ${showResult
                      ? isCorrect
                        ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                        : isSelected
                        ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
                        : "border-border/50 opacity-60"
                      : isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                      : "border-border/50 hover:border-primary/50 hover:bg-accent/5 hover:scale-[1.01]"
                    }
                    ${!showExplanation && "cursor-pointer"}
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex-1 text-sm sm:text-base leading-relaxed">{option}</span>
                    {showResult && isCorrect && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && displayExplanation && (
            <div className="mt-6 p-4 sm:p-5 rounded-xl bg-secondary/50 border border-secondary">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 shrink-0">
                  <span className="text-lg">💡</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-2 text-primary">Объяснение:</p>
                  <p className="text-sm leading-relaxed">{displayExplanation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {!showExplanation ? (
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedOption} 
                className="w-full h-12 text-base font-semibold shadow-lg"
                size="lg"
              >
                Ответить
              </Button>
            ) : (
              <Button 
                onClick={nextQuestion} 
                className="w-full h-12 text-base font-semibold shadow-lg"
                size="lg"
              >
                {currentIndex < questions.length - 1 ? "Следующий вопрос →" : "Завершить тест ✓"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default TestSession;
