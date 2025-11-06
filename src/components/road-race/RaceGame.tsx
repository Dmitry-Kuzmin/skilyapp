import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Fuel, Gauge, Trophy, Flame, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import type { Route, Question, GameStats } from "@/pages/games/RoadRace";
import { motion, AnimatePresence } from "framer-motion";

interface RaceGameProps {
  route: Route;
  stats: GameStats;
  onCheckpoint: (stats: GameStats) => void;
  onFinish: (stats: GameStats) => void;
  onExit: () => void;
}

export const RaceGame = ({ route, stats: initialStats, onCheckpoint, onFinish, onExit }: RaceGameProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        timeSpent: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const loadQuestions = async () => {
    try {
      const totalQuestions = Math.floor(route.total_distance / 1); // 1 question = 1 km
      const mix = route.question_mix;

      // Calculate how many of each type
      const numSigns = Math.floor((totalQuestions * mix.signs) / 100);
      const numTerms = Math.floor((totalQuestions * mix.terms) / 100);
      const numQuestions = totalQuestions - numSigns - numTerms;

      const allQuestions: Question[] = [];

      // Load road signs
      if (numSigns > 0) {
        const { data: signs } = await supabase
          .from("road_signs")
          .select("*")
          .limit(numSigns);

        if (signs) {
          for (const sign of signs) {
            // Get 3 random wrong answers
            const { data: wrongSigns } = await supabase
              .from("road_signs")
              .select("name_ru")
              .neq("id", sign.id)
              .limit(3);

            const options = [
              sign.name_ru,
              ...(wrongSigns?.map((s) => s.name_ru) || []),
            ];
            
            // Shuffle options
            const shuffled = options.sort(() => Math.random() - 0.5);
            const correctIndex = shuffled.indexOf(sign.name_ru);

            allQuestions.push({
              id: sign.id,
              type: "sign",
              question: "Что означает этот знак?",
              options: shuffled,
              correctAnswer: correctIndex,
              explanation: sign.description_ru,
              image_url: sign.image_url,
            });
          }
        }
      }

      // Load terms
      if (numTerms > 0) {
        const { data: terms } = await supabase
          .from("language_terms")
          .select("*")
          .limit(numTerms);

        if (terms) {
          for (const term of terms) {
            const { data: wrongTerms } = await supabase
              .from("language_terms")
              .select("term_ru")
              .neq("id", term.id)
              .limit(3);

            const options = [
              term.term_ru,
              ...(wrongTerms?.map((t) => t.term_ru) || []),
            ];
            
            const shuffled = options.sort(() => Math.random() - 0.5);
            const correctIndex = shuffled.indexOf(term.term_ru);

            allQuestions.push({
              id: term.id,
              type: "term",
              question: `Как переводится "${term.term_es}"?`,
              options: shuffled,
              correctAnswer: correctIndex,
              explanation: term.description_ru,
            });
          }
        }
      }

      // Load PDD questions
      if (numQuestions > 0) {
        const { data: pddQuestions } = await supabase
          .from("questions_new")
          .select("*")
          .limit(numQuestions);

        if (pddQuestions) {
          // For now, using placeholder options until we restore answer_options
          for (const q of pddQuestions) {
            allQuestions.push({
              id: q.id,
              type: "question",
              question: q.question_ru,
              options: ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
              correctAnswer: 0,
              explanation: q.explanation_ru,
              image_url: q.image_url,
            });
          }
        }
      }

      // Shuffle all questions
      setQuestions(allQuestions.sort(() => Math.random() - 0.5));
      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить вопросы",
        variant: "destructive",
      });
    }
  };

  const calculateSpeed = useCallback((combo: number, isCorrect: boolean) => {
    if (!isCorrect) return Math.max(30, stats.speed - 20);
    
    const baseSpeed = 60;
    const comboBonus = combo * 5;
    return Math.min(150, baseSpeed + comboBonus);
  }, [stats.speed]);

  const calculateFuel = useCallback((isCorrect: boolean, currentFuel: number) => {
    if (isCorrect) {
      return Math.min(100, currentFuel + 5);
    }
    return Math.max(0, currentFuel - 15);
  }, []);

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;

    setSelectedAnswer(index);
    setShowFeedback(true);

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = index === currentQuestion.correctAnswer;

    if (isCorrect) {
      sounds.correctAnswer();
      haptics.correctAnswer();
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
    }

    const newCombo = isCorrect ? stats.combo + 1 : 0;
    const newSpeed = calculateSpeed(newCombo, isCorrect);
    const newFuel = calculateFuel(isCorrect, stats.fuel);
    const scoreGain = isCorrect ? 100 + (newCombo * 20) : 0;

    const newStats: GameStats = {
      ...stats,
      distance: stats.distance + 1,
      score: stats.score + scoreGain,
      speed: newSpeed,
      fuel: newFuel,
      combo: newCombo,
      correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
      incorrectAnswers: stats.incorrectAnswers + (isCorrect ? 0 : 1),
      maxSpeed: Math.max(stats.maxSpeed, newSpeed),
    };

    setTimeout(() => {
      setStats(newStats);

      // Check if reached checkpoint
      if (newStats.distance % route.checkpoint_interval === 0 && newStats.distance < route.total_distance) {
        const updatedStats = {
          ...newStats,
          checkpointsReached: newStats.checkpointsReached + 1,
        };
        onCheckpoint(updatedStats);
        return;
      }

      // Check if finished
      if (newStats.distance >= route.total_distance) {
        onFinish(newStats);
        return;
      }

      // Check if out of fuel
      if (newFuel <= 0) {
        toast({
          title: "Топливо закончилось!",
          description: "Игра окончена. Будь внимательнее!",
          variant: "destructive",
        });
        onFinish(newStats);
        return;
      }

      // Next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }, 1500);
  };

  if (loading || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка маршрута...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (stats.distance / route.total_distance) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
      {/* Animated Road Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="absolute inset-0 bg-repeat-y animate-roadScroll"
          style={{
            backgroundImage: "linear-gradient(180deg, transparent 48%, hsl(var(--primary)) 49%, hsl(var(--primary)) 51%, transparent 52%)",
            backgroundSize: "100% 40px",
            animationDuration: `${2 / (stats.speed / 60)}s`,
          }}
        />
      </div>

      {/* HUD */}
      <div className="relative z-10 p-4 space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              <Trophy className="w-5 h-5 text-gold" />
              <span className="font-bold">{stats.score}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="p-4 gradient-card">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{stats.distance} км</span>
              <span>{route.total_distance} км</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3 gradient-card">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Скорость</p>
                <p className="text-lg font-bold">{stats.speed} км/ч</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 gradient-card">
            <div className="flex items-center gap-2">
              <Fuel className={`w-5 h-5 ${stats.fuel < 30 ? 'text-destructive' : 'text-success'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Топливо</p>
                <p className="text-lg font-bold">{stats.fuel}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 gradient-card">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Комбо</p>
                <p className="text-lg font-bold">x{stats.combo}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Question Card */}
        <Card className="p-6 gradient-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="w-full max-h-48 object-contain rounded-lg"
                />
              )}

              <h2 className="text-xl font-bold text-center">
                {currentQuestion.question}
              </h2>

              <div className="grid gap-3">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={
                      showFeedback
                        ? index === currentQuestion.correctAnswer
                          ? "default"
                          : index === selectedAnswer
                          ? "destructive"
                          : "outline"
                        : "outline"
                    }
                    className={`w-full text-left justify-start h-auto py-4 px-6 ${
                      showFeedback && index === currentQuestion.correctAnswer
                        ? "ring-2 ring-success"
                        : ""
                    }`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                  >
                    {option}
                  </Button>
                ))}
              </div>

              {showFeedback && currentQuestion.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-muted rounded-lg"
                >
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      {/* Speed Effects */}
      {stats.speed > 120 && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-20 bg-gradient-to-b from-primary/50 to-transparent animate-speedLine"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
