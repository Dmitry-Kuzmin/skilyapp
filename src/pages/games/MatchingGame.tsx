import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Puzzle, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MatchPair {
  id: string;
  spanish: string;
  russian: string;
  matched: boolean;
}

const MatchingGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [selectedSpanish, setSelectedSpanish] = useState<string | null>(null);
  const [selectedRussian, setSelectedRussian] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (selectedSpanish && selectedRussian) {
      checkMatch();
    }
  }, [selectedSpanish, selectedRussian]);

  const loadTerms = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .limit(6);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить вопросы",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length >= 4) {
      const gamePairs = data.slice(0, 6).map((q) => ({
        id: q.id,
        spanish: q.question_es,
        russian: q.correct_answer_ru,
        matched: false,
      }));
      setPairs(gamePairs);
    } else {
      toast({
        title: "Нет данных",
        description: "Недостаточно вопросов для игры (минимум 4)",
        variant: "destructive",
      });
    }
  };

  const startGame = () => {
    setIsGameActive(true);
    setScore(0);
    setAttempts(0);
    setIsGameOver(false);
    setStartTime(Date.now());
    setPairs(pairs.map(p => ({ ...p, matched: false })));
    setSelectedSpanish(null);
    setSelectedRussian(null);
  };

  const checkMatch = () => {
    const spanishPair = pairs.find(p => p.id === selectedSpanish);
    const russianPair = pairs.find(p => p.id === selectedRussian);

    setAttempts(attempts + 1);

    if (spanishPair && russianPair && spanishPair.id === russianPair.id) {
      // Correct match
      setPairs(pairs.map(p => 
        p.id === selectedSpanish ? { ...p, matched: true } : p
      ));
      setScore(score + 1);
      toast({
        title: "Правильно! ✓",
        description: `${spanishPair.spanish} = ${spanishPair.russian}`,
      });

      // Check if game is over
      if (score + 1 === pairs.length) {
        endGame();
      }
    } else {
      toast({
        title: "Неправильно ✗",
        description: "Попробуйте другую пару",
        variant: "destructive",
      });
    }

    setSelectedSpanish(null);
    setSelectedRussian(null);
  };

  const endGame = async () => {
    setIsGameActive(false);
    setIsGameOver(true);

    const duration = Math.floor((Date.now() - startTime) / 1000);

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
          game_type: "matching",
          score: Math.min(Math.max(0, score + 1), 100), // Ensure 0-100 range
          total_questions: Math.min(Math.max(1, pairs.length), 100), // Ensure 1-100 range
          duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
        };

        const { error } = await supabase.from("game_sessions").insert(sessionData);

        if (error) {
          console.error("Failed to save game session:", error);
        }
      }
    }
  };

  const shuffledSpanish = [...pairs].sort(() => Math.random() - 0.5);
  const shuffledRussian = [...pairs].sort(() => Math.random() - 0.5);
  const progress = pairs.length > 0 ? (score / pairs.length) * 100 : 0;

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
            <Puzzle className="w-10 h-10 text-primary" />
            Сопоставление
          </h1>
          <p className="text-muted-foreground text-lg">
            Соедини испанские термины с русскими переводами
          </p>
        </div>

        {!isGameActive && !isGameOver && (
          <Card className="p-8 gradient-card text-center space-y-4">
            <Puzzle className="w-16 h-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Готовы начать?</h2>
            <p className="text-muted-foreground">
              Выберите испанское слово, затем его русский перевод
            </p>
            <Button size="lg" onClick={startGame} disabled={pairs.length < 4}>
              Начать игру
            </Button>
          </Card>
        )}

        {isGameActive && (
          <div className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-bold">
                  Попыток: {attempts}
                </div>
                <div className="text-lg font-bold text-primary">
                  🏆 {score} / {pairs.length}
                </div>
              </div>
              <Progress value={progress} />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-center font-bold text-lg">Испанский</h3>
                {shuffledSpanish.map((pair) => (
                  <Button
                    key={`spanish-${pair.id}`}
                    onClick={() => !pair.matched && setSelectedSpanish(pair.id)}
                    disabled={pair.matched}
                    variant={selectedSpanish === pair.id ? "default" : "outline"}
                    className={cn(
                      "w-full text-lg h-auto py-4",
                      pair.matched && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {pair.matched ? "✓ " : ""}{pair.spanish}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-center font-bold text-lg">Русский</h3>
                {shuffledRussian.map((pair) => (
                  <Button
                    key={`russian-${pair.id}`}
                    onClick={() => !pair.matched && setSelectedRussian(pair.id)}
                    disabled={pair.matched}
                    variant={selectedRussian === pair.id ? "default" : "outline"}
                    className={cn(
                      "w-full text-lg h-auto py-4",
                      pair.matched && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {pair.matched ? "✓ " : ""}{pair.russian}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isGameOver && (
          <Card className="p-8 gradient-card text-center space-y-6">
            <Trophy className="w-20 h-20 mx-auto text-gold" />
            <h2 className="text-3xl font-bold">Поздравляем!</h2>
            <div className="space-y-2">
              <p className="text-xl">
                Все пары найдены за <span className="font-bold text-primary">{attempts}</span> попыток
              </p>
              <p className="text-lg text-muted-foreground">
                Точность: {((pairs.length / attempts) * 100).toFixed(0)}%
              </p>
            </div>
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

export default MatchingGame;