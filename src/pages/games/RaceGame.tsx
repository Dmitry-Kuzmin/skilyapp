import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, X, Check, Flame, Timer, Clock, ArrowLeft, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { updateTermProgress } from "@/lib/termProgress";

// ============================================
// Game Configuration
// ============================================
const GAME_CONFIG = {
  START_TIME_MS: 60_000,        // Стартовое время: 60 секунд
  MAX_TIME_MS: 90_000,          // Максимальное время: 90 секунд (60 + 30 накопление)
  MAX_TIME_ACCUMULATION_MS: 30_000, // Максимум накопления: +30 секунд
  TIME_PER_CORRECT_MS: 1_000,   // +1 секунда за правильный ответ
  TIME_PENALTY_INCORRECT_MS: 2_000, // -2 секунды за неправильный ответ
  MIN_ANSWER_INTERVAL_MS: 600,  // Минимальный интервал между ответами
  BASE_POINTS_PER_CORRECT: 1,   // Базовые очки за правильный ответ
  COMBO_THRESHOLDS: [
    { count: 3, bonus_points: 2, bonus_time_ms: 0 },
    { count: 5, bonus_points: 5, bonus_time_ms: 2_000 },
    { count: 10, bonus_points: 12, bonus_time_ms: 5_000 },
  ],
  MAX_CONSECUTIVE_MISSES_TO_END: 3,
  AUTO_END_IF_TIME_LESS_THAN_MS: 500,
  COINS_DIVIDER: 8,
  MAX_COINS_PER_RACE: 50,
  XP_PER_CORRECT: 2,
} as const;

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
}

interface GameQuestion {
  question_id: string;
  term: LanguageTerm;
  translation: string;
  is_correct: boolean;
  server_ts: number;
}

interface GameStats {
  total_points: number;
  correct_count: number;
  incorrect_count: number;
  combo_count: number;
  max_combo: number;
  consecutive_misses: number;
  total_answered: number;
  suspect_attempts: number;
  last_answer_ts: number;
}

interface Mistake {
  term_es: string;
  term_ru_correct: string;
  term_ru_shown: string;
  user_answer: boolean;
  question_id: string;
}

interface RaceSession {
  session_id: string;
  start_ts: number;
  remaining_time_ms: number;
  current_question: GameQuestion | null;
}

const RaceGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profileId } = useUserContext();
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [session, setSession] = useState<RaceSession | null>(null);
  const [stats, setStats] = useState<GameStats>({
    total_points: 0,
    correct_count: 0,
    incorrect_count: 0,
    combo_count: 0,
    max_combo: 0,
    consecutive_misses: 0,
    total_answered: 0,
    suspect_attempts: 0,
    last_answer_ts: 0,
  });
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusText, setBonusText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswerInfo, setCorrectAnswerInfo] = useState<{ term_es: string; term_ru: string } | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showMistakesReview, setShowMistakesReview] = useState(false);
  const lastAnswerTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    console.log("RaceGame component mounted, loading terms...");
    loadTerms();
  }, []);

  useEffect(() => {
    if (isGameActive && !isPaused && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = Math.max(prev - 100, 0);
          if (newTime <= GAME_CONFIG.AUTO_END_IF_TIME_LESS_THAN_MS) {
            endGame("time_up");
            return 0;
          }
          if (newTime <= 10_000 && newTime % 1000 < 100) {
            sounds.timeRunningOut();
          }
          return newTime;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isGameActive, isPaused, timeLeft]);

  useEffect(() => {
    if (!isGameActive || isPaused) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleAnswer(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameActive, isPaused, session?.current_question]);

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru")
        .limit(100);

      if (error) {
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
        console.log(`✅ Successfully loaded ${shuffled.length} terms for race game`);
      } else {
        toast({
          title: "Нет данных",
          description: "В базе нет терминов для игры. Импортируйте данные через админ-панель.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("❌ Unexpected error in loadTerms:", err);
      toast({
        title: "Ошибка",
        description: `Произошла неожиданная ошибка: ${err?.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const generateQuestion = (): GameQuestion | null => {
    if (terms.length < 2) return null;
    const randomIndex = Math.floor(Math.random() * terms.length);
    const term = terms[randomIndex];
    const showCorrect = Math.random() > 0.5;
    let translation: string;
    let is_correct: boolean;

    if (showCorrect) {
      translation = term.term_ru;
      is_correct = true;
    } else {
      const wrongTerms = terms.filter((t) => t.id !== term.id);
      if (wrongTerms.length > 0) {
        const wrongTerm = wrongTerms[Math.floor(Math.random() * wrongTerms.length)];
        translation = wrongTerm.term_ru;
        is_correct = false;
      } else {
        translation = term.term_ru;
        is_correct = true;
      }
    }

    return {
      question_id: `q_${Date.now()}_${Math.random()}`,
      term,
      translation,
      is_correct,
      server_ts: Date.now(),
    };
  };

  const startGame = () => {
    if (terms.length < 2) {
      toast({
        title: "Недостаточно данных",
        description: "Нужно минимум 2 термина для игры",
        variant: "destructive",
      });
      return;
    }

    const session_id = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = session_id;
    const newSession: RaceSession = {
      session_id,
      start_ts: Date.now(),
      remaining_time_ms: GAME_CONFIG.START_TIME_MS,
      current_question: null,
    };
    const firstQuestion = generateQuestion();
    if (!firstQuestion) return;

    newSession.current_question = firstQuestion;
    setSession(newSession);
    setTimeLeft(GAME_CONFIG.START_TIME_MS);
    setIsGameActive(true);
    setIsGameOver(false);
    setIsPaused(false);
    setStats({
      total_points: 0,
      correct_count: 0,
      incorrect_count: 0,
      combo_count: 0,
      max_combo: 0,
      consecutive_misses: 0,
      total_answered: 0,
      suspect_attempts: 0,
      last_answer_ts: 0,
    });
    setLastAnswerCorrect(null);
    setShowCorrectAnswer(false);
    setCorrectAnswerInfo(null);
    setMistakes([]);
    setShowMistakesReview(false);
    lastAnswerTimeRef.current = 0;
    console.log("Race session started:", session_id);
  };

  const validateAndProcessAnswer = (chosen: boolean): {
    is_correct: boolean;
    points_awarded: number;
    time_delta_ms: number;
    combo_bonus: { points: number; time_ms: number } | null;
  } | null => {
    if (!session?.current_question) return null;
    const question = session.current_question;
    const is_correct = chosen === question.is_correct;
    const now = Date.now();
    const timeSinceLastAnswer = now - lastAnswerTimeRef.current;

    if (timeSinceLastAnswer < GAME_CONFIG.MIN_ANSWER_INTERVAL_MS && lastAnswerTimeRef.current > 0) {
      setStats((prev) => ({
        ...prev,
        suspect_attempts: prev.suspect_attempts + 1,
      }));
      toast({
        title: "Слишком быстро!",
        description: `Отвечайте не быстрее, чем ${GAME_CONFIG.MIN_ANSWER_INTERVAL_MS / 1000}s`,
        variant: "destructive",
      });
      if (stats.suspect_attempts + 1 >= 3) {
        toast({
          title: "Внимание!",
          description: "Слишком много быстрых ответов. Временное ограничение 5 секунд.",
          variant: "destructive",
        });
        setTimeout(() => {
          setStats((prev) => ({ ...prev, suspect_attempts: 0 }));
        }, 5_000);
      }
      return null;
    }

    lastAnswerTimeRef.current = now;
    let points_awarded = 0;
    let time_delta_ms = 0;
    let combo_bonus: { points: number; time_ms: number } | null = null;

    if (is_correct) {
      points_awarded = GAME_CONFIG.BASE_POINTS_PER_CORRECT;
      time_delta_ms = GAME_CONFIG.TIME_PER_CORRECT_MS; // +1 секунда за правильный ответ
      const newCombo = stats.combo_count + 1;
      const threshold = GAME_CONFIG.COMBO_THRESHOLDS.find((t) => t.count === newCombo);
      if (threshold) {
        combo_bonus = {
          points: threshold.bonus_points,
          time_ms: threshold.bonus_time_ms,
        };
        points_awarded += threshold.bonus_points;
        time_delta_ms += threshold.bonus_time_ms; // Бонусное время от комбо (может быть 0, 2 или 5 секунд)
      }
    } else {
      time_delta_ms = -GAME_CONFIG.TIME_PENALTY_INCORRECT_MS; // -2 секунды за неправильный ответ
    }
    
    // Примечание: Ограничение максимального времени (90 секунд) применяется в setTimeLeft в handleAnswer
    // Это предотвращает бесконечную игру, даже с бонусами от комбо

    return {
      is_correct,
      points_awarded,
      time_delta_ms,
      combo_bonus,
    };
  };

  const handleAnswer = (chosen: boolean) => {
    if (!isGameActive || isPaused || !session?.current_question) return;
    const result = validateAndProcessAnswer(chosen);
    if (!result) return;

    const { is_correct, points_awarded, time_delta_ms, combo_bonus } = result;
    const currentQuestion = session.current_question;
    
    // Мгновенные звуковые реакции для повышения вовлечения
    if (is_correct) {
      if (combo_bonus) {
        // Комбо звук воспроизводится сразу для комбо
        sounds.combo(stats.combo_count + 1);
        haptics.combo();
      } else {
        // Обычный звук правильного ответа
        sounds.correctAnswer();
        haptics.correctAnswer();
      }
    } else {
      // Звук неправильного ответа
      sounds.wrongAnswer();
      haptics.wrongAnswer();
    }

    setLastAnswerCorrect(is_correct);

    // Save mistake if incorrect
    if (!is_correct) {
      setMistakes((prev) => [
        ...prev,
        {
          term_es: currentQuestion.term.term_es,
          term_ru_correct: currentQuestion.term.term_ru,
          term_ru_shown: currentQuestion.translation,
          user_answer: chosen,
          question_id: currentQuestion.question_id,
        },
      ]);
      
      // Show correct answer for learning (only on wrong answer)
      setCorrectAnswerInfo({
        term_es: currentQuestion.term.term_es,
        term_ru: currentQuestion.term.term_ru,
      });
      setShowCorrectAnswer(true);
    } else {
      // On correct answer, just show brief feedback, no detailed answer display
      setShowCorrectAnswer(false);
      setCorrectAnswerInfo(null);
    }

    setStats((prev) => {
      const newCombo = is_correct ? prev.combo_count + 1 : 0;
      const newConsecutiveMisses = is_correct ? 0 : prev.consecutive_misses + 1;
      if (newConsecutiveMisses >= GAME_CONFIG.MAX_CONSECUTIVE_MISSES_TO_END) {
        setTimeout(() => {
          endGame("consecutive_misses");
        }, 500);
      }
      return {
        ...prev,
        total_points: prev.total_points + points_awarded,
        correct_count: is_correct ? prev.correct_count + 1 : prev.correct_count,
        incorrect_count: is_correct ? prev.incorrect_count : prev.incorrect_count + 1,
        combo_count: newCombo,
        max_combo: Math.max(prev.max_combo, newCombo),
        consecutive_misses: newConsecutiveMisses,
        total_answered: prev.total_answered + 1,
        last_answer_ts: Date.now(),
      };
    });

    // Обновляем время с ограничением: максимум 90 секунд (60 стартовых + 30 максимальное накопление)
    setTimeLeft((prev) => {
      const newTime = Math.min(
        Math.max(prev + time_delta_ms, 0),
        GAME_CONFIG.MAX_TIME_MS // 90 секунд - максимальное время игры
      );
      return newTime;
    });

    // Обновляем прогресс термина
    if (profileId && currentQuestion?.term?.id) {
      if (is_correct) {
        console.log(`[RaceGame] Updating progress for term ${currentQuestion.term.id} (${currentQuestion.term.term_es}) - CORRECT`);
        updateTermProgress(profileId, currentQuestion.term.id, true);
      } else {
        console.log(`[RaceGame] Updating progress for term ${currentQuestion.term.id} (${currentQuestion.term.term_es}) - WRONG`);
        updateTermProgress(profileId, currentQuestion.term.id, false);
      }
    } else {
      console.warn('[RaceGame] Cannot update progress:', { profileId, termId: currentQuestion?.term?.id });
    }

    // Показываем бонусную анимацию для комбо
    if (is_correct && combo_bonus) {
      showBonusAnimation(`${combo_bonus.points}`);
    }

    // Hide feedback and move to next question
    // If wrong answer, show correct answer for 2 seconds, otherwise move immediately
    const delay = !is_correct ? 2000 : 500;
    setTimeout(() => {
      setShowCorrectAnswer(false);
      setCorrectAnswerInfo(null);
      const nextQuestion = generateQuestion();
      if (nextQuestion) {
        setSession((prev) => (prev ? { ...prev, current_question: nextQuestion } : null));
        setLastAnswerCorrect(null);
      }
    }, delay);
  };

  const showBonusAnimation = (text: string, duration: number = 2000) => {
    setBonusText(text);
    setShowBonus(true);
    setTimeout(() => {
      setShowBonus(false);
    }, duration);
  };

  const endGame = async (reason: "time_up" | "consecutive_misses" | "manual" = "manual") => {
    setIsGameActive(false);
    setIsPaused(false);
    setShowCorrectAnswer(false);
    setCorrectAnswerInfo(null);
    
    // Show mistakes review if there are mistakes
    if (mistakes.length > 0) {
      setIsGameOver(true);
      setShowMistakesReview(true);
    } else {
      setIsGameOver(true);
    }

    const xp_awarded = stats.correct_count * GAME_CONFIG.XP_PER_CORRECT;
    const coins_awarded = Math.min(
      Math.floor(stats.total_points / GAME_CONFIG.COINS_DIVIDER),
      GAME_CONFIG.MAX_COINS_PER_RACE
    );

    if (stats.total_points >= 10) {
      sounds.victory();
      haptics.victory();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    if (profileId) {
      const sessionData = {
        user_id: profileId,
        game_type: "race",
        score: Math.min(Math.max(0, stats.total_points), 100),
        total_questions: Math.min(Math.max(1, stats.total_answered), 100),
        duration_seconds: Math.min(
          Math.max(0, Math.floor((Date.now() - (session?.start_ts || Date.now())) / 1000)),
          7200
        ),
      };
      const { error } = await supabase.from("game_sessions").insert(sessionData);
      if (error) {
        console.error("Failed to save game session:", error);
      }
    }
  };

  const handleContinueFromMistakes = () => {
    setShowMistakesReview(false);
  };

  const startGameWithMistakes = () => {
    // Create a new game with only mistake terms
    if (mistakes.length === 0) {
      startGame();
      return;
    }

    // Extract unique mistake terms
    const mistakeTerms: LanguageTerm[] = mistakes.map(m => ({
      id: m.question_id,
      term_es: m.term_es,
      term_ru: m.term_ru_correct,
    }));

    // Remove duplicates
    const uniqueMistakes = Array.from(
      new Map(mistakeTerms.map(item => [item.term_es, item])).values()
    );

    // Temporarily use mistake terms for this game
    const originalTerms = terms;
    setTerms(uniqueMistakes.length > 0 ? uniqueMistakes : originalTerms);

    // Start game
    startGame();

    // Restore original terms after a delay
    setTimeout(() => {
      setTerms(originalTerms);
    }, 100);
  };

  useEffect(() => {
    if (isGameActive && !isGameOver) {
      document.body.classList.add('race-game-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('race-game-active');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('race-game-active');
      document.body.style.overflow = '';
    };
  }, [isGameActive, isGameOver]);

  const timeLeftSeconds = Math.floor(timeLeft / 1000);
  const timeProgress = session ? ((GAME_CONFIG.START_TIME_MS - timeLeft) / GAME_CONFIG.START_TIME_MS) * 100 : 0;
  const timeProgressPercent = timeProgress; // Percentage of time used
  const timeRemainingPercent = 100 - timeProgressPercent; // Percentage of time remaining
  const accuracy = stats.total_answered > 0 
    ? Math.round((stats.correct_count / stats.total_answered) * 100) 
    : 0;
  
  // Circle progress calculation
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeRemainingPercent / 100) * circumference;

  const content = (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className={`race-game-wrapper ${isGameActive && !isGameOver ? 'race-game-fullscreen' : ''} ${isGameActive && !isGameOver ? 'container mx-auto px-3 md:px-4' : 'container mx-auto px-4 py-4 md:py-8'}`}>
        {/* Premium Header - Mobile during game */}
        {isGameActive && !isGameOver && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={cn(
              "race-game-header fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-primary/20 shadow-lg md:hidden",
              isTelegramMiniApp() 
                ? "tg-safe-top-fixed" 
                : "top-0"
            )}
            style={isTelegramMiniApp() ? {
              top: `calc(env(safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 80px))`
            } : {
              top: '0px'
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => endGame('manual')}
                className="h-9 px-3 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-4">
                <motion.div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30"
                  whileHover={{ scale: 1.05 }}
                >
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{stats.total_points}</span>
                </motion.div>
                <motion.div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    timeLeft <= 10_000 
                      ? 'bg-destructive/20 border-destructive/30 text-destructive' 
                      : 'bg-secondary/20 border-secondary/30 text-secondary'
                  }`}
                  animate={timeLeft <= 10_000 ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.5, repeat: timeLeft <= 10_000 ? Infinity : 0 }}
                >
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-bold">{timeLeftSeconds}с</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Desktop Header */}
        {(!isGameActive || isGameOver) && (
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <Button variant="ghost" onClick={() => navigate("/games")} className="md:hidden">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        )}

        {/* Ultra-Modern Start Screen */}
        {!isGameActive && !isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="relative overflow-hidden border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl">
              <div className="p-6 md:p-10 space-y-8">
                {/* Ultra-Modern Header */}
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
                  >
                    <Zap className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={2} />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl md:text-4xl font-bold text-foreground"
                    >
                      Режим "Гонка"
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-muted-foreground text-base md:text-lg"
                    >
                      Проверьте, насколько быстро вы можете переводить термины!
                    </motion.p>
                  </div>
                </div>

                {/* Ultra-Modern Rules Card */}
                <Card className="border border-border/50 bg-card">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" strokeWidth={2} />
                      <h3 className="text-xl font-bold text-foreground">Правила игры</h3>
                    </div>
                    <div className="grid gap-4">
                      {[
                        { icon: Clock, text: `У вас есть ${GAME_CONFIG.START_TIME_MS / 1000} секунд для проверки максимального количества слов`, color: "secondary" },
                        { icon: Check, text: `За правильный ответ +${GAME_CONFIG.BASE_POINTS_PER_CORRECT} очко и +${GAME_CONFIG.TIME_PER_CORRECT_MS / 1000} секунды`, color: "success" },
                        { icon: X, text: `За неправильный ответ вы теряете ${GAME_CONFIG.TIME_PENALTY_INCORRECT_MS / 1000} секунды`, color: "destructive" },
                        { icon: Timer, text: `Максимум времени: ${GAME_CONFIG.MAX_TIME_MS / 1000} секунд (накопление не более ${GAME_CONFIG.MAX_TIME_ACCUMULATION_MS / 1000} секунд)`, color: "warning" },
                        { icon: Flame, text: "Серия правильных ответов даёт бонусные очки", color: "orange-500" },
                      ].map((rule, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`p-2 rounded-lg bg-${rule.color}/10 border border-${rule.color}/20 flex-shrink-0`}>
                            <rule.icon className={`w-5 h-5 text-${rule.color}`} strokeWidth={2} />
                          </div>
                          <p className="flex-1 pt-1.5 text-sm md:text-base text-foreground">{rule.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Ultra-Modern Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/games")}
                    size="lg"
                    className="flex-1 h-12 border border-border hover:bg-muted/50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Отмена
                  </Button>
                  <Button
                    onClick={startGame}
                    size="lg"
                    disabled={terms.length < 2}
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(139,92,246,0.25)]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Начать игру
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Premium Game Screen */}
        {isGameActive && session?.current_question && (
          <motion.div
            key={stats.total_answered}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="race-game-content space-y-4 md:space-y-6"
          >
            {/* Premium Circular Timer with Countdown */}
            <div className="pt-12 md:pt-0 flex justify-center">
              <motion.div 
                className="relative w-32 h-32 md:w-40 md:h-40"
                animate={
                  timeLeft <= 10_000 
                    ? { scale: [1, 1.05, 1] }
                    : {}
                }
                transition={{ duration: 0.5, repeat: timeLeft <= 10_000 ? Infinity : 0 }}
              >
                {/* SVG Circle Progress */}
                <svg
                  className="transform -rotate-90 w-full h-full drop-shadow-sm"
                  viewBox="0 0 100 100"
                >
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted/20"
                  />
                  {/* Progress circle with glow effect */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    className={`transition-colors drop-shadow-sm ${
                      timeLeft <= 10_000 
                        ? 'text-destructive' 
                        : timeLeft <= 20_000 
                        ? 'text-orange-500' 
                        : 'text-primary'
                    }`}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ 
                      strokeDashoffset: strokeDashoffset,
                    }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                  {/* Glow effect for low time */}
                  {timeLeft <= 10_000 && (
                    <motion.circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className="text-destructive/30 blur-sm"
                      strokeDasharray={circumference}
                      animate={{ 
                        strokeDashoffset: strokeDashoffset,
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{ 
                        strokeDashoffset: { duration: 0.1, ease: "linear" },
                        opacity: { duration: 0.5, repeat: Infinity }
                      }}
                    />
                  )}
                </svg>
                
                {/* Countdown text inside circle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    key={timeLeftSeconds}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      ...(timeLeft <= 10_000 ? {
                        scale: [1, 1.1, 1],
                      } : {})
                    }}
                    transition={{ 
                      duration: 0.2,
                      ...(timeLeft <= 10_000 ? {
                        scale: { duration: 0.3, repeat: Infinity }
                      } : {})
                    }}
                    className={`text-3xl md:text-4xl font-bold transition-colors ${
                      timeLeft <= 10_000 
                        ? 'text-destructive' 
                        : timeLeft <= 20_000 
                        ? 'text-orange-500' 
                        : 'text-primary'
                    }`}
                  >
                    {timeLeftSeconds}
                  </motion.div>
                  <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">
                    сек
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Premium Combo Indicator - Modern & Interesting */}
            <AnimatePresence>
              {stats.combo_count > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex justify-center"
                >
                  <motion.div
                    className="relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 backdrop-blur-sm"
                    animate={{
                      boxShadow: [
                        '0 0 0px rgba(249, 115, 22, 0)',
                        '0 0 20px rgba(249, 115, 22, 0.3)',
                        '0 0 0px rgba(249, 115, 22, 0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {/* Animated background pulse */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-orange-500/20"
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    
                    <div className="relative z-10 flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Flame className="w-5 h-5 text-orange-500" strokeWidth={2.5} fill="currentColor" />
                      </motion.div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium text-orange-600/70 uppercase tracking-wider">
                          Серия
                        </span>
                        <span className="text-lg font-bold text-orange-600 leading-none">
                          {stats.combo_count}x
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ultra-Modern Question Card - Clean minimal design */}
            <Card className="relative overflow-hidden border border-border/50 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-2xl">

              {/* Premium Combo Bonus Animation - Modern & Interesting */}
              <AnimatePresence>
                {showBonus && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      scale: [0.5, 1.1, 1, 0.9],
                      y: [0, -80, -120],
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                  >
                    <div className="relative">
                      {/* Background glow effect */}
                      <motion.div
                        className="absolute inset-0 -z-10 rounded-full bg-orange-500/30 blur-2xl"
                        animate={{
                          scale: [1, 1.5, 2],
                          opacity: [0.5, 0.3, 0],
                        }}
                        transition={{ duration: 2 }}
                      />
                      
                      {/* Main text container */}
                      <motion.div
                        className="relative px-6 py-4 rounded-2xl bg-card border-2 border-orange-500/40 shadow-[0_8px_32px_rgba(249,115,22,0.3)] backdrop-blur-sm"
                        animate={{
                          boxShadow: [
                            '0 8px 32px rgba(249,115,22,0.3)',
                            '0 12px 40px rgba(249,115,22,0.4)',
                            '0 8px 32px rgba(249,115,22,0.3)',
                          ],
                        }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ 
                              rotate: [0, 360],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Flame className="w-8 h-8 text-orange-500" strokeWidth={2.5} fill="currentColor" />
                          </motion.div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-orange-600/70 uppercase tracking-wider">
                              Бонус комбо
                            </span>
                            <span className="text-2xl md:text-3xl font-bold text-orange-600 leading-none whitespace-nowrap">
                              +{bonusText.match(/\d+/)?.[0] || ''} очков
                            </span>
                          </div>
                        </div>
                        
                        {/* Particles effect */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-orange-500/60"
                            initial={{ 
                              x: 0, 
                              y: 0, 
                              opacity: 1,
                              scale: 1,
                            }}
                            animate={{
                              x: [0, Math.cos(i * 60 * Math.PI / 180) * 40],
                              y: [0, Math.sin(i * 60 * Math.PI / 180) * 40],
                              opacity: [1, 0],
                              scale: [1, 0],
                            }}
                            transition={{ 
                              duration: 1.5,
                              delay: 0.2,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ultra-Modern Feedback overlay - Minimal */}
              <AnimatePresence>
                {lastAnswerCorrect !== null && !showCorrectAnswer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm ${
                      lastAnswerCorrect ? 'bg-success/5' : 'bg-destructive/5'
                    }`}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${
                        lastAnswerCorrect 
                          ? 'bg-success border-success/30 text-success' 
                          : 'bg-destructive border-destructive/30 text-destructive'
                      }`}
                    >
                      {lastAnswerCorrect ? (
                        <Check className="w-10 h-10" strokeWidth={3} />
                      ) : (
                        <X className="w-10 h-10" strokeWidth={3} />
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ultra-Modern Correct Answer Display - Minimalist design */}
              <AnimatePresence>
                {showCorrectAnswer && correctAnswerInfo && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 backdrop-blur-md"
                  >
                    <motion.div
                      initial={{ scale: 0.95, y: 20, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="relative w-full max-w-lg mx-4 p-8 md:p-10 bg-card border border-border/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                    >
                      {/* Minimalist divider line */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-destructive rounded-full" />
                      
                      <div className="text-center space-y-6">
                        {/* Status badge - minimal */}
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20"
                        >
                          <X className="w-4 h-4 text-destructive" strokeWidth={2.5} />
                          <span className="text-sm font-semibold text-destructive uppercase tracking-wide">
                            Неверно
                          </span>
                        </motion.div>
                        
                        {/* Label */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            Правильный ответ
                          </div>
                        </div>
                        
                        {/* Answer content */}
                        <div className="space-y-4 pt-2">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl md:text-4xl font-bold text-foreground break-words leading-tight"
                          >
                            {correctAnswerInfo.term_es}
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xl md:text-2xl font-semibold text-success break-words"
                          >
                            {correctAnswerInfo.term_ru}
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative z-10 p-6 md:p-10 space-y-6 md:space-y-8">
                {/* Spanish Term - Premium Style */}
                <motion.div
                  key={`term-${stats.total_answered}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Термин</span>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-foreground break-words leading-tight">
                    {session.current_question.term.term_es}
                  </div>
                </motion.div>

                {/* Divider - Minimal */}
                <div className="h-px bg-border" />

                {/* Translation - Ultra-Modern Style */}
                <motion.div
                  key={`translation-${stats.total_answered}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Перевод</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold text-foreground break-words leading-relaxed">
                    {session.current_question.translation}
                  </div>
                </motion.div>

                {/* Question */}
                <div className="text-center pt-4">
                  <p className="text-base md:text-xl font-semibold text-muted-foreground">
                    Верен ли перевод?
                  </p>
                </div>

                {/* Ultra-Modern Answer Buttons - Flat design */}
                <div className="flex gap-3 md:gap-4 pt-4">
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      onClick={() => handleAnswer(false)}
                      variant="destructive"
                      size="lg"
                      className="w-full h-16 md:h-18 text-lg md:text-xl font-semibold rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.35)] transition-all"
                      disabled={isPaused}
                    >
                      <X className="w-5 h-5 md:w-6 md:h-6 mr-2" strokeWidth={2.5} />
                      Нет
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      onClick={() => handleAnswer(true)}
                      size="lg"
                      className="w-full h-16 md:h-18 text-lg md:text-xl font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(139,92,246,0.25)] hover:shadow-[0_6px_16px_rgba(139,92,246,0.35)] transition-all"
                      disabled={isPaused}
                    >
                      <Check className="w-5 h-5 md:w-6 md:h-6 mr-2" strokeWidth={2.5} />
                      Да
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Ultra-Modern Mistakes Review Screen */}
        {isGameOver && showMistakesReview && mistakes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="relative overflow-hidden border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl">
              <div className="p-6 md:p-10 space-y-6">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ошибки в этом раунде</h2>
                  <p className="text-sm text-muted-foreground">
                    Повторите термины, которые вызвали затруднения
                  </p>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {mistakes.map((mistake, idx) => (
                    <motion.div
                      key={mistake.question_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="text-lg font-bold text-foreground break-words">
                            {mistake.term_es}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Показано:</span>
                              <span className="text-destructive line-through">{mistake.term_ru_shown}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-success flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-base font-semibold text-success">
                                Правильно: {mistake.term_ru_correct}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleContinueFromMistakes}
                    size="lg"
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(139,92,246,0.25)]"
                  >
                    Продолжить
                  </Button>
                  <Button
                    onClick={startGameWithMistakes}
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 border border-border hover:bg-muted/50"
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Повторить ошибки
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Ultra-Modern Game Over Screen */}
        {isGameOver && !showMistakesReview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="relative overflow-hidden border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl">
              <div className="p-8 md:p-12 text-center space-y-8">
                {/* Trophy Icon - Minimal */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
                >
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={2} />
                </motion.div>

                <div className="space-y-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl md:text-4xl font-bold text-foreground"
                  >
                    Игра окончена!
                  </motion.h2>
                  
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 10 }}
                    className="text-6xl md:text-7xl font-bold text-primary"
                  >
                    {stats.total_points}
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground"
                  >
                    Вы ответили на {stats.total_answered} вопросов
                  </motion.p>
                </div>

                {/* Ultra-Modern Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-3 pt-6 border-t border-border"
                >
                  {[
                    { label: "Правильных", value: stats.correct_count, color: "success", icon: Check },
                    { label: "Неправильных", value: stats.incorrect_count, color: "destructive", icon: X },
                    { label: "Точность", value: `${accuracy}%`, color: "primary", icon: Star },
                    { label: "Макс. комбо", value: `${stats.max_combo}x`, color: "orange-500", icon: Flame },
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      className="p-4 rounded-xl border border-border/50 bg-card"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <stat.icon className={`w-4 h-4 text-${stat.color}`} strokeWidth={2.5} />
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          {stat.label}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold text-${stat.color} text-center`}>
                        {stat.value}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Ultra-Modern Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    onClick={startGame}
                    size="lg"
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(139,92,246,0.25)]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Играть снова
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/games")}
                    size="lg"
                    className="flex-1 h-12 border border-border hover:bg-muted/50"
                  >
                    К играм
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </>
  );

  if (isGameActive && !isGameOver) {
    return (
      <div className="race-game-fullscreen-wrapper fixed inset-0 z-[100] bg-background">
        {content}
      </div>
    );
  }

  return <Layout>{content}</Layout>;
};

export default RaceGame;
