import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { BoostButton } from './BoostButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sounds } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';

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
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          boost_type: type,
        },
      });

      if (error) throw error;

      // Apply boost effects with sound and animation
      if (type === 'fifty_fifty' && data.hidden_options) {
        sounds.boostFiftyFifty();
        setHiddenOptions(data.hidden_options);
        toast.success('⚡ 50/50: Два варианта убраны!');
      } else if (type === 'time_extend') {
        sounds.boostTimeExtend();
        setTimeLeft(prev => Math.min(prev + 30000, 60000));
        toast.success('⏱️ +30 секунд добавлено!');
      } else if (type === 'hint' && data.hint) {
        sounds.boostHint();
        setHintText(data.hint);
        setShowHint(true);
        toast.success('💡 Подсказка открыта!');
      } else if (type === 'skip') {
        sounds.boostSkip();
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
          if (data.combo > 1) {
            sounds.combo(data.combo);
            toast.success(`🔥 Комбо x${data.combo}! +${data.points_awarded} очков`);
          } else {
            toast.success(`✅ Правильно! +${data.points_awarded} очков`);
          }
        } else {
          sounds.wrongAnswer();
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
      {/* Enhanced Header */}
      <div className="bg-card rounded-lg p-4 border shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-muted-foreground">
            Вопрос {currentIndex + 1} / {questions.length}
          </div>
          {skipCount > 0 && (
            <div className={`text-sm font-medium ${skipCount >= 3 ? 'text-red-500' : 'text-yellow-600'}`}>
              ⏭️ Пропусков: {skipCount}/3
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center gap-6">
          <motion.div 
            className="flex items-center gap-2 flex-1"
            animate={isCorrect === true ? { scale: [1, 1.1, 1] } : {}}
          >
            <div className="text-sm text-muted-foreground">Вы:</div>
            <div className="text-3xl font-bold text-primary">{myScore}</div>
          </motion.div>
          
          <div className="text-2xl font-bold text-muted-foreground">⚔️ VS</div>
          
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="text-3xl font-bold">{opponentScore}</div>
            <div className="text-sm text-muted-foreground">:Оппонент</div>
          </div>
        </div>

        {combo > 1 && (
          <motion.div 
            className="mt-3 text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              🔥 КОМБО x{combo}
            </div>
          </motion.div>
        )}
      </div>

      {/* Enhanced Timer */}
      <motion.div 
        className="text-center"
        animate={timeLeft < 10000 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: timeLeft < 10000 ? Infinity : 0, duration: 0.5 }}
      >
        <div className={`text-5xl font-bold mb-3 ${timeLeft < 10000 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
          ⏱️ {(timeLeft / 1000).toFixed(1)}s
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-3 rounded-full transition-all duration-100 ${
              timeLeft < 10000 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 
              'bg-gradient-to-r from-primary to-primary'
            }`}
            style={{ width: `${(timeLeft / 60000) * 100}%` }}
            animate={timeLeft < 10000 ? { opacity: [1, 0.7, 1] } : {}}
            transition={{ repeat: timeLeft < 10000 ? Infinity : 0, duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Enhanced Boosts Panel */}
      <AnimatePresence>
        {!answered && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border"
          >
            <div className="text-sm text-muted-foreground mb-3 text-center font-medium">
              🎯 Бусты
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
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
                name="Подсказка"
                available={boosts.hint}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('hint')}
              />
              <BoostButton
                type="skip"
                icon="⏭️"
                name="Пропуск"
                available={boosts.skip}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('skip')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
