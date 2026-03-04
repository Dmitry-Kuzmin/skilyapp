import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, X, Check, Flame, Clock, ArrowLeft, RotateCw, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { toast } from '@/lib/toast';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useMotionValue, useTransform } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { updateTermProgress } from "@/lib/termProgress";

// ============================================
// Game Configuration
// ============================================
const GAME_CONFIG = {
  START_TIME_MS: 60_000,
  MAX_TIME_MS: 90_000,
  MAX_TIME_ACCUMULATION_MS: 30_000,
  TIME_PER_CORRECT_MS: 1_000,
  TIME_PENALTY_INCORRECT_MS: 2_000,
  MIN_ANSWER_INTERVAL_MS: 500,
  BASE_POINTS_PER_CORRECT: 1,
  COMBO_THRESHOLDS: [
    { count: 3, bonus_points: 2, bonus_time_ms: 0 },
    { count: 5, bonus_points: 5, bonus_time_ms: 2_000 },
    { count: 10, bonus_points: 12, bonus_time_ms: 5_000 },
  ],
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

// ============================================
// Swipeable Card Component
// ============================================
interface SwipeCardProps {
  question: GameQuestion;
  onAnswer: (correct: boolean) => void;
  isPaused: boolean;
  lastAnswerCorrect: boolean | null;
  showCorrectAnswer: boolean;
  correctAnswerInfo: { term_es: string; term_ru: string } | null;
  comboCount: number;
  showBonus: boolean;
  bonusText: string;
}

function SwipeCard({
  question,
  onAnswer,
  isPaused,
  lastAnswerCorrect,
  showCorrectAnswer,
  correctAnswerInfo,
  comboCount,
  showBonus,
  bonusText,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const cardOpacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0]);
  const leftIndicatorOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center w-full max-w-2xl px-4 py-4">
      {/* Swipe direction indicators */}
      <motion.div
        style={{ opacity: leftIndicatorOpacity }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none"
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-500/30 border-2 border-rose-400 backdrop-blur-md flex items-center justify-center">
          <X className="w-7 h-7 text-rose-400" strokeWidth={3} />
        </div>
        <span className="text-rose-400 font-black text-xs uppercase tracking-widest">Нет</span>
      </motion.div>
      <motion.div
        style={{ opacity: rightIndicatorOpacity }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/30 border-2 border-emerald-400 backdrop-blur-md flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-400" strokeWidth={3} />
        </div>
        <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">Да</span>
      </motion.div>

      {/* Combo */}
      <AnimatePresence>
        {comboCount > 1 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: comboCount >= 10 ? 1.4 : comboCount >= 5 ? 1.2 : 1, opacity: 1, y: -10 }}
            exit={{ scale: 2, opacity: 0, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="absolute z-50 top-[5%] pointer-events-none flex flex-col items-center"
          >
            <div className={cn(
              "font-black italic tracking-tighter leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]",
              comboCount >= 10 ? "text-5xl text-rose-500 animate-pulse" :
                comboCount >= 5 ? "text-4xl text-orange-400" : "text-3xl text-yellow-400"
            )}>
              {comboCount}x
            </div>
            <div className="text-white/70 font-bold uppercase tracking-[0.4em] text-[9px]">Combo</div>
          </motion.div>
        )}
        {showBonus && (
          <motion.div
            key="bonus"
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1.4 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 text-4xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] top-[20%] pointer-events-none"
          >
            +{bonusText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE CARD */}
      <motion.div
        className="w-full relative cursor-grab active:cursor-grabbing select-none"
        key={question.question_id}
        style={{ x, rotate, opacity: cardOpacity }}
        drag={isPaused ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, { offset, velocity }) => {
          if (offset.x < -100 || velocity.x < -500) {
            onAnswer(false);
          } else if (offset.x > 100 || velocity.x > 500) {
            onAnswer(true);
          }
          x.set(0);
        }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        whileDrag={{ scale: 1.03 }}
      >
        {/* Feedback flash */}
        <AnimatePresence>
          {lastAnswerCorrect !== null && !showCorrectAnswer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute -inset-3 z-20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-[2px]",
                lastAnswerCorrect ? "bg-emerald-500/20" : "bg-rose-500/20"
              )}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                className={cn(
                  "p-5 rounded-full border-4",
                  lastAnswerCorrect
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                    : "border-rose-400 bg-rose-500/20 text-rose-400"
                )}
              >
                {lastAnswerCorrect
                  ? <Check className="w-12 h-12" strokeWidth={4} />
                  : <X className="w-12 h-12" strokeWidth={4} />}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card body */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 px-8 py-10 text-center shadow-2xl">
          {/* Wrong Answer Overlay */}
          <AnimatePresence>
            {showCorrectAnswer && correctAnswerInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#0F1115]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center rounded-[2.5rem]"
              >
                <div className="mb-3 text-rose-500 font-bold uppercase tracking-widest text-xs">Ошибка</div>
                <div className="text-3xl font-black text-white mb-2">{correctAnswerInfo.term_es}</div>
                <div className="w-10 h-0.5 bg-white/20 rounded-full my-4" />
                <div className="text-xl font-bold text-emerald-400">{correctAnswerInfo.term_ru}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-5 flex justify-center">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/60">
              Испанский
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-7 leading-none tracking-tight">
            {question.term.term_es}
          </h2>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-7" />

          <div className="mb-4 flex justify-center">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60">
              Русский
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-bold text-indigo-200 leading-tight">
            {question.translation}
          </h3>

          <p className="mt-7 text-white/30 text-sm font-medium">Это правильный перевод?</p>
        </div>
      </motion.div>

      {/* Swipe hint */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 flex items-center gap-3 text-white/20 text-xs font-medium select-none"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>свайп влево — нет</span>
        <span className="mx-1 text-white/10">•</span>
        <span>свайп вправо — да</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </motion.div>
    </div>
  );
}

// ============================================
// Main RaceGame Component
// ============================================
const RaceGame = () => {
  const navigate = useNavigate();
  const { profileId } = useUserContext();

  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [session, setSession] = useState<RaceSession | null>(null);
  const [stats, setStats] = useState<GameStats>({
    total_points: 0, correct_count: 0, incorrect_count: 0,
    combo_count: 0, max_combo: 0, consecutive_misses: 0,
    total_answered: 0, suspect_attempts: 0, last_answer_ts: 0,
  });
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusText, setBonusText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswerInfo, setCorrectAnswerInfo] = useState<{ term_es: string; term_ru: string } | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);

  const lastAnswerTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");
  const accumulatedTimeRef = useRef<number>(0);
  const endGameCalledRef = useRef(false);

  useEffect(() => { loadTerms(); }, []);

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
      if (e.key === "ArrowLeft") { e.preventDefault(); handleAnswer(false); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleAnswer(true); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameActive, isPaused, session?.current_question]);

  // Hide global navbar during game
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

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru")
        .limit(150);
      if (error) { toast.error("Ошибка", { description: error.message }); return; }
      if (data && data.length > 0) {
        setTerms([...data].sort(() => Math.random() - 0.5));
      } else {
        toast.error("Нет данных", { description: "В базе нет терминов" });
      }
    } catch (err: any) {
      toast.error("Ошибка", { description: err?.message });
    }
  };

  const generateQuestion = (termList = terms): GameQuestion | null => {
    if (termList.length < 2) return null;
    const term = termList[Math.floor(Math.random() * termList.length)];
    const showCorrect = Math.random() > 0.5;
    const translation = showCorrect
      ? term.term_ru
      : termList.filter(t => t.id !== term.id)[Math.floor(Math.random() * (termList.length - 1))]?.term_ru ?? term.term_ru;
    return {
      question_id: `q_${Date.now()}_${Math.random()}`,
      term, translation,
      is_correct: showCorrect || translation === term.term_ru,
      server_ts: Date.now(),
    };
  };

  const startGame = () => {
    if (terms.length < 2) {
      toast.error("Недостаточно данных", { description: "Нужно минимум 2 термина" });
      return;
    }
    const session_id = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = session_id;
    endGameCalledRef.current = false;
    const firstQuestion = generateQuestion();
    if (!firstQuestion) return;
    setSession({ session_id, start_ts: Date.now(), remaining_time_ms: GAME_CONFIG.START_TIME_MS, current_question: firstQuestion });
    setTimeLeft(GAME_CONFIG.START_TIME_MS);
    setIsGameActive(true);
    setIsGameOver(false);
    setStats({ total_points: 0, correct_count: 0, incorrect_count: 0, combo_count: 0, max_combo: 0, consecutive_misses: 0, total_answered: 0, suspect_attempts: 0, last_answer_ts: 0 });
    setLastAnswerCorrect(null);
    setShowCorrectAnswer(false);
    setCorrectAnswerInfo(null);
    setMistakes([]);
    lastAnswerTimeRef.current = 0;
    accumulatedTimeRef.current = 0;
  };

  const handleAnswer = (chosen: boolean) => {
    if (!isGameActive || isPaused || !session?.current_question) return;

    const question = session.current_question;
    const now = Date.now();
    const timeSinceLastAnswer = now - lastAnswerTimeRef.current;
    if (timeSinceLastAnswer < GAME_CONFIG.MIN_ANSWER_INTERVAL_MS && lastAnswerTimeRef.current > 0) return;

    const is_correct = chosen === question.is_correct;
    lastAnswerTimeRef.current = now;

    let time_delta_ms = 0;
    let points_awarded = 0;
    let combo_bonus: { points: number; time_ms: number } | null = null;

    if (is_correct) {
      points_awarded = GAME_CONFIG.BASE_POINTS_PER_CORRECT;
      const acc = accumulatedTimeRef.current;
      const maxAcc = GAME_CONFIG.MAX_TIME_ACCUMULATION_MS;
      if (acc < maxAcc) {
        const baseBonus = Math.min(GAME_CONFIG.TIME_PER_CORRECT_MS, maxAcc - acc);
        time_delta_ms = baseBonus;
        const newCombo = stats.combo_count + 1;
        const threshold = GAME_CONFIG.COMBO_THRESHOLDS.find(t => t.count === newCombo);
        if (threshold) {
          combo_bonus = { points: threshold.bonus_points, time_ms: threshold.bonus_time_ms };
          points_awarded += threshold.bonus_points;
        }
      }
      if (combo_bonus) { sounds.combo(stats.combo_count + 1); haptics.combo(); }
      else { sounds.correctAnswer(); haptics.correctAnswer(); }
    } else {
      time_delta_ms = -GAME_CONFIG.TIME_PENALTY_INCORRECT_MS;
      sounds.wrongAnswer(); haptics.wrongAnswer();
      setMistakes(prev => [...prev, {
        term_es: question.term.term_es,
        term_ru_correct: question.term.term_ru,
        term_ru_shown: question.translation,
        user_answer: chosen,
        question_id: question.question_id,
      }]);
      setCorrectAnswerInfo({ term_es: question.term.term_es, term_ru: question.term.term_ru });
      setShowCorrectAnswer(true);
    }

    setLastAnswerCorrect(is_correct);

    setStats(prev => {
      const newCombo = is_correct ? prev.combo_count + 1 : 0;
      return {
        ...prev,
        total_points: prev.total_points + points_awarded,
        correct_count: is_correct ? prev.correct_count + 1 : prev.correct_count,
        incorrect_count: is_correct ? prev.incorrect_count : prev.incorrect_count + 1,
        combo_count: newCombo,
        max_combo: Math.max(prev.max_combo, newCombo),
        consecutive_misses: is_correct ? 0 : prev.consecutive_misses + 1,
        total_answered: prev.total_answered + 1,
        last_answer_ts: now,
      };
    });

    setTimeLeft(prev => {
      let t = prev + time_delta_ms;
      if (is_correct && time_delta_ms > 0) {
        accumulatedTimeRef.current = Math.min(accumulatedTimeRef.current + time_delta_ms, GAME_CONFIG.MAX_TIME_ACCUMULATION_MS);
      }
      return Math.min(Math.max(t, 0), GAME_CONFIG.MAX_TIME_MS);
    });

    if (profileId && question.term.id) {
      updateTermProgress(profileId, question.term.id, is_correct);
    }

    if (is_correct && combo_bonus) {
      setBonusText(String(combo_bonus.points));
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1500);
    }

    const delay = !is_correct ? 1800 : 400;
    setTimeout(() => {
      setShowCorrectAnswer(false);
      setCorrectAnswerInfo(null);
      const next = generateQuestion();
      if (next) {
        setSession(prev => prev ? { ...prev, current_question: next } : null);
        setLastAnswerCorrect(null);
      }
    }, delay);
  };

  const endGame = async (reason: "time_up" | "manual" = "manual") => {
    if (endGameCalledRef.current) return;
    endGameCalledRef.current = true;
    setIsGameActive(false);
    setShowCorrectAnswer(false);
    setCorrectAnswerInfo(null);
    setIsGameOver(true);

    // Use functional update to get latest stats
    setStats(latestStats => {
      const xp_awarded = latestStats.correct_count * GAME_CONFIG.XP_PER_CORRECT;
      void xp_awarded;

      if (latestStats.total_points >= 10) {
        sounds.victory();
        haptics.victory();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      if (profileId) {
        const sessionData = {
          user_id: profileId,
          game_type: "race",
          score: Math.min(Math.max(0, latestStats.total_points), 100),
          total_questions: Math.min(Math.max(1, latestStats.total_answered), 100),
          duration_seconds: Math.min(Math.max(0, Math.floor((Date.now() - (session?.start_ts ?? Date.now())) / 1000)), 7200),
        };
        supabase.from("game_sessions").insert(sessionData as any).then(({ error }) => {
          if (error) console.error("Failed to save game session:", error);
        });
      }

      return latestStats;
    });
  };

  const accuracy = stats.total_answered > 0
    ? Math.round((stats.correct_count / stats.total_answered) * 100)
    : 0;

  // ============================================
  // RENDER: Active Game (Fullscreen)
  // ============================================
  if (isGameActive && session?.current_question) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col">
        {showConfetti && (
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.3} />
        )}

        {/* Ambient backgrounds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <div className="relative z-20 flex justify-between items-center px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { if (window.confirm('Закончить гонку?')) endGame('manual'); }}
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Points badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-bold text-sm">{stats.total_points}</span>
          </div>

          {/* Circular timer */}
          <div className="relative w-12 h-12">
            {timeLeft <= 10000 && (
              <div className="absolute inset-0 rounded-full bg-red-500/30 blur-md animate-pulse" />
            )}
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="19" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
              <motion.circle
                cx="22" cy="22" r="19"
                stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
                className={timeLeft <= 10000 ? "text-red-500" : "text-blue-500"}
                strokeDasharray={2 * Math.PI * 19}
                animate={{ strokeDashoffset: 2 * Math.PI * 19 * (1 - timeLeft / GAME_CONFIG.START_TIME_MS) }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-xs font-black", timeLeft <= 10000 ? "text-red-400" : "text-white")}>
                {Math.ceil(timeLeft / 1000)}
              </span>
            </div>
          </div>
        </div>

        {/* Combo bar */}
        {stats.combo_count >= 2 && (
          <div className="relative z-10 flex justify-center pb-1">
            <motion.div
              key={stats.combo_count}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                stats.combo_count >= 10 ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                  stats.combo_count >= 5 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}
            >
              <Flame className="w-3 h-3" />
              {stats.combo_count}x комбо
            </motion.div>
          </div>
        )}

        {/* Card */}
        <SwipeCard
          question={session.current_question}
          onAnswer={handleAnswer}
          isPaused={isPaused}
          lastAnswerCorrect={lastAnswerCorrect}
          showCorrectAnswer={showCorrectAnswer}
          correctAnswerInfo={correctAnswerInfo}
          comboCount={stats.combo_count}
          showBonus={showBonus}
          bonusText={bonusText}
        />

        {/* Bottom buttons */}
        <div className="relative z-20 grid grid-cols-2 gap-3 px-4 pb-[max(env(safe-area-inset-bottom),20px)]">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="group relative h-[72px] rounded-2xl overflow-hidden shadow-lg"
            onClick={() => handleAnswer(false)}
            disabled={isPaused}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-600" />
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <X className="w-7 h-7 text-white/90" strokeWidth={3} />
              <span className="text-xl font-black text-white uppercase">Нет</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="group relative h-[72px] rounded-2xl overflow-hidden shadow-lg"
            onClick={() => handleAnswer(true)}
            disabled={isPaused}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600" />
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <Check className="w-7 h-7 text-white/90" strokeWidth={3} />
              <span className="text-xl font-black text-white uppercase">Да</span>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Game Over (Fullscreen)
  // ============================================
  if (isGameOver) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] overflow-y-auto">
        {showConfetti && (
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.3} />
        )}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center px-4 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)] min-h-full">
          {/* Trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mt-6 mb-5"
          >
            <div className="absolute inset-0 bg-yellow-500/40 blur-[50px] animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400/20 to-orange-500/20 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.3)]">
              <Trophy className="w-12 h-12 text-yellow-400" strokeWidth={1.5} />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-3 border border-dashed border-yellow-500/25 rounded-full"
            />
          </motion.div>

          {/* Score */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1"
          >
            Гонка завершена
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-center mb-6"
          >
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600">
              {stats.total_points}
            </h1>
            <div className="text-xs font-bold text-yellow-500/70 uppercase tracking-[0.4em] mt-1">Финальный счёт</div>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-4 gap-2 w-full max-w-sm mb-5"
          >
            {[
              { icon: <Target className="w-4 h-4 text-blue-400" />, value: `${accuracy}%`, label: "Точность", color: "blue" },
              { icon: <Flame className="w-4 h-4 text-orange-400" />, value: `${stats.max_combo}x`, label: "Серия", color: "orange" },
              { icon: <Check className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />, value: stats.correct_count, label: "Верно", color: "emerald" },
              { icon: <X className="w-4 h-4 text-rose-400" strokeWidth={2.5} />, value: stats.incorrect_count, label: "Ошибок", color: "rose" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1"
              >
                {s.icon}
                <span className="text-base font-bold text-white">{s.value}</span>
                <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Mistakes list (compact, inline) */}
          {mistakes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="w-full max-w-sm mb-5"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <X className="w-3.5 h-3.5 text-rose-400" strokeWidth={2.5} />
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Разбор ошибок</span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                {mistakes.slice(0, 10).map((m, i) => (
                  <motion.div
                    key={m.question_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-[10px] font-black text-rose-400 mt-0.5 min-w-[16px]">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{m.term_es}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-white/30 line-through truncate">{m.term_ru_shown}</span>
                        <span className="text-white/20 text-[10px]">→</span>
                        <span className="text-[11px] text-emerald-400 font-semibold truncate">{m.term_ru_correct}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {mistakes.length > 10 && (
                  <div className="text-center text-xs text-white/30 py-1">+{mistakes.length - 10} ещё</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="flex gap-3 w-full max-w-sm"
          >
            <button
              onClick={() => navigate("/games")}
              className="flex-1 h-12 rounded-xl font-bold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Меню
            </button>
            <button
              onClick={startGame}
              className="flex-1 h-12 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RotateCw className="w-4 h-4" />
              Снова
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Start Screen (full-height, no navbar)
  // ============================================
  return (
    <Layout hideNavigation>
      <div className="min-h-[calc(100vh-0px)] flex flex-col items-center justify-center px-4 py-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Back */}
          <button
            onClick={() => navigate("/games")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>

          {/* Card */}
          <div className="relative overflow-hidden bg-[#0F1115] border border-white/5 shadow-2xl rounded-3xl">
            <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-blue-600/20 via-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10 p-7 flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-5 relative"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_30px_-8px_rgba(59,130,246,0.7)]">
                  <Zap className="w-10 h-10 text-white fill-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full blur-[6px] opacity-60 animate-pulse" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mb-6"
              >
                <h1 className="text-2xl font-black text-white tracking-tight mb-1.5">Гонка</h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[240px] mx-auto">
                  Переводите слова на скорость. Правильно — +1с, ошибка — −2с.
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full grid grid-cols-3 gap-2 mb-6"
              >
                {[
                  { icon: <Clock className="w-4 h-4 text-blue-400" />, value: "60с", label: "Старт" },
                  { icon: <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />, value: "+1с", color: "text-emerald-400", label: "Бонус" },
                  { icon: <X className="w-4 h-4 text-rose-400" strokeWidth={3} />, value: "−2с", color: "text-rose-400", label: "Штраф" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/5 border border-white/5">
                    {s.icon}
                    <span className={cn("text-base font-bold", s.color ?? "text-white")}>{s.value}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">{s.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="w-full"
              >
                <Button
                  onClick={startGame}
                  disabled={terms.length < 2}
                  className="w-full h-13 text-base rounded-2xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 shadow-[0_0_25px_-5px_rgba(59,130,246,0.5)] border-0"
                >
                  Поехали!
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default RaceGame;
