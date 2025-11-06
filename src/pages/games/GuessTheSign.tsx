import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Star, ArrowRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / QUESTIONS_COUNT) * 100;

  // Load road signs from database
  useEffect(() => {
    const loadSigns = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("road_signs")
        .select("*")
        .limit(100);

      if (error) {
        toast.error("Ошибка загрузки знаков");
        console.error(error);
        return;
      }

      if (data && data.length > 0) {
        setAllSigns(data);
      } else {
        toast.error("Знаки не найдены в базе данных");
      }
      setLoading(false);
    };

    loadSigns();
  }, []);

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
    setGameState("playing");
    sounds.countdownFinish();
    haptics.buttonClick();
  };

  const handleTimeout = () => {
    setIsAnswerRevealed(true);
    sounds.wrongAnswer();
    haptics.wrongAnswer();
    toast.error("Время вышло!");
    
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleAnswerSelect = (optionId: string) => {
    if (isAnswerRevealed || selectedOption) return;

    setSelectedOption(optionId);
    setIsAnswerRevealed(true);

    const isCorrect = optionId === currentQuestion.correctAnswer.id;
    
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
      toast.success(`Правильно! +${points}`);
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      toast.error("Неправильно");
    }

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(TIME_PER_QUESTION_EXPERT);
    }
  };

  const finishGame = async () => {
    setGameState("finished");
    sounds.victory();
    haptics.victory();

    // Save session to database
    const { error } = await supabase.from("game_sessions").insert({
      game_type: "guess_sign",
      mode: gameMode,
      score,
      total_questions: questions.length,
      duration_seconds: 0, // Can track this if needed
    });

    if (error) console.error("Error saving game session:", error);
  };

  const restartGame = () => {
    setGameState("menu");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="text-white text-xl">Загрузка знаков...</div>
      </div>
    );
  }

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
              >
                <Trophy className="w-24 h-24 mx-auto text-yellow-400 drop-shadow-glow" />
              </motion.div>
              
              <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                Угадай Знак
              </h1>
              
              <p className="text-xl text-white/90">
                Проверь свои знания дорожных знаков!
              </p>

              <div className="grid gap-4 mt-8">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => startGame("beginner")}
                    className="w-full h-20 text-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl"
                  >
                    <Star className="w-6 h-6 mr-3" />
                    Режим Новичка
                    <Badge className="ml-3 bg-white/20">Без таймера</Badge>
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => startGame("expert")}
                    className="w-full h-20 text-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-xl"
                  >
                    <Zap className="w-6 h-6 mr-3" />
                    Режим Эксперта
                    <Badge className="ml-3 bg-white/20">С таймером</Badge>
                  </Button>
                </motion.div>
              </div>

              <Button
                onClick={() => navigate("/games")}
                variant="ghost"
                className="mt-6 text-white hover:bg-white/10"
              >
                Назад к играм
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (gameState === "finished") {
    const accuracy = Math.round((correctAnswers / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <div className="text-center space-y-6">
              <Trophy className="w-24 h-24 mx-auto text-yellow-400 drop-shadow-glow" />
              
              <h2 className="text-4xl font-bold text-white">Игра завершена!</h2>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 rounded-lg p-6">
                  <div className="text-5xl font-bold text-white">{score}</div>
                  <div className="text-white/80 mt-2">Очки</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-6">
                  <div className="text-5xl font-bold text-white">{accuracy}%</div>
                  <div className="text-white/80 mt-2">Точность</div>
                </div>
              </div>

              <div className="text-xl text-white/90">
                Правильных ответов: {correctAnswers} из {questions.length}
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  onClick={restartGame}
                  className="flex-1 h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Играть ещё
                </Button>
                
                <Button
                  onClick={() => navigate("/games")}
                  variant="outline"
                  className="flex-1 h-14 text-lg bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Другие игры
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4">
      <div className="max-w-4xl mx-auto pt-4">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                {currentQuestionIndex + 1} / {questions.length}
              </Badge>
              
              {gameMode === "expert" && (
                <Badge 
                  className={`text-lg px-4 py-2 ${
                    timeLeft <= 5 
                      ? "bg-red-500 animate-pulse" 
                      : "bg-white/20 text-white"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {timeLeft}с
                </Badge>
              )}
            </div>

            <div className="text-2xl font-bold">
              <Trophy className="w-6 h-6 inline mr-2" />
              {score}
            </div>
          </div>

          <Progress value={progress} className="h-3 bg-white/20" />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl mb-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-6">
                  Что означает этот знак?
                </h3>

                {/* Sign Image */}
                <div className="bg-white rounded-2xl p-8 mb-6 shadow-2xl">
                  {currentQuestion.sign.image_url ? (
                    <img
                      src={currentQuestion.sign.image_url}
                      alt="Road sign"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 mx-auto flex items-center justify-center bg-gray-200 rounded-lg">
                      <span className="text-gray-500">Нет изображения</span>
                    </div>
                  )}
                  
                  {currentQuestion.sign.sign_number && (
                    <Badge className="mt-4 bg-blue-500 text-white">
                      {currentQuestion.sign.sign_number}
                    </Badge>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedOption === option.id;
                    const isCorrect = option.id === currentQuestion.correctAnswer.id;
                    const showCorrect = isAnswerRevealed && isCorrect;
                    const showWrong = isAnswerRevealed && isSelected && !isCorrect;

                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Button
                          onClick={() => handleAnswerSelect(option.id)}
                          disabled={isAnswerRevealed}
                          className={`w-full h-auto py-4 px-6 text-left text-lg transition-all ${
                            showCorrect
                              ? "bg-green-500 hover:bg-green-500 text-white border-green-400 shadow-glow-green"
                              : showWrong
                              ? "bg-red-500 hover:bg-red-500 text-white border-red-400"
                              : isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-white/90 hover:bg-white text-gray-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex-1">
                              {language === "ru" ? option.name_ru : option.name_es}
                            </span>
                            {showCorrect && <Star className="w-6 h-6 ml-3" />}
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
