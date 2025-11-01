import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const RaceGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [terms, setTerms] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isGameActive]);

  const loadTerms = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .limit(50);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить вопросы",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      // Shuffle questions and create simple term pairs
      const termPairs = data.map(q => ({
        id: q.id,
        spanish: q.question_es,
        russian: q.correct_answer_ru,
      }));
      const shuffled = [...termPairs].sort(() => Math.random() - 0.5);
      setTerms(shuffled);
    } else {
      toast({
        title: "Нет данных",
        description: "В базе нет вопросов для игры",
        variant: "destructive",
      });
    }
  };

  const startGame = () => {
    setIsGameActive(true);
    setScore(0);
    setCurrentIndex(0);
    setTimeLeft(60);
    setIsGameOver(false);
    setUserAnswer("");
  };

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;

    const currentTerm = terms[currentIndex];
    const isCorrect = userAnswer.toLowerCase().trim() === currentTerm.russian.toLowerCase().trim();

    if (isCorrect) {
      setScore(score + 1);
      toast({
        title: "Правильно! ✓",
        description: `+1 балл`,
      });
    } else {
      toast({
        title: "Неправильно ✗",
        description: `Правильный ответ: ${currentTerm.russian}`,
        variant: "destructive",
      });
    }

    setUserAnswer("");
    
    if (currentIndex < terms.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    setIsGameActive(false);
    setIsGameOver(true);

    // Save game session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const sessionData = {
          user_id: profile.id,
          game_type: "race",
          score: Math.min(Math.max(0, score), 100), // Ensure 0-100 range
          total_questions: Math.min(Math.max(1, currentIndex + 1), 100), // Ensure 1-100 range
          duration_seconds: Math.min(Math.max(0, 60 - timeLeft), 7200), // Ensure 0-7200 range
        };

        const { error } = await supabase.from("game_sessions").insert(sessionData);

        if (error) {
          console.error("Failed to save game session:", error);
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isGameActive) {
      checkAnswer();
    }
  };

  const currentTerm = terms[currentIndex];
  const progress = terms.length > 0 ? ((currentIndex + 1) / terms.length) * 100 : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Zap className="w-10 h-10 text-secondary" />
            Гонка
          </h1>
          <p className="text-muted-foreground text-lg">
            Переведи максимум слов за 60 секунд!
          </p>
        </div>

        {!isGameActive && !isGameOver && (
          <Card className="p-8 gradient-card text-center space-y-4">
            <Zap className="w-16 h-16 mx-auto text-secondary" />
            <h2 className="text-2xl font-bold">Готовы к гонке?</h2>
            <p className="text-muted-foreground">
              У вас будет 60 секунд, чтобы перевести как можно больше слов с испанского на русский
            </p>
            <Button size="lg" onClick={startGame} disabled={terms.length === 0}>
              Начать игру
            </Button>
          </Card>
        )}

        {isGameActive && currentTerm && (
          <div className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex justify-between items-center mb-4">
                <div className="text-2xl font-bold text-secondary">
                  ⏱️ {timeLeft}с
                </div>
                <div className="text-2xl font-bold text-primary">
                  🏆 {score} баллов
                </div>
              </div>
              <Progress value={progress} className="mb-4" />
              <div className="text-center text-sm text-muted-foreground">
                Слово {currentIndex + 1} из {terms.length}
              </div>
            </Card>

            <Card className="p-8 gradient-card space-y-6">
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">Переведите на русский:</div>
                <div className="text-4xl font-bold text-primary">
                  {currentTerm.spanish}
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите перевод..."
                  className="text-lg text-center"
                  autoFocus
                />
                <Button onClick={checkAnswer} className="w-full" size="lg">
                  Ответить
                </Button>
              </div>
            </Card>
          </div>
        )}

        {isGameOver && (
          <Card className="p-8 gradient-card text-center space-y-6">
            <Trophy className="w-20 h-20 mx-auto text-gold" />
            <h2 className="text-3xl font-bold">Игра окончена!</h2>
            <div className="text-6xl font-bold text-primary">{score}</div>
            <p className="text-xl text-muted-foreground">
              Вы правильно перевели {score} из {currentIndex + 1} слов
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} size="lg">
                Играть снова
              </Button>
              <Button variant="outline" onClick={() => navigate("/games")} size="lg">
                К играм
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default RaceGame;