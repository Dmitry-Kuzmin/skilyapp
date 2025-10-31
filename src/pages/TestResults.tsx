import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";

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
  
  // Check if location.state exists
  if (!location.state) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Нет данных о результатах теста</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
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

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const percentage = Math.round((correctCount / questions.length) * 100);
  const passed = mode === "exam" ? percentage >= 90 && incorrectCount <= 3 : true;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            {passed ? "🎉 Тест пройден!" : "😔 Тест не пройден"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {mode === "exam" ? "Экзаменационный режим" : "Практический режим"}
          </p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-500">{correctCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Правильных</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-red-500">{incorrectCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Ошибок</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{percentage}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Точность</p>
            </div>
          </div>

          {mode === "exam" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Время: {formatTime(timeSpent)}</span>
            </div>
          )}
        </Card>

        {incorrectCount > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Разбор ошибок</h2>
            <div className="space-y-4">
              {answers.map((answer, idx) => {
                if (answer.isCorrect) return null;
                const question = questions.find((q) => q.id === answer.questionId);
                if (!question) return null;

                // Find selected and correct answers
                const selectedAnswer = question.answer_options.find(opt => opt.id === answer.selectedAnswerId);
                const correctAnswer = question.answer_options.find(opt => opt.is_correct);

                return (
                  <Card key={idx} className="p-4 sm:p-6 gradient-card border-border/50 animate-fade-in">
                    <div className="flex items-start gap-3 mb-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                          {question.topics?.title_ru || 'Без темы'}
                        </p>
                        <p className="font-semibold text-sm sm:text-base">{question.question_ru}</p>
                      </div>
                    </div>

                    {question.image_url && (
                      <div className="mb-4 rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={question.image_url} 
                          alt="Вопрос" 
                          className="w-full max-h-48 object-contain bg-muted/30"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="ml-0 sm:ml-8 space-y-3">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                          ❌ Твой ответ:
                        </p>
                        <p className="text-sm">{selectedAnswer?.text_ru}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                          ✅ Правильный ответ:
                        </p>
                        <p className="text-sm">{correctAnswer?.text_ru}</p>
                      </div>

                      {question.explanation_ru && (
                        <div className="p-3 rounded-lg bg-secondary/50 border border-secondary">
                          <p className="text-xs sm:text-sm font-medium mb-1">💡 Объяснение:</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {question.explanation_ru}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={() => navigate("/tests")} 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            ← К списку тестов
          </Button>
          <Button 
            onClick={() => navigate(`/test/${mode}`)} 
            className="flex-1"
            size="lg"
          >
            Пройти ещё раз 🔄
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default TestResults;
