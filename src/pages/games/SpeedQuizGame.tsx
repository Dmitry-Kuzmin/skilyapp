import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Zap, Trophy, X, Check, Flame, Clock, ArrowLeft, 
  RotateCw, Target, ChevronRight, Brain, Gauge, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { toast } from '@/lib/toast';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getQuestionsForLang, SpeedQuestion } from "@/data/games/speedQuestionsProxy";

// ============================================
// Game Configuration
// ============================================
const GAME_CONFIG = {
  START_TIME_MS: 45_000,
  MAX_TIME_MS: 60_000,
  TIME_PER_CORRECT_MS: 2_000,
  TIME_PENALTY_INCORRECT_MS: 5_000,
  BASE_POINTS_PER_CORRECT: 10,
  COMBO_BONUS_FACTOR: 2, // Extra points per combo level
  TOTAL_QUESTIONS: 100,
} as const;

interface GameStats {
  score: number;
  correct: number;
  incorrect: number;
  combo: number;
  maxCombo: number;
  totalAnswered: number;
}

interface Mistake {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

const SpeedQuizGame = () => {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { language } = useLanguage();
  const lang = (language === 'ru' || language === 'es' || language === 'en') ? language : 'es';

  // Localization
  const LABELS = {
    ru: {
      title: "ЗНАЙ СКОРОСТИ",
      description: "Проверь свои знания лимитов скорости Испании. У тебя есть 45 секунд. Каждый правильный ответ дает время, каждая ошибка — забирает 5 сек.",
      time: "Время",
      questions: "Вопросов",
      start: "ПОЕХАЛИ",
      back: "Назад к играм",
      score: "Счет",
      combo: "Комбо",
      correct: "ВЕРНО",
      wrong: "ОШИБКА",
      explanation: "Пояснение DGT",
      next: "СЛЕДУЮЩИЙ",
      gameOver: "ИГРА ОКОНЧЕНА",
      yourScore: "Твой результат",
      accuracy: "Точность",
      maxCombo: "Макс. комбо",
      playAgain: "ИГРАТЬ СНОВА",
      mistakesTitle: "Разбор ошибок",
      correctAnswer: "Правильный ответ",
      yourAnswer: "Твой ответ"
    },
    es: {
      title: "CONOCE LAS VELOCIDADES",
      description: "Pon a prueba tus conocimientos sobre los límites de velocidad en España. Tienes 45 segundos. Cada acierto suma tiempo, cada error resta 5 seg.",
      time: "Tiempo",
      questions: "Preguntas",
      start: "VAMOS",
      back: "Volver a juegos",
      score: "Puntos",
      combo: "Combo",
      correct: "CORRECTO",
      wrong: "ERROR",
      explanation: "Explicación DGT",
      next: "SIGUIENTE",
      gameOver: "FIN DEL JUEGO",
      yourScore: "Tu puntuación",
      accuracy: "Precisión",
      maxCombo: "Combo máx.",
      playAgain: "JUGAR DE NUEVO",
      mistakesTitle: "Repaso de errores",
      correctAnswer: "Respuesta correcta",
      yourAnswer: "Tu respuesta"
    },
    en: {
      title: "SPEED MASTER",
      description: "Test your knowledge of speed limits in Spain. You have 45 seconds. Each correct answer adds time, each error deducts 5 sec.",
      time: "Time",
      questions: "Questions",
      start: "START",
      back: "Back to games",
      score: "Score",
      combo: "Combo",
      correct: "CORRECT",
      wrong: "WRONG",
      explanation: "DGT Explanation",
      next: "NEXT",
      gameOver: "GAME OVER",
      yourScore: "Your Score",
      accuracy: "Accuracy",
      maxCombo: "Max Combo",
      playAgain: "PLAY AGAIN",
      mistakesTitle: "Review Mistakes",
      correctAnswer: "Correct Answer",
      yourAnswer: "Your Answer"
    }
  }[lang];

  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<SpeedQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.START_TIME_MS);
  const [stats, setStats] = useState<GameStats>({
    score: 0, correct: 0, incorrect: 0, combo: 0, maxCombo: 0, totalAnswered: 0
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionsQueue = useRef<SpeedQuestion[]>([]);

  // Initialize and shuffle questions
  const initGame = useCallback(() => {
    const questionsForLang = getQuestionsForLang(lang);
    console.log("initGame:", lang, "questions loaded:", questionsForLang.length);

    if (questionsForLang.length === 0) {
      toast.error("Questions not loaded. Please refresh.");
      return;
    }
    questionsQueue.current = [...questionsForLang].sort(() => Math.random() - 0.5);
    const first = questionsQueue.current.pop() || null;
    setCurrentQuestion(first);
    setStats({ score: 0, correct: 0, incorrect: 0, combo: 0, maxCombo: 0, totalAnswered: 0 });
    setMistakes([]);
    setTimeLeft(GAME_CONFIG.START_TIME_MS);
    setIsGameOver(false);
    setIsStarted(true);
    setSelectedOption(null);
  }, [lang]);

  // Timer logic
  useEffect(() => {
    if (isStarted && !isGameOver && selectedOption === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 100) {
            endGame();
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isGameOver, selectedOption]);

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null || !currentQuestion) return;

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setSelectedOption(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      sounds.correctAnswer();
      haptics.correctAnswer();
      
      const points = GAME_CONFIG.BASE_POINTS_PER_CORRECT + (stats.combo * GAME_CONFIG.COMBO_BONUS_FACTOR);
      
      setStats(prev => {
        const newCombo = prev.combo + 1;
        return {
          ...prev,
          score: prev.score + points,
          correct: prev.correct + 1,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          totalAnswered: prev.totalAnswered + 1
        };
      });

      setTimeLeft(prev => Math.min(prev + GAME_CONFIG.TIME_PER_CORRECT_MS, GAME_CONFIG.MAX_TIME_MS));

      // Small delay before next question (4s to read)
      transitionTimerRef.current = setTimeout(() => {
        nextQuestion();
      }, 4000);
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      
      setStats(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        combo: 0,
        totalAnswered: prev.totalAnswered + 1
      }));

      setMistakes(prev => [...prev, {
        question: currentQuestion.question,
        userAnswer: currentQuestion.options[optionIndex].text,
        correctAnswer: currentQuestion.options[currentQuestion.correctIndex].text,
        explanation: currentQuestion.options[currentQuestion.correctIndex].comment
      }]);

      setTimeLeft(prev => Math.max(prev - GAME_CONFIG.TIME_PENALTY_INCORRECT_MS, 0));
      
      // Delay before next question to show the mistake (4s to read)
      transitionTimerRef.current = setTimeout(() => {
        nextQuestion();
      }, 4000);
    }
  };

  const handleScreenClick = () => {
    if (selectedOption !== null) {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      nextQuestion();
    }
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    
    if (questionsQueue.current.length === 0) {
      endGame();
      return;
    }

    const next = questionsQueue.current.pop() || null;
    setCurrentQuestion(next);
  };

  const endGame = async () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setIsGameOver(true);
    setIsStarted(false);

    if (stats.score > 100) {
      setShowConfetti(true);
      sounds.victory();
      setTimeout(() => setShowConfetti(false), 5000);
    }

    // Save session to Supabase
    if (profileId) {
      try {
        const { error } = await supabase.from('game_sessions').insert({
          user_id: profileId,
          game_type: 'speed_quiz',
          score: stats.score,
          total_questions: stats.totalAnswered,
          duration_seconds: Math.floor((GAME_CONFIG.START_TIME_MS + (stats.correct * GAME_CONFIG.TIME_PER_CORRECT_MS) - timeLeft) / 1000)
        });
        if (error) console.error("Error saving session:", error);
      } catch (e) {
        console.error("Failed to save game session", e);
      }
    }
  };

  const accuracy = stats.totalAnswered > 0 
    ? Math.round((stats.correct / stats.totalAnswered) * 100) 
    : 0;

  // Render Start Screen
  if (!isStarted && !isGameOver) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full" />
            <Gauge className="w-24 h-24 text-blue-400 mx-auto relative" strokeWidth={1.5} />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{LABELS.title}</h1>
            <p className="text-blue-200/60 font-medium leading-relaxed">
              {LABELS.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-[10px] font-bold text-white/40 uppercase">{LABELS.time}</div>
              <div className="text-xl font-black text-white">{GAME_CONFIG.START_TIME_MS / 1000} {lang === 'ru' ? 'сек' : 'sec'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-[10px] font-bold text-white/40 uppercase">{LABELS.questions}</div>
              <div className="text-xl font-black text-white">{GAME_CONFIG.TOTAL_QUESTIONS}</div>
            </div>
          </div>

          <Button 
            onClick={initGame}
            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-xl font-black shadow-xl shadow-blue-600/20 group"
          >
            {LABELS.start}
            <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <button onClick={() => navigate('/games')} className="text-white/40 font-bold hover:text-white transition-colors">
            {LABELS.back}
          </button>
        </motion.div>
      </div>
    );
  }

  // Render Game Over Screen
  if (isGameOver) {
    return (
      <div className="min-h-screen bg-[#020617] overflow-y-auto p-6 pb-20">
        {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}
        
        <div className="max-w-2xl mx-auto space-y-8 pt-10">
          <div className="text-center space-y-2">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-[0.3em]">{LABELS.yourScore}</h2>
            <div className="text-7xl font-black text-white">{stats.score}</div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: LABELS.correct, value: stats.correct, color: 'text-emerald-400' },
              { label: LABELS.wrong, value: stats.incorrect, color: 'text-rose-400' },
              { label: LABELS.accuracy, value: `${accuracy}%`, color: 'text-blue-400' },
              { label: LABELS.combo, value: `${stats.maxCombo}x`, color: 'text-orange-400' }
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                <div className={cn("text-xl font-black mb-1", s.color)}>{s.value}</div>
                <div className="text-[8px] font-bold text-white/30 uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {mistakes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Brain className="w-4 h-4" /> {LABELS.mistakesTitle}
              </h3>
              <div className="space-y-3">
                {mistakes.map((m, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                    <p className="text-white font-bold">{m.question}</p>
                    <div className="flex gap-4 text-xs">
                      <div className="flex-1">
                        <span className="text-white/30 block mb-1">{LABELS.yourAnswer}:</span>
                        <span className="text-rose-400 line-through font-bold">{m.userAnswer}</span>
                      </div>
                      <div className="flex-1 border-l border-white/10 pl-4">
                        <span className="text-white/30 block mb-1">{LABELS.correctAnswer}:</span>
                        <span className="text-emerald-400 font-bold">{m.correctAnswer}</span>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-xl flex gap-3 items-start">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-200/70 leading-normal italic">{m.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={initGame} className="flex-1 h-16 rounded-2xl bg-white text-black hover:bg-white/90 text-lg font-black">
              <RotateCw className="w-5 h-5 mr-2" /> {LABELS.playAgain}
            </Button>
            <Button onClick={() => navigate('/games')} variant="outline" className="flex-1 h-16 rounded-2xl border-white/10 text-white hover:bg-white/5 text-lg font-black">
              {LABELS.back}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active Game Render
  return (
    <div 
      onClick={handleScreenClick}
      className="fixed inset-0 z-50 bg-[#020617] flex flex-col overflow-hidden select-none"
    >
      {/* HUD Header */}
      <div className="p-4 grid grid-cols-3 items-center relative z-20">
        <button onClick={endGame} className="text-white/30 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/5" strokeWidth="2" />
              <motion.circle 
                cx="18" cy="18" r="16" fill="none" 
                className={cn(timeLeft < 10000 ? "stroke-rose-500" : "stroke-blue-500")}
                strokeWidth="2" strokeDasharray="100" 
                animate={{ strokeDashoffset: 100 - (timeLeft / GAME_CONFIG.START_TIME_MS * 100) }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-lg font-black", timeLeft < 10000 ? "text-rose-400" : "text-white")}>
                {Math.ceil(timeLeft / 1000)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-black">{stats.score}</span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col px-6 py-4 justify-between max-w-2xl mx-auto w-full">
        
        {/* Category & Combo */}
        <div className="text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest">
            {currentQuestion?.category}
          </div>
          
          <AnimatePresence mode="wait">
            {stats.combo > 1 && (
              <motion.div 
                key={stats.combo}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Flame className={cn("w-6 h-6", stats.combo > 5 ? "text-orange-500 fill-orange-500" : "text-yellow-400 fill-yellow-400")} />
                <span className="text-3xl font-black italic text-white drop-shadow-glow">{stats.combo}x {LABELS.combo}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                {currentQuestion?.category}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white text-center leading-tight">
              {currentQuestion?.question}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {currentQuestion?.options.map((option, idx) => {
            const isCorrect = idx === currentQuestion.correctIndex;
            const isSelected = selectedOption === idx;
            
            let btnClass = "bg-white/5 border-white/10 text-white hover:bg-white/10";
            if (isSelected) {
              btnClass = isCorrect 
                ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                : "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20";
            } else if (selectedOption !== null && isCorrect) {
              btnClass = "bg-emerald-500/40 border-emerald-400 text-white";
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(idx)}
                disabled={selectedOption !== null}
                className={cn(
                  "min-h-[5rem] px-6 py-4 rounded-2xl border-2 font-bold text-left transition-all duration-200 flex flex-col justify-center",
                  btnClass
                )}
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span className="text-sm md:text-base leading-tight">{option.text}</span>
                  {isSelected && (isCorrect ? <Check className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />)}
                </div>
                {selectedOption !== null && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-[10px] md:text-xs mt-2 opacity-80 font-medium leading-tight border-t border-white/10 pt-2"
                  >
                    {option.comment}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default SpeedQuizGame;
