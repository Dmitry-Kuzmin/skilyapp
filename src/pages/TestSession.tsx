import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const TestSession = () => {
  const { mode, topic } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'ru' | 'es'>('es');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
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
      let query = supabase
        .from("questions_new")
        .select(`
          *,
          answer_options (*),
          topics (title_ru, title_es)
        `);

      if (mode === "exam") {
        const { data, error } = await query.limit(30);
        if (error) throw error;
        setQuestions(data?.sort(() => Math.random() - 0.5) || []);
      } else {
        if (topic) {
          query = query.eq("topic_id", topic);
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
    const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === selectedOption);
    const isCorrect = selectedAnswer?.is_correct || false;

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswerId: selectedOption,
      isCorrect,
    };

    setAnswers([...answers, newAnswer]);

    if (mode === "practice") {
      setShowExplanation(true);
      // Success/error animation
      if (isCorrect) {
        toast.success("Правильно! ✅", { duration: 2000 });
      } else {
        toast.error("Неправильно ❌", { duration: 2000 });
      }
    } else {
      const errorCount = [...answers, newAnswer].filter((a) => !a.isCorrect).length;
      if (errorCount >= 3) {
        toast.error("3 ошибки! Экзамен не сдан");
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
    setShowTranslation(false);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setShowTranslation(false);
    } else {
      finishTest();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setShowTranslation(false);
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
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопросы не найдены</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const errorCount = answers.filter((a) => !a.isCorrect).length;
  
  const getQuestionText = (lang: 'ru' | 'es'): string => {
    return lang === 'es' ? currentQuestion.question_es : currentQuestion.question_ru;
  };

  const displayQuestion = showTranslation 
    ? currentQuestion.question_es
    : currentQuestion.question_es;
  const displayTopic = currentQuestion.topics?.title_es || 'Sin tema';
  
  const getExplanation = (lang: 'ru' | 'es'): string | null => {
    return lang === 'es' ? currentQuestion.explanation_es : currentQuestion.explanation_ru;
  };
  
  const displayExplanation = getExplanation('es');
  
  const toggleTranslation = async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowTranslation(!showTranslation);
    setTimeout(() => setIsTransitioning(false), 150);
  };

  // Sort answer options by position
  const sortedOptions = [...currentQuestion.answer_options].sort((a, b) => a.position - b.position);

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl pb-20 md:pb-4">
        {/* Compact Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {mode === "exam" ? "Экзамен" : "Практика"}
            </h1>
            <Badge variant="outline" className="text-xs">
              {displayTopic}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {mode === "exam" && (
              <>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-card border text-xs">
                  <Clock className={`w-3 h-3 ${timeLeft < 300 ? "text-destructive" : "text-primary"}`} />
                  <span className={`font-mono font-bold ${timeLeft < 300 ? "text-destructive" : ""}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-card border text-xs">
                  <XCircle className="w-3 h-3 text-destructive" />
                  <span className="font-semibold">{errorCount}/3</span>
                </div>
              </>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
        </div>

        <Progress value={progress} className="mb-4 h-1.5" />

        {/* Compact Question Navigation - Scrollable on mobile */}
        <div className="mb-4 overflow-x-auto pb-2">
          <div className="flex gap-1.5 min-w-max">
            {questions.map((_, idx) => {
              const answer = answers.find((a) => a.questionId === questions[idx].id);
              const isAnswered = answer !== undefined;
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => jumpToQuestion(idx)}
                  className={`
                    w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-semibold text-xs transition-all duration-300 shrink-0
                    ${isCurrent 
                      ? "ring-2 ring-primary scale-110 shadow-lg shadow-primary/20" 
                      : "hover:scale-105"
                    }
                    ${!isAnswered 
                      ? "bg-muted/50 text-muted-foreground border border-border" 
                      : answer.isCorrect
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50"
                        : "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/50"
                    }
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-4 sm:p-6 gradient-card border-border/50 shadow-lg">
          {/* Question Image */}
          {currentQuestion.image_url && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border/50">
              <img 
                src={currentQuestion.image_url} 
                alt="Вопрос" 
                className="w-full max-h-64 object-contain bg-muted/30"
                loading="lazy"
              />
            </div>
          )}

          {/* Question Text */}
          <div className="mb-6">
            <h2 className={`text-lg sm:text-xl font-bold leading-relaxed whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
            </h2>
          </div>

          {/* Translation & Explanation Buttons (Practice Only) */}
          {mode === "practice" && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTranslation}
                className="text-xs"
              >
                <Languages className="w-3 h-3 mr-1" />
                {showTranslation ? "Español" : "Русский перевод"}
              </Button>
              {displayExplanation && !showExplanation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExplanation(true)}
                  className="text-xs"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Подсказка
                </Button>
              )}
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-2.5 mb-6">
            {sortedOptions.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrect = option.is_correct;
              const showResult = showExplanation && mode === "practice";
              const displayText = showTranslation ? option.text_ru : option.text_es;

              return (
                <button
                  key={option.id}
                  onClick={() => !showExplanation && setSelectedOption(option.id)}
                  disabled={showExplanation}
                  className={`
                    w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-300
                    ${showResult
                      ? isCorrect
                        ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 animate-fade-in"
                        : isSelected
                        ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20 animate-fade-in"
                        : "border-border/30 opacity-50"
                      : isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                      : "border-border/50 hover:border-primary/50 hover:bg-accent/5 hover:scale-[1.01]"
                    }
                    ${!showExplanation && "cursor-pointer"}
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`flex-1 text-sm sm:text-base transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                      {displayText}
                    </span>
                    {showResult && isCorrect && (
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 animate-scale-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/20 animate-scale-in">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es) && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-secondary animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-1 text-primary">
                    {showTranslation ? "Объяснение:" : "Explicación:"}
                  </p>
                  <p className={`text-sm leading-relaxed transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    {showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {currentIndex > 0 && mode === "practice" && (
              <Button 
                onClick={prevQuestion} 
                variant="outline"
                className="w-auto"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            )}
            {!showExplanation ? (
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedOption} 
                className="flex-1 font-semibold shadow-lg"
                size="lg"
              >
                Ответить
              </Button>
            ) : (
              <Button 
                onClick={nextQuestion} 
                className="flex-1 font-semibold shadow-lg"
                size="lg"
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    Далее
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  "Завершить ✓"
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default TestSession;
