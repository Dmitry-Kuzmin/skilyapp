import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Star, ArrowLeft, RotateCcw, Target, Award, TrendingUp, Sparkles, Shield, Check, X, HelpCircle, SkipForward, Timer } from "lucide-react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";
import { BoostButton } from "@/components/duel/BoostButton";
import { getImageUrl } from "@/utils/imageUtils";
import { useRoadSigns } from "@/hooks/useRoadSigns";
import { useBoostInventory } from "@/hooks/useBoostInventory";

interface RoadSign {
  id: string;
  name_ru: string;
  name_es: string;
  description_ru: string;
  description_es: string;
  image_url: string | null;
  sign_number: string | null;
  sign_type: string;
}

interface GameQuestion {
  sign: RoadSign;
  options: RoadSign[];
  correctAnswer: RoadSign;
}

type GameMode = "beginner" | "expert";
type GameState = "menu" | "playing" | "finished";

const QUESTIONS_COUNT = 15;
const TIME_PER_QUESTION_EXPERT = 15;
const POINTS_CORRECT = 100;
const POINTS_SPEED_BONUS = 50;

export default function GuessTheSign() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profileId } = useUserContext();

  const [gameState, setGameState] = useState<GameState>("menu");
  const [gameMode, setGameMode] = useState<GameMode>("beginner");
  const [allSigns, setAllSigns] = useState<RoadSign[]>([]);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_EXPERT);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [wrongAnswerIds, setWrongAnswerIds] = useState<Set<string>>(new Set());
  const [correctAnswerIds, setCorrectAnswerIds] = useState<Set<string>>(new Set());

  // Boosters
  const [boosts, setBoosts] = useState<{ [key: string]: number }>({
    fifty_fifty: 0,
    time_extend: 0,
    hint: 0,
    skip: 0,
  });
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState<string>("");

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / QUESTIONS_COUNT) * 100;

  // ОПТИМИЗАЦИЯ: Используем React Query хук для загрузки знаков с кэшированием
  const { data: roadSignsData, isLoading: signsLoading } = useRoadSigns();

  useEffect(() => {
    if (roadSignsData && roadSignsData.length > 0) {
      setAllSigns(roadSignsData);
      setLoading(false);
    } else if (!signsLoading && roadSignsData && roadSignsData.length === 0) {
      toast.error("Знаки не найдены в базе данных");
      setLoading(false);
    } else if (signsLoading) {
      setLoading(true);
    }
  }, [roadSignsData, signsLoading]);

  // ОПТИМИЗАЦИЯ: Используем React Query хук для загрузки бустов с кэшированием
  const { data: boostInventory } = useBoostInventory();

  useEffect(() => {
    if (boostInventory) {
      setBoosts(boostInventory);
    }
  }, [boostInventory]);

  // Timer for expert mode
  useEffect(() => {
    if (gameState !== "playing" || gameMode === "beginner" || isAnswerRevealed) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode, timeLeft, isAnswerRevealed]);

  const generateQuestions = useCallback(() => {
    if (allSigns.length < 4) {
      toast.error("Недостаточно знаков для игры");
      return [];
    }

    const shuffled = [...allSigns].sort(() => Math.random() - 0.5);
    const selectedSigns = shuffled.slice(0, Math.min(QUESTIONS_COUNT, allSigns.length));

    return selectedSigns.map((sign) => {
      const wrongOptions = allSigns
        .filter((s) => s.id !== sign.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [sign, ...wrongOptions].sort(() => Math.random() - 0.5);

      return {
        sign,
        options,
        correctAnswer: sign,
      };
    });
  }, [allSigns]);

  const startGame = (mode: GameMode) => {
    const newQuestions = generateQuestions();
    if (newQuestions.length === 0) return;

    setGameMode(mode);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCorrectAnswers(0);
    setTimeLeft(TIME_PER_QUESTION_EXPERT);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setWrongAnswerIds(new Set());
    setCorrectAnswerIds(new Set());
    setUsedBoosts([]);
    setHiddenOptions([]);
    setShowHint(false);
    setHintText("");
    setGameState("playing");
    sounds.countdownFinish();
    haptics.buttonClick();
  };

  const handleTimeout = () => {
    setIsAnswerRevealed(true);
    sounds.wrongAnswer();
    haptics.wrongAnswer();
    toast.error("¡Tiempo agotado!");

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleAnswerSelect = (optionId: string) => {
    if (isAnswerRevealed || selectedOption) return;

    setSelectedOption(optionId);
    setIsAnswerRevealed(true);

    const isCorrect = optionId === currentQuestion.correctAnswer.id;

    // Визуальные эффекты
    if (isCorrect) {
      setCorrectAnswerIds(new Set([optionId]));
      setTimeout(() => setCorrectAnswerIds(new Set()), 1000);
    } else {
      setWrongAnswerIds(new Set([optionId]));
      setTimeout(() => setWrongAnswerIds(new Set()), 1000);
    }

    if (isCorrect) {
      let points = POINTS_CORRECT;

      // Speed bonus for expert mode
      if (gameMode === "expert" && timeLeft > TIME_PER_QUESTION_EXPERT / 2) {
        points += POINTS_SPEED_BONUS;
      }

      setScore((prev) => prev + points);
      setCorrectAnswers((prev) => prev + 1);
      sounds.correctAnswer();
      haptics.correctAnswer();
      toast.success(`¡Correcto! +${points} puntos`);
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      toast.error("Incorrecto");
    }

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleUseBoost = async (type: string) => {
    if (usedBoosts.includes(type) || isAnswerRevealed || !profileId) return;

    if (boosts[type] <= 0) {
      toast.error("У вас нет этого бустера");
      return;
    }

    try {
      // Use boost via RPC function
      const { data, error } = await supabase.rpc('modify_boost_inventory', {
        p_user_id: profileId,
        p_boost_type: type,
        p_change: -1
      });

      if (error) throw error;

      // Apply boost effects
      if (type === 'fifty_fifty') {
        const wrongOptions = currentQuestion.options
          .filter(opt => opt.id !== currentQuestion.correctAnswer.id)
          .slice(0, 2)
          .map(opt => opt.id);
        setHiddenOptions(wrongOptions);
        sounds.boostFiftyFifty();
        haptics.boostActivated();
        toast.success('⚡ 50/50: Dos opciones eliminadas!', { duration: 3000 });
      } else if (type === 'time_extend' && gameMode === 'expert') {
        setTimeLeft(prev => Math.min(prev + 30, 60));
        sounds.boostTimeExtend();
        haptics.boostActivated();
        toast.success('⏱️ +30 segundos añadidos!', { duration: 3000 });
      } else if (type === 'hint') {
        setHintText(currentQuestion.sign.description_es);
        setShowHint(true);
        sounds.boostHint();
        haptics.boostActivated();
        toast.success('💡 Pista abierta!', { duration: 3000 });
      } else if (type === 'skip') {
        sounds.boostSkip();
        haptics.boostActivated();
        toast.success('⏭️ Pregunta saltada!', { duration: 2000 });
        setTimeout(() => {
          nextQuestion();
        }, 1000);
        return; // Don't add to usedBoosts since we're moving to next question
      }

      setUsedBoosts(prev => [...prev, type]);
      setBoosts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    } catch (error: any) {
      toast.error(error.message || 'Error al usar el boost', { duration: 4000 });
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(TIME_PER_QUESTION_EXPERT);
      setWrongAnswerIds(new Set());
      setCorrectAnswerIds(new Set());
      setUsedBoosts([]);
      setHiddenOptions([]);
      setShowHint(false);
      setHintText("");
    }
  };

  const finishGame = async () => {
    setGameState("finished");
    const accuracy = Math.round((correctAnswers / questions.length) * 100);

    if (accuracy >= 80) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    sounds.victory();
    haptics.victory();

    // Save session to database
    if (profileId) {
      const { error } = await supabase.from("game_sessions").insert({
        game_type: "guess_sign",
        mode: gameMode,
        score,
        total_questions: questions.length,
        correct_answers: correctAnswers,
        duration_seconds: 0,
      });

      if (error) console.error("Error saving game session:", error);
    }
  };

  const restartGame = () => {
    setGameState("menu");
    setShowConfetti(false);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (gameState === "menu") {
    return (
      <Layout>
        <div className="min-h-screen bg-transparent py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mb-6 shadow-lg"
              >
                <Shield className="w-12 h-12 text-primary-foreground" />
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                Угадай Знак
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Проверь свои знания дорожных знаков в премиум игре с красивым дизайном
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-8 gradient-card border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => startGame("beginner")}
                >
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
                      <Star className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-2xl font-bold">Режим Новичка</h3>
                    <p className="text-muted-foreground">
                      Изучай знаки в своем темпе без ограничений по времени
                    </p>
                    <Badge className="bg-success/20 text-success border-success/30">
                      Без таймера
                    </Badge>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-8 gradient-card border-secondary/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => startGame("expert")}
                >
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-4">
                      <Zap className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-2xl font-bold">Режим Эксперта</h3>
                    <p className="text-muted-foreground">
                      Проверь свои навыки с ограничением по времени и бонусами за скорость
                    </p>
                    <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                      С таймером
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8"
            >
              <Button
                onClick={() => navigate("/games")}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к играм
              </Button>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  if (gameState === "finished") {
    const accuracy = Math.round((correctAnswers / questions.length) * 100);
    const isPerfect = accuracy === 100;
    const isExcellent = accuracy >= 80;

    return (
      <Layout>
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
          />
        )}
        <div className="min-h-screen bg-transparent py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary mb-8 shadow-2xl"
              >
                <Trophy className="w-16 h-16 text-primary-foreground" />
              </motion.div>

              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                Игра завершена!
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-6 text-center gradient-card border-primary/30">
                    <div className="text-4xl font-bold text-primary mb-2">{score}</div>
                    <div className="text-sm text-muted-foreground">Очки</div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-6 text-center gradient-card border-success/30">
                    <div className="text-4xl font-bold text-success mb-2">{accuracy}%</div>
                    <div className="text-sm text-muted-foreground">Точность</div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="p-6 text-center gradient-card border-primary/30">
                    <div className="text-4xl font-bold text-primary mb-2">{correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Правильно</div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="p-6 text-center gradient-card border-muted/30">
                    <div className="text-4xl font-bold text-foreground mb-2">{questions.length - correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Ошибок</div>
                  </Card>
                </motion.div>
              </div>

              {(isPerfect || isExcellent) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8"
                >
                  <Card className="p-6 gradient-card border-success/30 bg-success/10">
                    <div className="flex items-center justify-center gap-3">
                      <Award className="w-8 h-8 text-success" />
                      <span className="text-xl font-bold text-success">
                        {isPerfect ? "Идеальный результат! 🎉" : "Отличный результат! ⭐"}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  onClick={restartGame}
                  className="flex-1 h-14 text-lg gradient-primary shadow-lg hover:shadow-xl transition-all"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Играть ещё
                </Button>

                <Button
                  onClick={() => navigate("/games")}
                  variant="outline"
                  className="flex-1 h-14 text-lg"
                >
                  Другие игры
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  // Playing state
  return (
    <Layout>
      <div className="min-h-screen bg-transparent py-6 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setGameState("menu")}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Меню
                </Button>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-base px-4 py-2">
                  {currentQuestionIndex + 1} / {questions.length}
                </Badge>

                {gameMode === "expert" && (
                  <Badge
                    className={cn(
                      "text-base px-4 py-2 transition-all",
                      timeLeft <= 5
                        ? "bg-destructive text-destructive-foreground animate-pulse"
                        : "bg-primary/10 text-primary border-primary/30"
                    )}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {timeLeft}с
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold">
                <Trophy className="w-6 h-6 text-primary" />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {score}
                </span>
              </div>
            </div>

            <Progress value={progress} className="h-3 bg-muted/50" />
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 bg-card border-primary/30 shadow-xl mb-6">
                <div className="text-center space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ¿Qué significa esta señal?
                  </h3>

                  {/* Sign Image */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border-2 border-border/50"
                  >
                    {currentQuestion.sign.image_url ? (
                      <img
                        src={currentQuestion.sign.image_url.startsWith('http') ? currentQuestion.sign.image_url : getImageUrl(currentQuestion.sign.image_url, 'road_signs') || currentQuestion.sign.image_url}
                        alt="Road sign"
                        className="w-48 h-48 md:w-64 md:h-64 mx-auto object-contain drop-shadow-lg"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('wikimedia')) {
                            // Try to use original SVG instead of thumb if thumb fails
                            const original = target.src.replace(/\/thumb\//, '/').replace(/\/[^\/]+$/, '');
                            if (original !== target.src) {
                              target.src = original;
                              return;
                            }
                          }
                          // Final fallback
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = "w-48 h-48 md:w-64 md:h-64 mx-auto flex items-center justify-center bg-muted rounded-lg text-muted-foreground";
                            fallback.innerText = "Изображение недоступно";
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-48 h-48 md:w-64 md:h-64 mx-auto flex items-center justify-center bg-muted rounded-lg">
                        <span className="text-muted-foreground">Нет изображения</span>
                      </div>
                    )}

                    {currentQuestion.sign.sign_number && (
                      <Badge className="mt-4 bg-primary/10 text-primary border-primary/30">
                        {currentQuestion.sign.sign_number}
                      </Badge>
                    )}
                  </motion.div>

                  {/* Hint */}
                  {showHint && hintText && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/10 border-2 border-primary/30 rounded-xl p-4 mb-4"
                    >
                      <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1">Pista:</p>
                          <p className="text-sm text-foreground">{hintText}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Boosters */}
                  {profileId && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 justify-center">
                      <BoostButton
                        type="fifty_fifty"
                        name="50/50"
                        available={boosts.fifty_fifty}
                        onUse={handleUseBoost}
                        disabled={isAnswerRevealed || usedBoosts.includes('fifty_fifty') || hiddenOptions.length > 0}
                      />
                      {gameMode === 'expert' && (
                        <BoostButton
                          type="time_extend"
                          name="+30s"
                          available={boosts.time_extend}
                          onUse={handleUseBoost}
                          disabled={isAnswerRevealed || usedBoosts.includes('time_extend')}
                        />
                      )}
                      <BoostButton
                        type="hint"
                        name="Pista"
                        available={boosts.hint}
                        onUse={handleUseBoost}
                        disabled={isAnswerRevealed || usedBoosts.includes('hint') || showHint}
                      />
                      <BoostButton
                        type="skip"
                        name="Saltar"
                        available={boosts.skip}
                        onUse={handleUseBoost}
                        disabled={isAnswerRevealed || usedBoosts.includes('skip')}
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <AnimatePresence>
                      {currentQuestion.options
                        .filter(option => !hiddenOptions.includes(option.id))
                        .map((option, index) => {
                          const isSelected = selectedOption === option.id;
                          const isCorrect = option.id === currentQuestion.correctAnswer.id;
                          const showCorrect = isAnswerRevealed && isCorrect;
                          const showWrong = isAnswerRevealed && isSelected && !isCorrect;
                          const isWrong = wrongAnswerIds.has(option.id);
                          const isCorrectHighlight = correctAnswerIds.has(option.id);

                          return (
                            <motion.div
                              key={option.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <Button
                                onClick={() => handleAnswerSelect(option.id)}
                                disabled={isAnswerRevealed}
                                className={cn(
                                  "w-full h-auto min-h-[80px] py-4 px-6 text-left text-base md:text-lg transition-all duration-300 relative overflow-hidden",
                                  showCorrect
                                    ? "bg-success text-success-foreground border-2 border-success shadow-lg scale-[1.02]"
                                    : showWrong || isWrong
                                      ? "bg-destructive text-destructive-foreground border-2 border-destructive shadow-lg scale-[1.02]"
                                      : isCorrectHighlight
                                        ? "bg-success/20 text-success border-2 border-success/50 shadow-md"
                                        : isSelected
                                          ? "bg-primary text-primary-foreground border-2 border-primary shadow-md"
                                          : "bg-background hover:bg-muted/50 text-foreground border-2 border-border hover:border-primary/50 hover:shadow-md"
                                )}
                              >
                                {showCorrect && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2"
                                  >
                                    <Check className="w-6 h-6" />
                                  </motion.div>
                                )}
                                {showWrong && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2"
                                  >
                                    <X className="w-6 h-6" />
                                  </motion.div>
                                )}
                                <span className="flex-1 text-left break-words whitespace-normal">
                                  {option.name_es}
                                </span>
                              </Button>
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
