import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Trophy, Zap, Star, Brain, Flame, Sparkles, Languages, Gauge, RotateCw } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { updateTermProgress } from "@/lib/termProgress";
import { cn } from "@/lib/utils";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
}

interface GameQuestion {
  question_id: string;
  term: LanguageTerm;
  correct_answer: string;
  options: string[];
}

const LexiconGame = () => {
  const navigate = useNavigate();

  const { profileId } = useUserContext();
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalQuestions] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const generateQuestion = useCallback((allTerms: LanguageTerm[]) => {
    if (allTerms.length < 4) return;

    // Pick random term as correct answer
    const randomIndex = Math.floor(Math.random() * allTerms.length);
    const correctTerm = allTerms[randomIndex];

    // Get 3 wrong terms for options
    const wrongTerms = allTerms
      .filter((t) => t.id !== correctTerm.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Create options array with correct answer + 3 wrong
    const allOptions = [
      correctTerm.term_ru,
      ...wrongTerms.map((t) => t.term_ru),
    ].sort(() => Math.random() - 0.5);

    setCurrentQuestion({
      question_id: `q_${Date.now()}_${Math.random()}`,
      term: correctTerm,
      correct_answer: correctTerm.term_ru,
      options: allOptions,
    });
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, []);

  useEffect(() => {
    if (terms.length >= 4 && questionNumber < totalQuestions && !isGameOver && !currentQuestion) {
      generateQuestion(terms);
    }
  }, [terms, questionNumber, isGameOver, currentQuestion, generateQuestion, totalQuestions]);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru")
        .limit(200);

      if (error) {
        toast.error(`Не удалось загрузить термины: ${error.message}`);
        return;
      }

      if (data && data.length >= 4) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setTerms(shuffled);
      } else {
        toast.error("Нужно минимум 4 термина для игры");
      }
    } catch (err: any) {
      console.error("Error loading terms:", err);
      toast.error(`Произошла ошибка: ${err?.message || "Неизвестная ошибка"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;

    const correct = answer === currentQuestion.correct_answer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + (100 + streak * 10)); // Bonus points for streak
      setCorrectAnswers((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > maxStreak) setMaxStreak(newStreak);
        return newStreak;
      });
      sounds.correctAnswer();
      haptics.correctAnswer();

      // Обновляем прогресс термина
      if (profileId && currentQuestion?.term?.id) {
        updateTermProgress(profileId, currentQuestion.term.id, true);
      }
    } else {
      setWrongAnswers((prev) => prev + 1);
      setStreak(0);
      sounds.wrongAnswer();
      haptics.wrongAnswer();

      // Обновляем прогресс термина (неправильный ответ)
      if (profileId && currentQuestion?.term?.id) {
        updateTermProgress(profileId, currentQuestion.term.id, false);
      }
    }

    // Move to next question after delay
    setTimeout(() => {
      if (questionNumber + 1 >= totalQuestions) {
        endGame();
      } else {
        setQuestionNumber((prev) => prev + 1);
        setCurrentQuestion(null);
      }
    }, 1800);
  };

  const startGame = () => {
    setScore(0);
    setQuestionNumber(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setStreak(0);
    setMaxStreak(0);
    setIsGameOver(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowConfetti(false);
    setCurrentQuestion(null);
    generateQuestion(terms);
  };

  const endGame = async () => {
    setIsGameOver(true);
    if (correctAnswers >= totalQuestions * 0.7) {
      sounds.victory();
      haptics.victory();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    if (profileId) {
      const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
      const sessionData = {
        user_id: profileId,
        game_type: "four_variants",
        score: accuracy,
        total_questions: totalQuestions,
        duration_seconds: 300,
      };
      const { error } = await supabase.from("game_sessions").insert(sessionData);
      if (error) {
        console.error("Failed to save game session:", error);
      }
    }
  };

  const progress = (questionNumber / totalQuestions) * 100;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={300}
          gravity={0.2}
          colors={['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']}
        />
      )}

      <div className="min-h-[calc(100vh-80px)] bg-transparent flex flex-col pt-4 md:pt-8 pb-10">
        <div className="container max-w-4xl mx-auto px-4 space-y-8 flex-1 flex flex-col">

          {/* Top Navigation & Progress */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/games")}
                className="rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all active:scale-95"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Выход
              </Button>

              <div className="flex items-center gap-4">
                <AnimatePresence mode="wait">
                  {streak >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -10 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 font-black shadow-lg shadow-orange-500/10"
                    >
                      <Flame className="w-4 h-4 fill-orange-500" />
                      <span>{streak}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-xl">
                  <Trophy className="w-5 h-5 text-yellow-400 drop-shadow-glow" />
                  <span className="text-xl font-black text-foreground tabular-nums tracking-tighter">
                    {score}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                <span>Прогресс</span>
                <span>{questionNumber + 1} / {totalQuestions}</span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((questionNumber + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100}%` }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                />
              </div>
            </div>
          </div>

          {/* Game Main Area */}
          <div className="flex-1 flex flex-col justify-center py-4">
            <AnimatePresence mode="wait">
              {!isGameOver && currentQuestion ? (
                <motion.div
                  key={currentQuestion.question_id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className="w-full max-w-2xl mx-auto space-y-10"
                >
                  {/* Central Term Card */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                    <div className="relative flex flex-col items-center justify-center p-10 md:p-16 rounded-[2.5rem] bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl">
                      <div className="mb-6 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        Termino en español
                      </div>
                      <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-center text-foreground tracking-tight leading-none break-words max-w-full drop-shadow-2xl">
                        {currentQuestion.term.term_es}
                      </h2>
                      <div className="mt-8 flex gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500/40 animate-bounce" />
                        <Sparkles className="w-5 h-5 text-pink-500/40 animate-bounce delay-150" />
                        <Sparkles className="w-5 h-5 text-indigo-500/40 animate-bounce delay-300" />
                      </div>
                    </div>
                  </div>

                  {/* Answer Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrectOption = option === currentQuestion.correct_answer;
                      const showResult = selectedAnswer !== null;

                      return (
                        <motion.button
                          key={`${currentQuestion.question_id}-${index}`}
                          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          whileHover={!showResult ? { y: -4, scale: 1.02 } : {}}
                          whileTap={!showResult ? { scale: 0.98 } : {}}
                          onClick={() => handleAnswer(option)}
                          disabled={showResult}
                          className={cn(
                            "group relative overflow-hidden p-6 rounded-3xl border-2 transition-all duration-300 text-left h-full min-h-[100px] flex items-center shadow-lg",
                            !showResult && "bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10",
                            showResult && isCorrectOption && "bg-emerald-500/20 border-emerald-500 text-emerald-100 shadow-emerald-500/20 ring-4 ring-emerald-500/10",
                            showResult && isSelected && !isCorrectOption && "bg-rose-500/20 border-rose-500 text-rose-100 shadow-rose-500/20 ring-4 ring-rose-500/10",
                            showResult && !isSelected && !isCorrectOption && "opacity-30 border-white/5"
                          )}
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="text-lg md:text-xl font-bold leading-tight flex-1">
                              {option}
                            </span>
                            <div className="flex-shrink-0">
                              {showResult && isCorrectOption && (
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-in zoom-in-50 duration-300">
                                  <Check className="w-5 h-5 stroke-[3]" />
                                </div>
                              )}
                              {showResult && isSelected && !isCorrectOption && (
                                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white animate-in zoom-in-50 duration-300">
                                  <X className="w-5 h-5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inner Shine Effect */}
                          {!showResult && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : !isGameOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto w-full text-center space-y-10"
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{
                        y: [0, -15, 0],
                        filter: ["drop-shadow(0 0 0px rgba(139,92,246,0))", "drop-shadow(0 0 30px rgba(139,92,246,0.3))", "drop-shadow(0 0 0px rgba(139,92,246,0))"]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="mx-auto w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl relative"
                    >
                      <Brain className="w-16 h-16 text-white drop-shadow-lg" />
                      <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-yellow-400 animate-pulse" />
                    </motion.div>

                    <div className="space-y-4">
                      <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
                        ЛЕКСИКОН
                      </h1>
                      <p className="text-xl text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                        Совершенствуй свой словарный запас ПДД терминов для успешного экзамена.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                      <Gauge className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                      <div className="text-xs font-black uppercase tracking-tighter text-muted-foreground mb-1">Вопросов</div>
                      <div className="text-2xl font-black">{totalQuestions}</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                      <Languages className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <div className="text-xs font-black uppercase tracking-tighter text-muted-foreground mb-1">Сложность</div>
                      <div className="text-2xl font-black">Medium</div>
                    </div>
                  </div>

                  <Button
                    onClick={startGame}
                    className="group relative h-16 px-12 rounded-full font-black text-xl bg-primary text-primary-foreground shadow-[0_15px_35px_rgba(139,92,246,0.4)] hover:shadow-[0_25px_50px_rgba(139,92,246,0.5)] active:scale-95 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      <Zap className="w-6 h-6 fill-current" />
                      Начать миссию
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final Results Screen */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
                >
                  <div className="w-full max-w-xl bg-card/60 border border-white/10 p-10 md:p-14 rounded-[3rem] shadow-2xl text-center space-y-10 relative overflow-hidden">
                    {/* Animated background decoration */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

                    <div className="relative space-y-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
                      >
                        <Trophy className="w-12 h-12 text-white" />
                      </motion.div>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                        Миссия окончена!
                      </h2>
                    </div>

                    <div className="relative grid grid-cols-2 gap-6">
                      <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">Точность</div>
                        <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums tracking-tighter">
                          {Math.round((correctAnswers / totalQuestions) * 100)}%
                        </div>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3">Max Streak</div>
                        <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums tracking-tighter">
                          {maxStreak}
                        </div>
                      </div>
                    </div>

                    <div className="relative p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-between px-10">
                      <div className="text-left">
                        <div className="text-xs font-bold text-muted-foreground uppercase opacity-60">Всего очков</div>
                        <div className="text-3xl font-black text-primary drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">{score}</div>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="text-right text-muted-foreground font-bold">
                        {correctAnswers} верных
                      </div>
                    </div>

                    <div className="relative flex flex-col sm:flex-row gap-4 pt-4">
                      <Button
                        onClick={startGame}
                        className="flex-1 h-14 rounded-full font-black text-lg bg-primary text-primary-foreground shadow-xl hover:shadow-2xl active:scale-95 transition-all"
                      >
                        <RotateCw className="w-5 h-5 mr-2" />
                        Играть снова
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/games")}
                        className="flex-1 h-14 rounded-full font-black text-lg border-2 border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        К играм
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LexiconGame;
