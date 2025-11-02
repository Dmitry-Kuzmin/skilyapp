import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { BoostButton } from './BoostButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { Swords, Timer, Zap, Trophy, WifiOff, Wifi } from 'lucide-react';

interface DuelBattleProps {
  duelId: string;
  onDuelFinished: () => void;
}

export function DuelBattle({ duelId, onDuelFinished }: DuelBattleProps) {
  const { profileId } = useUserContext();
  const { state } = useDuelRealtime(duelId);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000); // 60 seconds
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [boosts, setBoosts] = useState({ fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0 });
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [hintText, setHintText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const prevOpponentScore = useRef(opponentScore);
  const lastOpponentActivityRef = useRef(Date.now());

  useEffect(() => {
    loadQuestions();
    loadScores();
    loadBoosts();
  }, [duelId]);

  useEffect(() => {
    if (!questions.length) return;
    
    setAnswered(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setTimeLeft(60000);
    setHiddenOptions([]);
    setUsedBoosts([]);
    setShowCorrectAnswer(false);
  }, [currentIndex]);

  useEffect(() => {
    if (state.duelFinished) {
      onDuelFinished();
    }
  }, [state.duelFinished]);

  // Realtime opponent notifications
  useEffect(() => {
    if (state.opponentAnswered) {
      toast.info('💨 Соперник ответил!', { duration: 1000 });
      lastOpponentActivityRef.current = Date.now();
    }
  }, [state.opponentAnswered]);

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Соединение восстановлено', {
        description: 'Можете продолжать игру',
        icon: <Wifi className="w-4 h-4" />,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Потеряно соединение с интернетом', {
        description: 'Проверьте подключение к сети',
        icon: <WifiOff className="w-4 h-4" />,
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check opponent connection
    const checkOpponentConnection = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastOpponentActivityRef.current;
      if (timeSinceLastActivity > 45000 && !answered) {
        toast.warning('У соперника могут быть проблемы с сетью', {
          description: 'Ожидаем подключения...',
          icon: <WifiOff className="w-4 h-4" />,
        });
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkOpponentConnection);
    };
  }, [answered]);

  // Track opponent score changes
  useEffect(() => {
    if (opponentScore > prevOpponentScore.current && prevOpponentScore.current > 0) {
      const diff = opponentScore - prevOpponentScore.current;
      if (diff > 100) {
        toast.warning('🔥 Соперник набрал комбо!', { duration: 1500 });
        haptics.warning();
      } else if (opponentScore > myScore) {
        toast.info('⚡ Соперник вырвался вперёд!', { duration: 1500 });
      }
    }
    prevOpponentScore.current = opponentScore;
  }, [opponentScore, myScore]);

  useEffect(() => {
    if (answered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          handleTimeout();
          return 0;
        }
        // Play warning sound at 10 seconds
        if (prev <= 10000 && prev > 9900) {
          sounds.timeRunningOut();
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [answered, currentIndex]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('duel_questions')
        .select('*')
        .eq('duel_id', duelId)
        .order('position');

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Не удалось загрузить вопросы');
    }
  };

  const loadScores = async () => {
    try {
      const { data } = await supabase
        .from('duel_players')
        .select('*')
        .eq('duel_id', duelId);

      if (data && data.length > 0) {
        const myPlayer = data.find(p => p.user_id === profileId);
        const opponent = data.find(p => p.user_id !== profileId);
        setMyScore(myPlayer?.score || 0);
        setOpponentScore(opponent?.score || 0);
      }
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  };

  const loadBoosts = async () => {
    if (!profileId) return;
    
    try {
      const { data } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId);

      if (data) {
        const boostMap: any = { fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0 };
        data.forEach(item => {
          if (item.boost_type in boostMap) {
            boostMap[item.boost_type] = item.quantity;
          }
        });
        setBoosts(boostMap);
      }
    } catch (error) {
      console.error('Error loading boosts:', error);
    }
  };

  const handleUseBoost = async (type: string) => {
    if (usedBoosts.includes(type) || answered) return;

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          profile_id: profileId,
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          boost_type: type,
        },
      });

      if (error) throw error;

      // Apply boost effects with sound and animation
      if (type === 'fifty_fifty' && data.hidden_options) {
        sounds.boostFiftyFifty();
        haptics.boostActivated();
        setHiddenOptions(data.hidden_options);
        toast.success('⚡ 50/50: Два варианта убраны!');
      } else if (type === 'time_extend') {
        sounds.boostTimeExtend();
        haptics.boostActivated();
        setTimeLeft(prev => Math.min(prev + 30000, 60000));
        toast.success('⏱️ +30 секунд добавлено!');
      } else if (type === 'hint' && data.hint) {
        sounds.boostHint();
        haptics.boostActivated();
        setHintText(data.hint);
        setShowHint(true);
        toast.success('💡 Подсказка открыта!');
      } else if (type === 'skip') {
        sounds.boostSkip();
        haptics.boostActivated();
        toast.success('⏭️ Вопрос пропущен!');
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            finishDuel();
          }
        }, 1000);
      }

      setUsedBoosts(prev => [...prev, type]);
      setBoosts(prev => ({ ...prev, [type]: Math.max(0, prev[type as keyof typeof prev] - 1) }));
    } catch (error: any) {
      toast.error(error.message || 'Ошибка использования буста');
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (answered) return;

    setAnswered(true);
    setSelectedOption(optionId);

    const correctAnswer = currentQuestion.correct_option_ids.includes(optionId);
    setIsCorrect(correctAnswer);

    const timeTaken = 60000 - timeLeft;

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          profile_id: profileId,
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          selected_option_id: optionId,
          time_taken_ms: timeTaken,
        },
      });

      if (error) throw error;

      if (data) {
        setMyScore(data.new_score);
        setCombo(data.combo);
        
        if (correctAnswer) {
          sounds.correctAnswer();
          haptics.correctAnswer();
          const points = data.points_awarded || 0;
          if (data.combo > 1) {
            sounds.combo(data.combo);
            haptics.combo();
            toast.success(`🔥 Комбо x${data.combo}! +${points} очков`);
          } else if (points > 150) {
            toast.success(`⭐ Идеальный ответ! +${points} очков`);
          } else {
            toast.success(`✅ Правильно! +${points} очков`);
          }
        } else {
          sounds.wrongAnswer();
          haptics.wrongAnswer();
          toast.error('❌ Неправильно');
        }
      }

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          finishDuel();
        }
      }, 2500);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка отправки ответа');
    }
  };

  const handleTimeout = async () => {
    if (answered) return;
    
    setAnswered(true);
    setShowCorrectAnswer(true);
    
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    let penaltyPoints = 0;
    if (newSkipCount % 2 === 0) {
      penaltyPoints = -50;
      toast.warning('Штраф за пропуски: -50 очков');
    }
    if (newSkipCount >= 4) {
      penaltyPoints -= 100;
      toast.error('Слишком много пропусков! -100 очков');
    }

    try {
      const { data } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          profile_id: profileId,
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          selected_option_id: null,
          time_taken_ms: 60000,
          is_timeout: true,
        },
      });

      if (data && penaltyPoints < 0) {
        setMyScore(prev => Math.max(0, prev + penaltyPoints));
      }

      toast.info(`⏭️ Вопрос пропущен (${newSkipCount}/3)`);
    } catch (error) {
      console.error('Error submitting timeout:', error);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishDuel();
      }
    }, 3000);
  };

  const finishDuel = async () => {
    try {
      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'finish_duel',
          profile_id: profileId,
          duel_id: duelId,
        },
      });
    } catch (error) {
      console.error('Error finishing duel:', error);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Загрузка вопросов...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Ошибка загрузки вопроса</p>
      </div>
    );
  }

  const snapshot = currentQuestion.question_snapshot as any;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Premium Info Panel */}
      <Card className="p-4 md:p-5 bg-gradient-to-br from-card via-card/98 to-primary/5 border-2 border-primary/20 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              'linear-gradient(45deg, hsl(var(--primary)) 0%, transparent 50%)',
              'linear-gradient(225deg, hsl(var(--secondary)) 0%, transparent 50%)',
              'linear-gradient(45deg, hsl(var(--primary)) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <div className="relative z-10 space-y-3">
          {/* Top Row: Scores */}
          <div className="flex items-center justify-between gap-4">
            {/* My Score */}
            <motion.div 
              className="flex items-center gap-2 flex-1"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Вы</p>
                <p className="text-xl font-black text-primary">{myScore}</p>
              </div>
            </motion.div>

            {/* Center: Progress & Timer */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20">
              <div className="text-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">
                    {currentIndex + 1}/{questions.length}
                  </span>
                </div>
                <div className="relative w-20 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${timeLeft < 10000 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                <span className={`font-bold text-sm tabular-nums ${timeLeft < 10000 ? 'text-destructive' : 'text-foreground'}`}>
                  {(timeLeft / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Opponent Score */}
            <motion.div 
              className="flex items-center gap-2 flex-1 justify-end"
              whileHover={{ scale: 1.02 }}
              animate={state.opponentAnswered ? { scale: [1, 1.1, 1] } : {}}
            >
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Соперник</p>
                <p className="text-xl font-black text-secondary">{opponentScore}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center shadow-md">
                <Swords className="w-5 h-5 text-secondary-foreground" />
              </div>
            </motion.div>
          </div>

          {/* Bottom Row: Boosts + Status */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
            {/* Boosts */}
            <div className="flex items-center gap-1.5">
              <BoostButton
                type="fifty_fifty"
                icon="⚡"
                name="50/50"
                available={boosts.fifty_fifty}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('fifty_fifty')}
              />
              <BoostButton
                type="time_extend"
                icon="⏱️"
                name="+30s"
                available={boosts.time_extend}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('time_extend')}
              />
              <BoostButton
                type="hint"
                icon="💡"
                name="Hint"
                available={boosts.hint}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('hint')}
              />
              <BoostButton
                type="skip"
                icon="⏭️"
                name="Skip"
                available={boosts.skip}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('skip')}
              />
            </div>

            {/* Network Status & Combo */}
            <div className="flex items-center gap-2">
              {!isOnline && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-bold"
                >
                  <WifiOff className="w-3 h-3" />
                  Офлайн
                </motion.div>
              )}
              {combo > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-1 rounded-md bg-gradient-to-r from-gold to-yellow-600 text-gold-foreground text-xs font-bold flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  x{combo}
                </motion.div>
              )}
              {skipCount > 0 && (
                <div className="px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-bold">
                  {skipCount}/3
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Question Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8 shadow-xl border-2">
          {snapshot.image_url && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img
                src={snapshot.image_url}
                alt="Question"
                className="max-w-md mx-auto rounded-lg shadow-md"
              />
            </motion.div>
          )}

          <h2 className="text-2xl font-bold mb-8 text-center leading-relaxed">
            {snapshot.question_es}
          </h2>

          <div className="space-y-4">
            {snapshot.answer_options
              ?.filter((opt: any) => !hiddenOptions.includes(opt.id))
              .sort((a: any, b: any) => a.position - b.position)
              .map((option: any) => {
                const isSelected = selectedOption === option.id;
                const isCorrectOption = currentQuestion.correct_option_ids.includes(option.id);
                const showResult = answered || showCorrectAnswer;

                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: option.position * 0.1 }}
                    whileHover={{ scale: answered ? 1 : 1.02 }}
                    whileTap={{ scale: answered ? 1 : 0.98 }}
                  >
                    <Button
                      onClick={() => handleAnswer(option.id)}
                      disabled={answered}
                      variant={
                        showResult
                          ? isCorrectOption
                            ? 'default'
                            : isSelected
                            ? 'destructive'
                            : 'outline'
                          : isSelected
                          ? 'default'
                          : 'outline'
                      }
                      className={`w-full h-auto py-4 px-6 text-left justify-start text-lg transition-all ${
                        showResult && isCorrectOption ? 'ring-2 ring-green-500 ring-offset-2' : ''
                      } ${
                        showResult && !isCorrectOption && isSelected ? 'ring-2 ring-red-500 ring-offset-2' : ''
                      }`}
                    >
                      <span className="font-bold mr-4 text-xl">
                        {String.fromCharCode(65 + option.position)}
                      </span>
                      <span className="flex-1">{option.text_es}</span>
                      {showResult && isCorrectOption && <span className="text-2xl ml-2">✓</span>}
                      {showResult && !isCorrectOption && isSelected && <span className="text-2xl ml-2">✗</span>}
                    </Button>
                  </motion.div>
                );
              })}
          </div>

          {showCorrectAnswer && !answered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-center"
            >
              <p className="text-sm font-medium">⏭️ Вопрос пропущен - 0 очков</p>
              <p className="text-xs text-muted-foreground mt-1">Правильный ответ выделен</p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Hint Dialog */}
      <Dialog open={showHint} onOpenChange={setShowHint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💡 Подсказка
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-foreground">{hintText}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
