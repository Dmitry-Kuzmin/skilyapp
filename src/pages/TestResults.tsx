import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, XCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";

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

const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, answers, mode, timeSpent } = location.state as {
    questions: Question[];
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 gradient-card border-border/50 text-center mb-6">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            passed ? "bg-green-500/20" : "bg-destructive/20"
          }`}>
            <Trophy className={`w-10 h-10 ${passed ? "text-green-500" : "text-destructive"}`} />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {passed ? "Тест пройден!" : "Тест не пройден"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {mode === "exam" ? "Экзаменационный режим" : "Практический режим"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-green-500">{correctCount}</p>
              <p className="text-sm text-muted-foreground">Правильных</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-destructive">{incorrectCount}</p>
              <p className="text-sm text-muted-foreground">Ошибок</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-primary">{percentage}%</p>
              <p className="text-sm text-muted-foreground">Точность</p>
            </div>
          </div>

          {mode === "exam" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Время: {formatTime(timeSpent)}</span>
            </div>
          )}
        </Card>

        {incorrectCount > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Разбор ошибок</h2>
            <div className="space-y-4">
              {answers.map((answer, idx) => {
                if (answer.isCorrect) return null;
                const question = questions.find((q) => q.id === answer.questionId);
                if (!question) return null;

                return (
                  <Card key={idx} className="p-6 gradient-card border-border/50">
                    <div className="flex items-start gap-3 mb-3">
                      <XCircle className="w-5 h-5 text-destructive mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">{question.topic_ru}</p>
                        <p className="font-semibold">{question.question_ru}</p>
                      </div>
                    </div>

                    <div className="ml-8 space-y-2">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-sm font-medium text-destructive mb-1">Твой ответ:</p>
                        <p className="text-sm">{answer.selectedAnswer}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm font-medium text-green-500 mb-1">Правильный ответ:</p>
                        <p className="text-sm">{question.correct_answer_ru}</p>
                      </div>

                      {question.explanation_ru && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-sm font-medium mb-1">Объяснение:</p>
                          <p className="text-sm text-muted-foreground">{question.explanation_ru}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <Button onClick={() => navigate("/tests")} variant="outline" className="flex-1">
            К списку тестов
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            Пройти ещё раз
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default TestResults;
