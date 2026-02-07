import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, X, Check, Flame, Timer, Clock, ArrowLeft, Sparkles, Star, Target, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { toast } from '@/lib/toast';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
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
  const accumulatedTimeRef = useRef<number>(0); // Отслеживаем накопленное время сверх стартовых 60 секунд

  useEffect(() => {

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
        toast.error("Ошибка", {
          description: `Не удалось загрузить термины: ${error.message}`,
        });
        return;
      }

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setTerms(shuffled);

      } else {
        toast.error("Нет данных", {
          description: "В базе нет терминов для игры. Импортируйте данные через админ-панель.",
        });
      }
    } catch (err: any) {
      console.error("❌ Unexpected error in loadTerms:", err);
      toast.error("Ошибка", {
        description: `Произошла неожиданная ошибка: ${err?.message || "Неизвестная ошибка"}`,
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
      toast.error("Недостаточно данных", {
        description: "Нужно минимум 2 термина для игры",
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
    accumulatedTimeRef.current = 0; // Сбрасываем накопленное время при старте игры

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
      toast.warning("Слишком быстро!", {
        description: `Отвечайте не быстрее, чем ${GAME_CONFIG.MIN_ANSWER_INTERVAL_MS / 1000}s`,
      });
      if (stats.suspect_attempts + 1 >= 3) {
        toast.warning("Внимание!", {
          description: "Слишком много быстрых ответов. Временное ограничение 5 секунд.",
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

      // Проверяем, не достигнут ли лимит накопления времени (30 секунд)
      const currentAccumulatedTime = accumulatedTimeRef.current;
      const maxAccumulation = GAME_CONFIG.MAX_TIME_ACCUMULATION_MS;

      if (currentAccumulatedTime >= maxAccumulation) {
        // Лимит накопления достигнут - время не добавляем, только очки
        time_delta_ms = 0;

      } else {
        // Добавляем базовое время за правильный ответ
        const baseTimeBonus = GAME_CONFIG.TIME_PER_CORRECT_MS;
        const remainingAccumulation = maxAccumulation - currentAccumulatedTime;
        const timeToAdd = Math.min(baseTimeBonus, remainingAccumulation);
        time_delta_ms = timeToAdd;

        const newCombo = stats.combo_count + 1;
        const threshold = GAME_CONFIG.COMBO_THRESHOLDS.find((t) => t.count === newCombo);
        if (threshold) {
          combo_bonus = {
            points: threshold.bonus_points,
            time_ms: threshold.bonus_time_ms,
          };
          points_awarded += threshold.bonus_points;

          // Добавляем бонусное время от комбо, но не превышаем лимит накопления
          if (currentAccumulatedTime + timeToAdd < maxAccumulation) {
            const comboTimeRemaining = maxAccumulation - (currentAccumulatedTime + timeToAdd);
            const comboTimeToAdd = Math.min(threshold.bonus_time_ms, comboTimeRemaining);
            time_delta_ms += comboTimeToAdd;
          }
        }
      }
    } else {
      time_delta_ms = -GAME_CONFIG.TIME_PENALTY_INCORRECT_MS; // -2 секунды за неправильный ответ
    }

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
    // Звуки воспроизводятся сразу при ответе, до обновления состояния
    if (is_correct) {
      // Если есть combo_bonus, значит достигнут порог комбо (3, 5 или 10 правильных ответов подряд)
      if (combo_bonus) {
        const newComboCount = stats.combo_count + 1;
        // Комбо звук воспроизводится сразу для комбо
        sounds.combo(newComboCount);
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

    // Обновляем время с правильной логикой ограничения накопления
    setTimeLeft((prev) => {
      // Вычисляем новое время
      let calculatedTime = prev + time_delta_ms;

      // Если добавляем время (правильный ответ), обновляем счетчик накопленного времени
      if (is_correct && time_delta_ms > 0) {
        accumulatedTimeRef.current = Math.min(
          accumulatedTimeRef.current + time_delta_ms,
          GAME_CONFIG.MAX_TIME_ACCUMULATION_MS
        );
      }

      // Ограничиваем снизу нулем (время не может быть отрицательным)
      calculatedTime = Math.max(calculatedTime, 0);

      // Ограничиваем сверху максимальным временем (90 секунд = 60 стартовых + 30 накопление)
      const finalTime = Math.min(calculatedTime, GAME_CONFIG.MAX_TIME_MS);

      return finalTime;
    });

    // Обновляем прогресс термина
    if (profileId && currentQuestion?.term?.id) {
      if (is_correct) {

        updateTermProgress(profileId, currentQuestion.term.id, true);
      } else {

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
              "race-game-header fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-primary/20 shadow-lg md:hidden",
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
            <div className="flex items-center justify-between px-3 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => endGame('manual')}
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <motion.div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                  whileHover={{ scale: 1.05 }}
                >
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">{stats.total_points}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ultra-Modern Start Screen */}
        {!isGameActive && !isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-md mx-auto w-full px-4 relative"
          >
            {/* Mobile Top Navigation - Absolute Positioned */}
            <div className="absolute -top-12 left-4 md:hidden z-20">
              <Button
                variant="ghost"
                onClick={() => navigate("/games")}
                className="flex items-center gap-2 text-white/70 hover:text-white px-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-base font-medium">Назад</span>
              </Button>
            </div>

            <div className="relative overflow-hidden bg-[#0F1115] border border-white/5 shadow-2xl rounded-[2.5rem] mt-4 md:mt-0">
              {/* Background Ambient Glow */}
              <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-600/20 via-primary/5 to-transparent opacity-60 pointer-events-none" />

              <div className="relative z-10 p-8 flex flex-col items-center text-center">
                {/* Hero Icon */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 relative"
                >
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(59,130,246,0.6)]">
                    <Zap className="w-12 h-12 text-white fill-white" />
                  </div>
                  {/* Decorative particles */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full blur-[8px] opacity-60 animate-pulse" />
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2 mb-8"
                >
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    Гонка
                  </h1>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mx-auto">
                    Переводите слова на скорость. У вас ровно 1 минута, чтобы показать результат.
                  </p>
                </motion.div>

                {/* Stats Row (HUD Style) */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full grid grid-cols-3 gap-2 mb-8"
                >
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-lg font-bold text-white">60с</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Старт</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                    <span className="text-lg font-bold text-emerald-400">+1с</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Бонус</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <X className="w-5 h-5 text-rose-400" strokeWidth={3} />
                    <span className="text-lg font-bold text-rose-400">-2с</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Штраф</span>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full space-y-3"
                >
                  <Button
                    onClick={startGame}
                    disabled={terms.length < 2}
                    style={{ backgroundColor: 'white', color: 'black' }}
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] border-0"
                  >
                    Поехали!
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => navigate("/games")}
                    className="w-full h-10 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors hidden md:block" // Hidden on mobile
                  >
                    Назад
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Premium Game Screen */}
        {isGameActive && session?.current_question && (
          <motion.div
            key={stats.total_answered}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 pb- safe-area-bottom overflow-hidden bg-[#020617]"
          >
            {/* ========================================== */}
            {/* 1. DYNAMIC BACKGROUND (Neumorphism / Glow) */}
            {/* ========================================== */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
              <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-full h-[300px] bg-white/5 blur-[80px] opacity-20" />
            </div>

            {/* ========================================== */}
            {/* 2. HEADER: Timer & Exit */}
            {/* ========================================== */}
            <div className="relative z-20 w-full max-w-3xl flex justify-between items-start pt-[max(env(safe-area-inset-top),20px)] px-2">
              {/* Exit Button (Small & Transparent) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.confirm('Закончить гонку?')) endGame('manual');
                }}
                className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
              >
                <X className="w-6 h-6" />
              </Button>

              {/* CENTER: Premium Neon Timer */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                  {/* Neon Glow Layer */}
                  {timeLeft <= 10000 && (
                    <div className="absolute inset-0 rounded-full bg-red-500/30 blur-xl animate-pulse" />
                  )}

                  <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      className={timeLeft <= 10000 ? 'text-red-500' : 'text-blue-500'}
                      strokeDasharray={2 * Math.PI * 45}
                      initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - timeLeft / GAME_CONFIG.START_TIME_MS) }}
                      transition={{ duration: 0.1, ease: 'linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-xl md:text-2xl font-black ${timeLeft <= 10000 ? 'text-red-400' : 'text-white'}`}>
                      {Math.ceil(timeLeft / 1000)}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">сек</span>
                  </div>
                </div>
              </div>

              {/* Stats Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-bold">{stats.total_points}</span>
              </div>
            </div>

            {/* ========================================== */}
            {/* 3. CENTER CARD: The Term (Glassmorphism & Swipe) */}
            {/* ========================================== */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full max-w-2xl px-4 py-8">

              {/* Swipe Hints - visible only when dragging starts? For now just static hint or inferred */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none opacity-20">
                <X className="w-12 h-12 text-rose-500 md:hidden" />
                <Check className="w-12 h-12 text-emerald-500 md:hidden" />
              </div>

              {/* COMBO & BONUS VISUALIZATION */}
              <AnimatePresence mode="wait">
                {/* 1. CONTINUOUS TEAM COMBO COUNTER (Shows on every hit > 1) */}
                {stats.combo_count > 1 && (
                  <motion.div
                    key={stats.combo_count} // Re-trigger animation on change
                    initial={{ scale: 0.5, opacity: 0, y: 0, rotate: -10 }}
                    animate={{
                      scale: stats.combo_count >= 10 ? 1.5 : stats.combo_count >= 5 ? 1.2 : 1,
                      opacity: 1,
                      y: -20,
                      rotate: 0
                    }}
                    exit={{ scale: 2, opacity: 0, filter: "blur(10px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="absolute z-50 top-[15%] pointer-events-none flex flex-col items-center"
                  >
                    <div className={`
                      font-black italic tracking-tighter leading-none
                      drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]
                      ${stats.combo_count >= 10
                        ? "text-6xl text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]"
                        : stats.combo_count >= 5
                          ? "text-5xl text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]"
                          : "text-4xl text-yellow-400"
                      }
                    `}>
                      {stats.combo_count}x
                    </div>
                    <div className="text-white/80 font-bold uppercase tracking-[0.5em] text-[10px] mt-1">
                      Combo
                    </div>
                    {stats.combo_count >= 5 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-white font-black uppercase text-sm mt-1 bg-rose-500 px-2 py-0.5 rounded rotate-2"
                      >
                        {stats.combo_count >= 10 ? "UNSTOPPABLE!" : "ON FIRE!"}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* 2. BONUS POINTS POPUP (Existing logic for +Points) */}
                {showBonus && (
                  <motion.div
                    key="bonus-popup"
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -80, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 text-5xl font-black text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.8)]"
                    style={{ top: "30%" }}
                  >
                    +{bonusText.match(/\d+/)?.[0]}
                    <span className="text-sm block text-center text-white/80 font-bold uppercase tracking-widest mt-[-5px]">
                      Bonus
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* THE CARD */}
              <motion.div
                className="w-full relative group cursor-grab active:cursor-grabbing"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
                key={session.current_question.question_id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x;
                  if (swipe < -100 || velocity.x < -500) {
                    handleAnswer(false);
                  } else if (swipe > 100 || velocity.x > 500) {
                    handleAnswer(true);
                  }
                }}
                whileDrag={{ scale: 1.05 }}
              >
                {/* Feedback Overlay (Flash on answer) */}
                <AnimatePresence>
                  {lastAnswerCorrect !== null && !showCorrectAnswer && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute -inset-4 z-20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-[2px] ${lastAnswerCorrect ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                        }`}
                    >
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        className={`p-6 rounded-full border-4 ${lastAnswerCorrect ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400' : 'border-rose-400 bg-rose-500/20 text-rose-400'}`}
                      >
                        {lastAnswerCorrect ? <Check className="w-16 h-16" strokeWidth={4} /> : <X className="w-16 h-16" strokeWidth={4} />}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Glass Container */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-12 text-center shadow-2xl select-none">

                  {/* Wrong Answer Explanation Overlay */}
                  <AnimatePresence>
                    {showCorrectAnswer && correctAnswerInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 bg-[#0F1115]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                      >
                        <div className="mb-4 text-rose-500 font-bold uppercase tracking-widest text-sm">Ошибка</div>
                        <div className="text-4xl font-black text-white mb-2">{correctAnswerInfo.term_es}</div>
                        <div className="w-12 h-1 bg-white/20 rounded-full my-4" />
                        <div className="text-2xl font-bold text-emerald-400">{correctAnswerInfo.term_ru}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Term Label */}
                  <div className="mb-6 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-blue-200/60">
                      Испанский
                    </span>
                  </div>

                  {/* MAIN TERM (HUGE) */}
                  <h2 className="text-4xl xs:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8 leading-none tracking-tight">
                    {session.current_question.term.term_es}
                  </h2>

                  {/* Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                  {/* Term Label */}
                  <div className="mb-4 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-indigo-200/60">
                      Русский
                    </span>
                  </div>

                  {/* TRANSLATION */}
                  <h3 className="text-2xl xs:text-3xl md:text-4xl font-bold text-indigo-200 leading-tight">
                    {session.current_question.translation}
                  </h3>

                  {/* Question Text */}
                  <p className="mt-8 text-white/30 text-sm font-medium">Это правильный перевод?</p>

                  {/* Mobile Swipe Hint */}
                  <p className="md:hidden mt-2 text-white/10 text-[10px] animate-pulse">
                    ← Свайп влево (Нет) • Свайп вправо (Да) →
                  </p>
                </div>
              </motion.div>
            </div>

            {/* ========================================== */}
            {/* 4. FOOTER BUTTONS (HUGE TAP ZONES) */}
            {/* ========================================== */}
            <div className="relative z-20 w-full max-w-3xl grid grid-cols-2 gap-4 px-2 pb-[max(env(safe-area-inset-bottom),20px)]">
              {/* NO BUTTON */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="group relative h-20 md:h-24 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg"
                onClick={() => handleAnswer(false)}
                disabled={isPaused}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-600 transition-all group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <X className="w-8 h-8 text-white/90" strokeWidth={3} />
                  <span className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase">Нет</span>

                  {/* Keyboard Hint */}
                  <span className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 text-white/60 text-sm font-bold border border-white/10 absolute right-4">
                    ←
                  </span>
                </div>
              </motion.button>

              {/* YES BUTTON */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="group relative h-20 md:h-24 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg"
                onClick={() => handleAnswer(true)}
                disabled={isPaused}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 transition-all group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <Check className="w-8 h-8 text-white/90" strokeWidth={3} />
                  <span className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase">Да</span>

                  {/* Keyboard Hint */}
                  <span className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 text-white/60 text-sm font-bold border border-white/10 absolute left-4">
                    →
                  </span>
                </div>
              </motion.button>
            </div>

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
        {/* Ultra-Modern Game Over Screen RE-DESIGNED */}
        {isGameOver && !showMistakesReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center w-full max-w-lg mx-auto z-20 px-4 py-8"
          >
            {/* 1. TROPHY HERO ELEMENT */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 bg-yellow-500/40 blur-[60px] animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-400/20 to-orange-500/20 border border-yellow-400/50 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.4)] ring-4 ring-yellow-500/10">
                <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" strokeWidth={1.5} />
              </div>
              {/* Stars decoration */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 -m-4 border border-dashed border-yellow-500/30 rounded-full"
              />
            </motion.div>

            {/* 2. TEXT & SCORE */}
            <div className="text-center space-y-2 mb-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white/80 uppercase tracking-widest"
              >
                Гонка завершена
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="relative"
              >
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_4px_10px_rgba(234,179,8,0.3)]">
                  {stats.total_points}
                </h1>
                <div className="text-sm font-bold text-yellow-500/80 uppercase tracking-[0.5em] mt-2 border-t border-yellow-500/20 pt-2 inline-block px-8">
                  Финальный счет
                </div>
              </motion.div>
            </div>

            {/* 3. STATS GRID (Bento Style) */}
            <div className="grid grid-cols-2 gap-3 w-full mb-10">
              {/* Accuracy */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#1A1D25] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Target className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold text-white">{accuracy}%</span>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Точность</span>
              </motion.div>

              {/* Max Combo */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-[#1A1D25] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/50" />
                <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Flame className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold text-white">{stats.max_combo}x</span>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Макс. серия</span>
              </motion.div>

              {/* Correct */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-[#1A1D25] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Check className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold text-white">{stats.correct_count}</span>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Правильно</span>
              </motion.div>

              {/* Mistakes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-[#1A1D25] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50" />
                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <X className="w-6 h-6 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold text-white">{stats.incorrect_count}</span>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Ошибок</span>
              </motion.div>
            </div>

            {/* 4. ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/")}
                className="flex-1 h-14 rounded-xl font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Меню</span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex-1 h-14 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
              >
                <RotateCw className="w-5 h-5 animate-[spin_3s_linear_infinite]" />
                <span>Играть снова</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );

  // Render Fullscreen for BOTH Active Game and Game Over (and Review)
  if (isGameActive || isGameOver) {
    return (
      <div className="race-game-fullscreen-wrapper fixed inset-0 z-[100] bg-[#020617] overflow-y-auto overflow-x-hidden">
        {/* Dynamic Background (Shared) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-full h-[300px] bg-white/5 blur-[80px] opacity-20" />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 min-h-full flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return <Layout>{content}</Layout>;
};

export default RaceGame;
