import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Puzzle, Trophy, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

interface MatchPair {
  id: string;
  spanish: string;
  russian: string;
  matched: boolean;
}

const MatchingGame = () => {
  const navigate = useNavigate();
  
  const { profileId } = useUserContext();
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [shuffledSpanish, setShuffledSpanish] = useState<MatchPair[]>([]);
  const [shuffledRussian, setShuffledRussian] = useState<MatchPair[]>([]);
  const [selectedSpanish, setSelectedSpanish] = useState<string | null>(null);
  const [selectedRussian, setSelectedRussian] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  // Используем отдельные множества для испанских и русских карточек
  const [wrongSpanishIds, setWrongSpanishIds] = useState<Set<string>>(new Set());
  const [wrongRussianIds, setWrongRussianIds] = useState<Set<string>>(new Set());
  const [correctAnswerIds, setCorrectAnswerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (selectedSpanish && selectedRussian) {
      checkMatch();
    }
  }, [selectedSpanish, selectedRussian]);

  // Отслеживаем завершение игры
  useEffect(() => {
    if (isGameActive && score > 0 && score === pairs.length && !isGameOver) {
      const timer = setTimeout(() => {
        setIsGameActive(false);
        setIsGameOver(true);
        endGame(score);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [score, pairs.length, isGameActive, isGameOver]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadTerms = async () => {
    try {
      // Получаем все термины
      const { data: allTerms, error: allTermsError } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru");

      if (allTermsError) {
      toast({
        title: "Ошибка",
          description: "Не удалось загрузить термины",
          variant: "destructive",
        });
        return;
      }

      if (!allTerms || allTerms.length < 4) {
        toast({
          title: "Нет данных",
          description: "Недостаточно терминов для игры (минимум 4)",
        variant: "destructive",
      });
      return;
    }

      let selectedTerms: typeof allTerms = [];

      if (profileId) {
        // Получаем изученные термины пользователя (times_practiced >= 3)
        const { data: studiedProgress } = await supabase
          .from("user_term_progress")
          .select("term_id")
          .eq("user_id", profileId)
          .gte("times_practiced", 3);

        const studiedTermIds = new Set(studiedProgress?.map(p => p.term_id) || []);
        
        // Разделяем термины на изученные и новые
        const studiedTerms = allTerms.filter(t => studiedTermIds.has(t.id));
        const newTerms = allTerms.filter(t => !studiedTermIds.has(t.id));

        // Выбираем 1-2 изученных термина случайно (если они есть)
        let selectedStudied: typeof allTerms = [];
        if (studiedTerms.length > 0) {
          const numStudied = Math.min(Math.floor(Math.random() * 2) + 1, studiedTerms.length, 2);
          selectedStudied = shuffleArray([...studiedTerms]).slice(0, numStudied);
        }

        // Выбираем остальные новые термины
        const numNew = 6 - selectedStudied.length;
        const selectedNew = shuffleArray([...newTerms]).slice(0, numNew);

        selectedTerms = [...selectedStudied, ...selectedNew];
      } else {
        // Если пользователь не авторизован, просто выбираем случайные термины
        selectedTerms = shuffleArray([...allTerms]).slice(0, 6);
      }

      // Если не хватило терминов, добавляем случайные
      if (selectedTerms.length < 6) {
        const remaining = shuffleArray([...allTerms]).slice(0, 6 - selectedTerms.length);
        selectedTerms = [...selectedTerms, ...remaining];
        selectedTerms = selectedTerms.slice(0, 6);
      }

      // Перемешиваем финальный список
      selectedTerms = shuffleArray(selectedTerms);

      const gamePairs = selectedTerms.map((term) => ({
        id: term.id,
        spanish: term.term_es,
        russian: term.term_ru,
        matched: false,
      }));

      setPairs(gamePairs);
      // Инициализируем перемешанные массивы при загрузке данных
      setShuffledSpanish(gamePairs);
      setShuffledRussian(gamePairs);
    } catch (error) {
      console.error("Error loading terms:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить термины",
        variant: "destructive",
      });
    }
  };

  const startGame = async () => {
    // Загружаем новые термины при каждом запуске игры
    await loadTerms();
    
    // Небольшая задержка для загрузки данных
    setTimeout(() => {
    setIsGameActive(true);
    setScore(0);
    setAttempts(0);
    setIsGameOver(false);
    setStartTime(Date.now());
    setSelectedSpanish(null);
    setSelectedRussian(null);
      setWrongSpanishIds(new Set());
      setWrongRussianIds(new Set());
      setCorrectAnswerIds(new Set());
      
      // Используем текущие pairs (уже загруженные в loadTerms)
      setPairs(prevPairs => {
        const resetPairs = prevPairs.map(p => ({ ...p, matched: false }));
        // Перемешиваем массивы только один раз при начале игры
        setShuffledSpanish(shuffleArray([...resetPairs]));
        setShuffledRussian(shuffleArray([...resetPairs]));
        return resetPairs;
      });
    }, 100);
  };

  const checkMatch = () => {
    if (!selectedSpanish || !selectedRussian) return;

    const spanishPair = pairs.find(p => p.id === selectedSpanish);
    const russianPair = pairs.find(p => p.id === selectedRussian);

    if (!spanishPair || !russianPair) return;

    setAttempts(prev => prev + 1);

    if (spanishPair.id === russianPair.id) {
      // Correct match - обновляем pairs и синхронизируем shuffled массивы
      setPairs(prevPairs => {
        const updatedPairs = prevPairs.map(p => 
        p.id === selectedSpanish ? { ...p, matched: true } : p
        );
        
        // Синхронизируем shuffled массивы с обновленным состоянием
        setShuffledSpanish(prevShuffled => 
          prevShuffled.map(p => p.id === selectedSpanish ? { ...p, matched: true } : p)
        );
        setShuffledRussian(prevShuffled => 
          prevShuffled.map(p => p.id === selectedSpanish ? { ...p, matched: true } : p)
        );
        
        return updatedPairs;
      });
      
      setScore(prev => prev + 1);
      
      // Звук и вибрация для правильного ответа
      sounds.correctAnswer();
      haptics.correctAnswer();
      
      // Визуальный эффект для правильного ответа
      setCorrectAnswerIds(new Set([selectedSpanish, selectedRussian]));
      setTimeout(() => setCorrectAnswerIds(new Set()), 800);
      
      toast({
        title: "Правильно! ✓",
        description: `${spanishPair.spanish} = ${spanishPair.russian}`,
        duration: 2000,
      });
    } else {
      // Звук и вибрация для неправильного ответа
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      
      // Визуальный эффект для неправильного ответа
      // КРИТИЧЕСКИ ВАЖНО: подсвечиваем ТОЛЬКО выбранные неправильные карточки
      // НЕ подсвечиваем карточки с правильным ответом (которые уже matched)
      // Подсвечиваем именно те карточки, которые пользователь выбрал неправильно
      // Используем отдельные множества для испанских и русских карточек
      
      // Очищаем предыдущие неправильные подсветки
      setWrongSpanishIds(new Set());
      setWrongRussianIds(new Set());
      
      // Очищаем предыдущие правильные подсветки, чтобы избежать конфликтов
      setCorrectAnswerIds(new Set());
      
      // Подсвечиваем ТОЛЬКО выбранную испанскую карточку (только если она не matched)
      if (selectedSpanish && spanishPair && !spanishPair.matched) {
        setWrongSpanishIds(new Set([selectedSpanish]));
        setTimeout(() => setWrongSpanishIds(new Set()), 1000);
      }
      
      // Подсвечиваем ТОЛЬКО выбранную русскую карточку (только если она не matched)
      if (selectedRussian && russianPair && !russianPair.matched) {
        setWrongRussianIds(new Set([selectedRussian]));
        setTimeout(() => setWrongRussianIds(new Set()), 1000);
      }
      
      toast({
        title: "Неправильно ✗",
        description: "Попробуйте другую пару",
        variant: "destructive",
        duration: 2000,
      });
    }

    // Сбрасываем выбор после небольшой задержки для визуального эффекта
    setTimeout(() => {
    setSelectedSpanish(null);
    setSelectedRussian(null);
    }, 1000);
  };

  const endGame = async (finalScore?: number) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Используем переданное значение или текущее из state
    const gameScore = finalScore !== undefined ? finalScore : score;

    // Save game session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const sessionData = {
          user_id: profile.id,
          game_type: "matching",
          score: Math.min(Math.max(0, gameScore), 100), // Ensure 0-100 range
          total_questions: Math.min(Math.max(1, pairs.length), 100), // Ensure 1-100 range
          duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
        };

        const { error } = await supabase.from("game_sessions").insert(sessionData);

        if (error) {
          console.error("Failed to save game session:", error);
        }
      }
    }
  };

  const progress = pairs.length > 0 ? (score / pairs.length) * 100 : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8 pb-20 md:pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold flex items-center justify-center gap-2 md:gap-3">
            <Puzzle className="w-6 h-6 md:w-10 md:h-10 text-primary" />
            Сопоставление
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">
            Соедини испанские термины с русскими переводами
          </p>
        </div>

        {!isGameActive && !isGameOver && (
          <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-sm border-2 border-border/50 shadow-lg text-center space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30">
                <Puzzle className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Готовы начать?</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
              Выберите испанское слово, затем его русский перевод
            </p>
              <Button size="lg" onClick={startGame} disabled={pairs.length < 4} className="shadow-lg">
              Начать игру
            </Button>
            </div>
          </Card>
        )}

        {isGameActive && (
          <div className="space-y-4 md:space-y-6">
            <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-2 border-border/50 shadow-lg">
              <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
                <div className="flex items-center gap-2 text-sm md:text-lg font-bold">
                  <span className="text-muted-foreground">Попыток:</span>
                  <span className="text-foreground">{attempts}</span>
                </div>
                <div className="flex items-center gap-2 text-sm md:text-lg font-bold text-primary">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <span>{score} / {pairs.length}</span>
                </div>
              </div>
              <Progress value={progress} className="h-2 md:h-3 bg-muted/50" />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3 md:space-y-4">
                <div className="text-center">
                  <h3 className="text-base md:text-lg font-semibold text-foreground">Испанский</h3>
                </div>
                <div className="space-y-2 md:space-y-3 max-h-[60vh] md:max-h-none overflow-y-auto pr-2 scrollbar-hide">
                  {shuffledSpanish.map((pair) => {
                    // Подсвечиваем как неправильную только если:
                    // 1. Карточка в wrongSpanishIds (выбрана неправильно в испанской колонке)
                    // 2. Карточка НЕ уже правильно сопоставлена (matched)
                    const isWrong = !pair.matched && wrongSpanishIds.has(pair.id);
                    // Подсвечиваем как правильную только если:
                    // 1. Карточка в correctAnswerIds (только что правильно сопоставлена)
                    // 2. Карточка НЕ уже правильно сопоставлена (matched) - это для анимации
                    const isCorrect = !pair.matched && correctAnswerIds.has(pair.id);
                    
                    return (
                      <motion.div
                        key={`spanish-${pair.id}`}
                        initial={false}
                        animate={{
                          scale: isWrong ? [1, 0.98, 1.02, 1] : isCorrect ? [1, 1.05, 1] : 1,
                          x: isWrong ? [0, -4, 4, -4, 4, 0] : 0,
                        }}
                        transition={{
                          duration: isWrong ? 0.4 : isCorrect ? 0.3 : 0,
                          ease: "easeInOut"
                        }}
                      >
                  <Button
                    onClick={() => !pair.matched && setSelectedSpanish(pair.id)}
                    disabled={pair.matched}
                          variant="outline"
                    className={cn(
                            "w-full text-sm md:text-base lg:text-lg h-auto min-h-[60px] md:min-h-[70px] py-3 md:py-4 pl-5 md:pl-6 pr-4 md:pr-5",
                            "break-words whitespace-normal text-left justify-start",
                            "transition-all duration-300 border-2 rounded-xl",
                            "relative overflow-hidden",
                            pair.matched 
                              ? "opacity-60 cursor-not-allowed bg-success/10 border-2 border-success/50 shadow-sm text-foreground/60" 
                              : isWrong
                              ? "bg-destructive/10 border-2 border-destructive/70 shadow-md text-foreground"
                              : isCorrect
                              ? "bg-success/20 border-2 border-success/70 shadow-lg text-foreground"
                              : selectedSpanish === pair.id
                              ? "bg-primary/10 border-2 border-primary shadow-md text-foreground"
                              : "bg-card border-2 border-border hover:bg-primary/5 hover:border-primary/50 hover:shadow-sm text-foreground"
                    )}
                  >
                          {isWrong && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0.3, 0] }}
                              transition={{ duration: 0.4 }}
                              className="absolute inset-0 bg-destructive/20 rounded-xl"
                            />
                          )}
                          {isCorrect && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0, 1, 0.5, 0], scale: [0.8, 1.2, 1] }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 bg-success/30 rounded-xl"
                            />
                          )}
                          {selectedSpanish === pair.id && !pair.matched && !isWrong && !isCorrect && (
                            <div className="absolute inset-0 bg-primary/5 rounded-xl" />
                          )}
                          <span className="flex items-center gap-2 w-full min-w-0 relative z-10">
                            {pair.matched && (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/20 border border-success/50 shrink-0">
                                <Check className="w-4 h-4 text-success" />
                              </div>
                            )}
                            <span className={cn(
                              "flex-1 text-left break-words whitespace-normal min-w-0",
                              selectedSpanish === pair.id && !pair.matched && "font-semibold"
                            )}>
                              {pair.spanish}
                            </span>
                          </span>
                  </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="text-center">
                  <h3 className="text-base md:text-lg font-semibold text-foreground">Русский</h3>
                </div>
                <div className="space-y-2 md:space-y-3 max-h-[60vh] md:max-h-none overflow-y-auto pr-2 scrollbar-hide">
                  {shuffledRussian.map((pair) => {
                    // Подсвечиваем как неправильную только если:
                    // 1. Карточка в wrongRussianIds (выбрана неправильно в русской колонке)
                    // 2. Карточка НЕ уже правильно сопоставлена (matched)
                    const isWrong = !pair.matched && wrongRussianIds.has(pair.id);
                    // Подсвечиваем как правильную только если:
                    // 1. Карточка в correctAnswerIds (только что правильно сопоставлена)
                    // 2. Карточка НЕ уже правильно сопоставлена (matched) - это для анимации
                    const isCorrect = !pair.matched && correctAnswerIds.has(pair.id);
                    
                    return (
                      <motion.div
                        key={`russian-${pair.id}`}
                        initial={false}
                        animate={{
                          scale: isWrong ? [1, 0.98, 1.02, 1] : isCorrect ? [1, 1.05, 1] : 1,
                          x: isWrong ? [0, -4, 4, -4, 4, 0] : 0,
                        }}
                        transition={{
                          duration: isWrong ? 0.4 : isCorrect ? 0.3 : 0,
                          ease: "easeInOut"
                        }}
                      >
                  <Button
                    onClick={() => !pair.matched && setSelectedRussian(pair.id)}
                    disabled={pair.matched}
                          variant="outline"
                    className={cn(
                            "w-full text-sm md:text-base lg:text-lg h-auto min-h-[60px] md:min-h-[70px] py-3 md:py-4 pl-5 md:pl-6 pr-4 md:pr-5",
                            "break-words whitespace-normal text-left justify-start",
                            "transition-all duration-300 border-2 rounded-xl",
                            "relative overflow-hidden",
                            pair.matched 
                              ? "opacity-60 cursor-not-allowed bg-success/10 border-2 border-success/50 shadow-sm text-foreground/60" 
                              : isWrong
                              ? "bg-destructive/10 border-2 border-destructive/70 shadow-md text-foreground"
                              : isCorrect
                              ? "bg-success/20 border-2 border-success/70 shadow-lg text-foreground"
                              : selectedRussian === pair.id
                              ? "bg-secondary/10 border-2 border-secondary shadow-md text-foreground"
                              : "bg-card border-2 border-border hover:bg-secondary/5 hover:border-secondary/50 hover:shadow-sm text-foreground"
                    )}
                  >
                          {isWrong && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0.3, 0] }}
                              transition={{ duration: 0.4 }}
                              className="absolute inset-0 bg-destructive/20 rounded-xl"
                            />
                          )}
                          {isCorrect && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0, 1, 0.5, 0], scale: [0.8, 1.2, 1] }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 bg-success/30 rounded-xl"
                            />
                          )}
                          {selectedRussian === pair.id && !pair.matched && !isWrong && !isCorrect && (
                            <div className="absolute inset-0 bg-secondary/5 rounded-xl" />
                          )}
                          <span className="flex items-center gap-2 w-full min-w-0 relative z-10">
                            {pair.matched && (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/20 border border-success/50 shrink-0">
                                <Check className="w-4 h-4 text-success" />
                              </div>
                            )}
                            <span className={cn(
                              "flex-1 text-left break-words whitespace-normal min-w-0",
                              selectedRussian === pair.id && !pair.matched && "font-semibold"
                            )}>
                              {pair.russian}
                            </span>
                          </span>
                  </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {isGameOver && (
          <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-sm border-2 border-border/50 shadow-xl text-center space-y-4 md:space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-primary/10 opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold/20 to-primary/20 border-2 border-gold/30 shadow-lg">
                <Trophy className="w-12 h-12 md:w-14 md:h-14 text-gold drop-shadow-glow" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Поздравляем!
              </h2>
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-lg md:text-xl">
                Все пары найдены за <span className="font-bold text-primary">{attempts}</span> попыток
              </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                  <p className="text-base md:text-lg text-muted-foreground">
                    Точность: <span className="font-bold text-secondary">{((pairs.length / attempts) * 100).toFixed(0)}%</span>
              </p>
            </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <Button onClick={startGame} size="lg" className="w-full sm:w-auto shadow-lg">
                Играть снова
              </Button>
                <Button variant="outline" onClick={() => navigate("/games")} size="lg" className="w-full sm:w-auto border-2">
                К играм
              </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default MatchingGame;