import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, ArrowLeft, Flame, Timer, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
}

interface GameStats {
  correct: number;
  incorrect: number;
  combo: number;
  maxCombo: number;
  speedBonuses: number;
  averageTime: number;
}

const RaceGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profileId } = useUserContext();
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusText, setBonusText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    correct: 0,
    incorrect: 0,
    combo: 0,
    maxCombo: 0,
    speedBonuses: 0,
    averageTime: 0,
  });
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [answerTimes, setAnswerTimes] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        if (timeLeft <= 10 && timeLeft > 0) {
          sounds.timeRunningOut();
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isGameActive) {
      endGame();
    }
  }, [timeLeft, isGameActive]);

  useEffect(() => {
    if (isGameActive && currentIndex < terms.length) {
      setQuestionStartTime(Date.now());
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [currentIndex, isGameActive, terms.length]);

  const loadTerms = async () => {
    try {
      // Сначала пробуем загрузить из language_terms
      let { data, error } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru")
        .limit(100);

      // Если нет данных в language_terms, пробуем загрузить из questions как fallback
      if (!error && (!data || data.length === 0)) {
        console.log("No data in language_terms, trying questions table...");
        const questionsResult = await supabase
          .from("questions")
          .select("id, question_es, correct_answer_ru")
          .limit(100);

        if (questionsResult.data && questionsResult.data.length > 0) {
          // Преобразуем questions в формат language_terms
          data = questionsResult.data.map((q: any) => ({
            id: q.id,
            term_es: q.question_es,
            term_ru: q.correct_answer_ru,
          }));
          error = null;
          console.log(`Loaded ${data.length} terms from questions table`);
        } else if (questionsResult.error) {
          error = questionsResult.error;
        }
      }

      if (error) {
        console.error("Error loading terms:", error);
        toast({
          title: "Ошибка",
          description: `Не удалось загрузить термины: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setTerms(shuffled);
        console.log(`Loaded ${shuffled.length} terms for race game`);
      } else {
        toast({
          title: "Нет данных",
          description: "В базе нет терминов для игры. Импортируйте данные через админ-панель.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Unexpected error loading terms:", err);
      toast({
        title: "Ошибка",
        description: `Произошла неожиданная ошибка: ${err?.message || "Неизвестная ошибка"}`,
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
    setCombo(0);
    setMaxCombo(0);
    setShowBonus(false);
    setShowConfetti(false);
    setGameStats({
      correct: 0,
      incorrect: 0,
      combo: 0,
      maxCombo: 0,
      speedBonuses: 0,
      averageTime: 0,
    });
    setAnswerTimes([]);
    setQuestionStartTime(Date.now());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const showBonusAnimation = (text: string, duration: number = 1500) => {
    setBonusText(text);
    setShowBonus(true);
    setTimeout(() => {
      setShowBonus(false);
    }, duration);
  };

  const checkAnswer = () => {
    if (!userAnswer.trim() || !isGameActive) return;

    const currentTerm = terms[currentIndex];
    const answerTime = (Date.now() - questionStartTime) / 1000; // в секундах
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrectAnswer = currentTerm.term_ru.toLowerCase().trim();
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    let pointsEarned = 0;
    let bonusText = "";

    if (isCorrect) {
      pointsEarned = 1;
      setGameStats((prev) => ({
        ...prev,
        correct: prev.correct + 1,
      }));

      // Speed bonus
      if (answerTime < 3) {
        pointsEarned += 2;
        bonusText = "⚡ Молниеносно! +2";
        setGameStats((prev) => ({
          ...prev,
          speedBonuses: prev.speedBonuses + 1,
        }));
      } else if (answerTime < 5) {
        pointsEarned += 1;
        bonusText = "⚡ Быстро! +1";
        setGameStats((prev) => ({
          ...prev,
          speedBonuses: prev.speedBonuses + 1,
        }));
      }

      // Combo system
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo);
      }
      setGameStats((prev) => ({
        ...prev,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
      }));

      // Combo bonus
      if (newCombo >= 3) {
        pointsEarned += 1;
        bonusText = bonusText
          ? `${bonusText} + 🔥 ${newCombo}x комбо!`
          : `🔥 ${newCombo}x комбо! +1`;
        sounds.combo(newCombo);
        haptics.combo();
      } else {
        sounds.correctAnswer();
        haptics.correctAnswer();
      }

      setScore((prev) => prev + pointsEarned);
      if (bonusText) {
        showBonusAnimation(bonusText);
      }

      toast({
        title: "Правильно! ✓",
        description: `${pointsEarned > 1 ? `+${pointsEarned} баллов` : "+1 балл"}`,
      });
    } else {
      setCombo(0);
      setGameStats((prev) => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        combo: 0,
      }));
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      toast({
        title: "Неправильно ✗",
        description: `Правильный ответ: ${currentTerm.term_ru}`,
        variant: "destructive",
      });
    }

    // Record answer time
    setAnswerTimes((prev) => [...prev, answerTime]);

    setUserAnswer("");

    // Move to next word
    if (currentIndex < terms.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // All words completed, end game
      endGame();
    }
  };

  const endGame = async () => {
    setIsGameActive(false);
    setIsGameOver(true);

    // Calculate average time
    const avgTime =
      answerTimes.length > 0
        ? answerTimes.reduce((a, b) => a + b, 0) / answerTimes.length
        : 0;
    setGameStats((prev) => ({
      ...prev,
      averageTime: avgTime,
    }));

    // Play victory sound if good score
    if (score >= 10) {
      sounds.victory();
      haptics.victory();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    // Save game session
    if (profileId) {
      const sessionData = {
        user_id: profileId,
        game_type: "race",
        score: Math.min(Math.max(0, score), 100),
        total_questions: Math.min(Math.max(1, currentIndex + 1), 100),
        duration_seconds: Math.min(Math.max(0, 60 - timeLeft), 7200),
      };

      const { error } = await supabase.from("game_sessions").insert(sessionData);

      if (error) {
        console.error("Failed to save game session:", error);
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
  const timeProgress = (60 - timeLeft) / 60 * 100;

  return (
    <Layout>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Zap className="w-10 h-10 text-secondary" />
            </motion.div>
            Гонка
          </h1>
          <p className="text-muted-foreground text-lg">
            Переведи максимум слов за 60 секунд!
          </p>
        </motion.div>

        {!isGameActive && !isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 gradient-card text-center space-y-4 border-border/50 hover:border-primary/30 transition-all duration-300">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-16 h-16 mx-auto text-secondary" />
              </motion.div>
              <h2 className="text-2xl font-bold">Готовы к гонке?</h2>
              <p className="text-muted-foreground">
                У вас будет 60 секунд, чтобы перевести как можно больше слов с испанского на русский
              </p>
              <p className="text-sm text-muted-foreground">
                💡 Получайте бонусы за скорость и комбо!
              </p>
              <Button size="lg" onClick={startGame} disabled={terms.length === 0}>
                Начать игру
              </Button>
            </Card>
          </motion.div>
        )}

        {isGameActive && currentTerm && (
          <div className="space-y-6">
            {/* Stats Card */}
            <motion.div
              key={`stats-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 gradient-card border-border/50">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                  <motion.div
                    className="flex items-center gap-2"
                    animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
                  >
                    <Timer className="w-5 h-5 text-secondary" />
                    <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-destructive" : "text-secondary"}`}>
                      {timeLeft}с
                    </span>
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold text-primary">{score}</span>
                  </div>
                  {combo > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Flame className="w-5 h-5 text-orange-500" />
                      <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/50">
                        {combo}x комбо
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <Progress value={progress} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Слово {currentIndex + 1} из {terms.length}</span>
                  <span>Прогресс: {Math.round(progress)}%</span>
                </div>
                <Progress value={timeProgress} className="mt-2" />
              </Card>
            </motion.div>

            {/* Question Card */}
            <motion.div
              key={`question-${currentIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 gradient-card space-y-6 border-border/50 hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                {/* Bonus Animation */}
                <AnimatePresence>
                  {showBonus && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -50, scale: 1 }}
                      exit={{ opacity: 0, y: -100, scale: 0.5 }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                    >
                      <div className="text-3xl font-bold text-gold drop-shadow-lg whitespace-nowrap">
                        {bonusText}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-center space-y-4">
                  <div className="text-sm text-muted-foreground">Переведите на русский:</div>
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                  >
                    {currentTerm.term_es}
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Input
                      ref={inputRef}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Введите перевод..."
                      className="text-lg text-center h-14"
                      autoFocus
                      disabled={!isGameActive}
                    />
                  </motion.div>
                  <Button
                    onClick={checkAnswer}
                    className="w-full h-12 text-lg"
                    size="lg"
                    disabled={!userAnswer.trim() || !isGameActive}
                  >
                    Ответить
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 gradient-card text-center space-y-6 border-border/50">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-gold" />
              </motion.div>
              <h2 className="text-3xl font-bold">Игра окончена!</h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              >
                {score}
              </motion.div>
              <p className="text-xl text-muted-foreground">
                Вы правильно перевели {gameStats.correct} из {currentIndex + 1} слов
              </p>

              {/* Detailed Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Точность</div>
                  <div className="text-2xl font-bold text-primary">
                    {currentIndex + 1 > 0
                      ? Math.round((gameStats.correct / (currentIndex + 1)) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Макс. комбо</div>
                  <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                    <Flame className="w-5 h-5" />
                    {maxCombo}x
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Скорость</div>
                  <div className="text-2xl font-bold text-secondary flex items-center justify-center gap-1">
                    <Target className="w-5 h-5" />
                    {gameStats.averageTime > 0
                      ? `${gameStats.averageTime.toFixed(1)}с`
                      : "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Бонусы</div>
                  <div className="text-2xl font-bold text-gold">
                    {gameStats.speedBonuses}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button onClick={startGame} size="lg">
                  Играть снова
                </Button>
                <Button variant="outline" onClick={() => navigate("/games")} size="lg">
                  К играм
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default RaceGame;
