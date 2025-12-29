import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Trophy, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { MotionDiv as motion, AnimatePresence } from "@/components/optimized/Motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { updateTermProgress } from "@/lib/termProgress";

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

const FourVariantsGame = () => {
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

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (terms.length >= 4 && questionNumber < totalQuestions && !isGameOver) {
      generateQuestion();
    }
  }, [terms, questionNumber, isGameOver]);

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru")
        .limit(200);

      if (error) {
        toast({
          title: "Ошибка",
          description: `Не удалось загрузить термины: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data && data.length >= 4) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setTerms(shuffled);
      } else {
        toast({
          title: "Недостаточно данных",
          description: "Нужно минимум 4 термина для игры",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error loading terms:", err);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка: ${err?.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const generateQuestion = () => {
    if (terms.length < 4) return;

    // Pick random term as correct answer
    const randomIndex = Math.floor(Math.random() * terms.length);
    const correctTerm = terms[randomIndex];

    // Get 3 wrong terms for options
    const wrongTerms = terms
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
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;

    const correct = answer === currentQuestion.correct_answer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
      setCorrectAnswers((prev) => prev + 1);
      sounds.correctAnswer();
      haptics.correctAnswer();
      toast({
        title: "Правильно! ✓",
        description: `+1 очко`,
      });
      // Обновляем прогресс термина
      if (profileId && currentQuestion?.term?.id) {
        updateTermProgress(profileId, currentQuestion.term.id, true);
      }
    } else {
      setWrongAnswers((prev) => prev + 1);
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      toast({
        title: "Неверно ✗",
        description: `Правильный ответ: ${currentQuestion.correct_answer}`,
        variant: "destructive",
      });
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
      }
    }, 2000);
  };

  const startGame = () => {
    setScore(0);
    setQuestionNumber(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setIsGameOver(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowConfetti(false);
    generateQuestion();
  };

  const endGame = async () => {
    setIsGameOver(true);
    if (score >= totalQuestions * 0.7) {
      sounds.victory();
      haptics.victory();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    if (profileId) {
      const sessionData = {
        user_id: profileId,
        game_type: "four_variants",
        score: Math.min(Math.max(0, Math.round((score / totalQuestions) * 100)), 100),
        total_questions: totalQuestions,
        duration_seconds: Math.min(Math.max(0, 300), 7200),
      };
      const { error } = await supabase.from("game_sessions").insert(sessionData);
      if (error) {
        console.error("Failed to save game session:", error);
      }
    }
  };

  const accuracy = questionNumber > 0 
    ? Math.round((correctAnswers / questionNumber) * 100) 
    : 0;

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

      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          {!isGameOver && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-primary">Счёт: {score}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Вопрос {questionNumber + 1} / {totalQuestions}
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Четыре варианта</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Выбери правильный перевод термина
          </p>
        </div>

        {/* Game Screen */}
        {!isGameOver && currentQuestion && (
          <motion.div
            key={currentQuestion.question_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="relative overflow-hidden border border-border/50 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-2xl">
              <div className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 md:space-y-8">
                {/* Spanish Term */}
                <div className="text-center space-y-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Термин на испанском
                  </div>
                  <motion.div
                    key={currentQuestion.term.term_es}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground break-words break-all px-2"
                  >
                    {currentQuestion.term.term_es}
                  </motion.div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = option === currentQuestion.correct_answer;
                    const showResult = selectedAnswer !== null;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={!showResult ? { scale: 1.02 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                      >
                        <Button
                          onClick={() => handleAnswer(option)}
                          disabled={selectedAnswer !== null}
                          className={`w-full min-h-20 md:min-h-24 h-auto py-4 px-4 text-base md:text-lg font-semibold rounded-xl border-2 transition-all ${
                            showResult
                              ? isCorrectOption
                                ? "bg-success border-success text-success-foreground hover:bg-success"
                                : isSelected && !isCorrectOption
                                ? "bg-destructive border-destructive text-destructive-foreground hover:bg-destructive"
                                : "bg-muted border-border text-muted-foreground opacity-50"
                              : "bg-card border-border hover:border-primary hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full gap-2 min-w-0">
                            <span className="flex-1 text-left break-words whitespace-normal">{option}</span>
                            {showResult && isCorrectOption && (
                              <Check className="w-5 h-5 md:w-6 md:h-6 ml-2 flex-shrink-0" />
                            )}
                            {showResult && isSelected && !isCorrectOption && (
                              <X className="w-5 h-5 md:w-6 md:h-6 ml-2 flex-shrink-0" />
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Feedback */}
                {selectedAnswer !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-center p-4 rounded-xl border-2 ${
                      isCorrect
                        ? "bg-success/10 border-success text-success"
                        : "bg-destructive/10 border-destructive text-destructive"
                    }`}
                  >
                    {isCorrect ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        <span className="font-semibold">Правильно!</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-5 h-5" />
                          <span className="font-semibold">Неверно</span>
                        </div>
                        <div className="text-sm mt-2">
                          Правильный ответ: <strong>{currentQuestion.correct_answer}</strong>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Start Screen */}
        {!currentQuestion && !isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl">
              <div className="p-8 md:p-12 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
                >
                  <Star className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={2} />
                </motion.div>

                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Четыре варианта
                  </h2>
                  <p className="text-muted-foreground">
                    Выбери правильный перевод термина из четырех вариантов
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-sm text-muted-foreground">
                    В игре {totalQuestions} вопросов
                  </p>
                  <Button
                    onClick={startGame}
                    size="lg"
                    disabled={terms.length < 4}
                    className="w-full md:w-auto px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(139,92,246,0.25)]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Начать игру
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl">
              <div className="p-8 md:p-12 text-center space-y-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
                >
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={2} />
                </motion.div>

                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Игра окончена!
                  </h2>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-6xl md:text-7xl font-bold text-primary"
                  >
                    {score} / {totalQuestions}
                  </motion.div>
                  <p className="text-lg text-muted-foreground">
                    Точность: {accuracy}%
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Правильных
                    </div>
                    <div className="text-2xl font-bold text-success">{correctAnswers}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Неправильных
                    </div>
                    <div className="text-2xl font-bold text-destructive">{wrongAnswers}</div>
                  </div>
                </div>

                {/* Action Buttons */}
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
    </Layout>
  );
};

export default FourVariantsGame;

