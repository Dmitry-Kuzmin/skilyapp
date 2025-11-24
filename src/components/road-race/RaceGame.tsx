import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Fuel, Gauge, Trophy, Flame, Zap, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import type { Route, Question, GameStats } from "@/pages/games/RoadRace";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";

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

  // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для плавного обновления времени
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = Date.now();
    
    const updateTime = () => {
      const now = Date.now();
      // Обновляем только если прошло >= 500ms (уменьшаем частоту обновлений)
      if (now - lastUpdate >= 500) {
        setStats((prev) => ({
          ...prev,
          timeSpent: Math.floor((now - startTime) / 1000),
        }));
        lastUpdate = now;
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };
    
    animationFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrameId);
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

      // Load road signs (Spanish language)
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
              .select("name_es")
              .neq("id", sign.id)
              .limit(3);

            const options = [
              sign.name_es,
              ...(wrongSigns?.map((s) => s.name_es) || []),
            ];
            
            // Shuffle options
            const shuffled = options.sort(() => Math.random() - 0.5);
            const correctIndex = shuffled.indexOf(sign.name_es);

            allQuestions.push({
              id: sign.id,
              type: "sign",
              question: "¿Qué significa esta señal?",
              options: shuffled,
              correctAnswer: correctIndex,
              explanation: sign.description_es,
              image_url: sign.image_url,
            });
          }
        }
      }

      // Load terms (Spanish language)
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
              question: `¿Cómo se traduce "${term.term_es}"?`,
              options: shuffled,
              correctAnswer: correctIndex,
              explanation: term.description_es,
            });
          }
        }
      }

      // Load PDD questions with answer_options (Spanish language)
      if (numQuestions > 0) {
        const { data: pddQuestions } = await supabase
          .from("questions_new")
          .select(`
            *,
            answer_options (
              id,
              text_es,
              is_correct,
              position
            )
          `)
          .limit(numQuestions);

        if (pddQuestions) {
          for (const q of pddQuestions) {
            // Sort answer options by position
            const sortedOptions = (q.answer_options || [])
              .sort((a: any, b: any) => a.position - b.position);
            
            const correctIndex = sortedOptions.findIndex((opt: any) => opt.is_correct);
            
            allQuestions.push({
              id: q.id,
              type: "question",
              question: q.question_es,
              options: sortedOptions.map((opt: any) => opt.text_es),
              correctAnswer: correctIndex,
              explanation: q.explanation_es,
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
        title: "Error",
        description: "No se pudieron cargar las preguntas",
        variant: "destructive",
      });
      console.error("Error loading questions:", error);
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
          title: "¡Sin combustible!",
          description: "Juego terminado. ¡Sé más cuidadoso!",
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full mx-auto"
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-2xl font-bold">Preparando la ruta...</p>
            <p className="text-muted-foreground">Cargando preguntas</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (stats.distance / route.total_distance) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Gradient Background */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `linear-gradient(135deg, ${route.gradient_from}15 0%, ${route.gradient_to}15 100%)`,
        }}
      />

      {/* Animated Road Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div
          className="absolute inset-0 bg-repeat-y"
          style={{
            backgroundImage: "linear-gradient(180deg, transparent 48%, hsl(var(--foreground)) 49%, hsl(var(--foreground)) 51%, transparent 52%)",
            backgroundSize: "100% 60px",
            animation: `roadScroll ${2 / (stats.speed / 60)}s linear infinite`,
          }}
        />
      </div>

      {/* Speed Particles */}
      {stats.speed > 100 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                height: `${20 + Math.random() * 40}px`,
                background: `linear-gradient(180deg, ${route.gradient_from}80, transparent)`,
              }}
              animate={{
                y: ["0vh", "100vh"],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Top Bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onExit}
            className="bg-background/50 backdrop-blur-sm hover:bg-background/80"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <motion.div 
            className="flex items-center gap-3 bg-background/80 backdrop-blur-md px-6 py-3 rounded-full border border-primary/20 shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            <Trophy className="w-6 h-6 text-gold" />
            <span className="font-bold text-2xl bg-gradient-to-r from-gold to-warning bg-clip-text text-transparent">
              {stats.score}
            </span>
          </motion.div>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-background/80 backdrop-blur-md border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{stats.distance} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {Math.floor(stats.timeSpent / 60)}:{String(stats.timeSpent % 60).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-muted-foreground">{route.total_distance} km</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3"
                style={{
                  background: `linear-gradient(90deg, ${route.gradient_from}20, ${route.gradient_to}20)`,
                }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-3 gap-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 bg-background/80 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Gauge className="w-5 h-5" />
                <p className="text-xs font-medium">Velocidad</p>
              </div>
              <p className="text-2xl font-bold">{stats.speed}</p>
              <p className="text-xs text-muted-foreground">km/h</p>
            </div>
          </Card>

          <Card className="p-4 bg-background/80 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Fuel className={`w-5 h-5 ${stats.fuel < 30 ? 'text-destructive' : 'text-success'}`} />
                <p className="text-xs font-medium">Combustible</p>
              </div>
              <p className="text-2xl font-bold">{stats.fuel}</p>
              <p className="text-xs text-muted-foreground">%</p>
            </div>
          </Card>

          <Card className="p-4 bg-background/80 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-warning">
                <Flame className="w-5 h-5" />
                <p className="text-xs font-medium">Combo</p>
              </div>
              <p className="text-2xl font-bold">x{stats.combo}</p>
              <p className="text-xs text-muted-foreground">racha</p>
            </div>
          </Card>
        </motion.div>

        {/* Question Card - Premium Design */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 md:p-8 bg-background/90 backdrop-blur-xl border-primary/30 shadow-2xl">
              <div className="space-y-6">
                {/* Question Image */}
                {currentQuestion.image_url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-xl overflow-hidden bg-muted/20 p-4"
                  >
                    <img
                      src={getImageUrl(currentQuestion.image_url) || currentQuestion.image_url}
                      alt="Pregunta"
                      className="w-full max-h-64 object-contain mx-auto"
                    />
                  </motion.div>
                )}

                {/* Question Text */}
                <motion.h2 
                  className="text-xl md:text-2xl font-bold text-center leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {currentQuestion.question}
                </motion.h2>

                {/* Answer Options */}
                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const isSelected = index === selectedAnswer;
                    const showResult = showFeedback;
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.05 }}
                      >
                        <Button
                          variant="outline"
                          className={`w-full h-auto py-4 px-6 text-left justify-start text-base md:text-lg transition-all ${
                            showResult && isCorrect
                              ? "bg-success/20 border-success text-success font-semibold"
                              : showResult && isSelected && !isCorrect
                              ? "bg-destructive/20 border-destructive text-destructive"
                              : "hover:bg-primary/10 hover:border-primary/50"
                          }`}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showFeedback}
                        >
                          <span className="flex items-center gap-3 w-full">
                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                              showResult && isCorrect
                                ? "bg-success text-success-foreground border-success"
                                : showResult && isSelected && !isCorrect
                                ? "bg-destructive text-destructive-foreground border-destructive"
                                : "bg-muted border-muted-foreground/20"
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showResult && isCorrect && (
                              <Zap className="w-5 h-5 text-success" />
                            )}
                          </span>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showFeedback && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-5 bg-primary/10 border border-primary/20 rounded-xl"
                  >
                    <p className="text-sm md:text-base leading-relaxed">
                      <span className="font-semibold text-primary">Explicación: </span>
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Combo Effect */}
      {stats.combo >= 3 && (
        <motion.div
          className="fixed top-1/4 left-1/2 -translate-x-1/2 pointer-events-none z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-6xl"
            >
              🔥
            </motion.div>
            <p className="text-3xl font-bold text-warning">
              ¡x{stats.combo} COMBO!
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};