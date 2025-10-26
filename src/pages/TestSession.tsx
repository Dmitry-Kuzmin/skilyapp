import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Question = {
  id: string;
  question_ru: string;
  options_ru: string[];
  correct_answer_ru: string;
  explanation_ru: string | null;
  topic_ru: string;
};

type Answer = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
};

const TestSession = () => {
  const { mode, topic } = useParams();
  const navigate = useNavigate();
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
    const isCorrect = selectedOption === currentQuestion.correct_answer_ru;

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "exam" ? "Экзаменационный тест" : "Практический режим"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Вопрос {currentIndex + 1} из {questions.length}
            </p>
          </div>
          {mode === "exam" && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${timeLeft < 300 ? "text-destructive" : ""}`} />
                <span className={timeLeft < 300 ? "text-destructive font-bold" : ""}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <span>{errorCount}/3</span>
              </div>
            </div>
          )}
        </div>

        <Progress value={progress} className="mb-6" />

        <Card className="p-6 gradient-card border-border/50">
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">{currentQuestion.topic_ru}</span>
            <h2 className="text-xl font-semibold mt-2">{currentQuestion.question_ru}</h2>
          </div>

          <div className="space-y-3">
            {currentQuestion.options_ru.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQuestion.correct_answer_ru;
              const showResult = showExplanation && mode === "practice";

              return (
                <button
                  key={idx}
                  onClick={() => !showExplanation && setSelectedOption(option)}
                  disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-500/10"
                        : isSelected
                        ? "border-red-500 bg-red-500/10"
                        : "border-border"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && currentQuestion.explanation_ru && (
            <div className="mt-4 p-4 rounded-lg bg-secondary/50">
              <p className="text-sm font-semibold mb-2">Объяснение:</p>
              <p className="text-sm">{currentQuestion.explanation_ru}</p>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {!showExplanation ? (
              <Button onClick={handleAnswer} disabled={!selectedOption} className="w-full">
                Ответить
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="w-full">
                {currentIndex < questions.length - 1 ? "Следующий вопрос" : "Завершить тест"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default TestSession;
