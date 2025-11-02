import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Flame, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { NotificationToast } from '@/components/NotificationToast';

interface DuelBattleFullscreenProps {
  duelId: string;
  onExit: () => void;
  onDuelFinished: () => void;
}

export function DuelBattleFullscreen({ duelId, onExit, onDuelFinished }: DuelBattleFullscreenProps) {
  const { profileId } = useUserContext();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>>([]);

  useEffect(() => {
    if (!duelId || !profileId) return;
    
    loadQuestions();
    loadScores();
    loadBoosts();
  }, [duelId, profileId]);

  // Update scores from realtime and create notifications
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      console.log('[DuelBattleFullscreen] Opponent answered:', state.opponentAnswerData);
      loadScores();
      
      // Create notification via edge function
      const createNotification = async () => {
        try {
          const isCorrect = state.opponentAnswerData.is_correct;
          await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'create_notification',
              duel_id: duelId,
              profile_id: profileId,
              type: 'progress',
              title: isCorrect ? '💡 Соперник ответил!' : '❌ Соперник ошибся!',
              message: isCorrect 
                ? 'Правильный ответ! Продолжайте бороться!' 
                : 'Ваш шанс догнать!',
              icon: isCorrect ? '⚡' : '🎯'
            }
          });
        } catch (error) {
          console.error('[DuelBattleFullscreen] Error creating notification:', error);
        }
      };
      
      createNotification();
      sounds.notificationPop();
    }
  }, [state.opponentAnswered, state.opponentAnswerData, duelId, profileId]);

  // Handle duel completion
  useEffect(() => {
    if (state.duelFinished) {
      onDuelFinished();
    }
  }, [state.duelFinished]);

  // Timer countdown
  useEffect(() => {
    if (isAnswered || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 100);
        if (newTime === 0) handleTimeout();
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      console.log('[DuelBattleFullscreen] Loading questions for duel:', duelId, 'profile:', profileId);
      
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'get_questions', duel_id: duelId, profile_id: profileId },
      });

      console.log('[DuelBattleFullscreen] Questions response:', { data, error });

      if (error) throw error;
      if (data?.questions && Array.isArray(data.questions)) {
        console.log('[DuelBattleFullscreen] Loaded questions:', data.questions.length);
        setQuestions(data.questions);
      } else {
        console.error('[DuelBattleFullscreen] Invalid questions data:', data);
        toast.error('Некорректные данные вопросов');
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error loading questions:', error);
      toast.error('Ошибка загрузки вопросов');
    } finally {
      setLoading(false);
    }
  };

  const loadScores = async () => {
    const { data } = await supabase
      .from('duel_players')
      .select('*')
      .eq('duel_id', duelId);

    if (data && data.length > 0) {
      const myPlayer = data.find(p => p.user_id === profileId);
      const opponent = data.find(p => p.user_id !== profileId);
      
      if (myPlayer?.id) setMyPlayerId(myPlayer.id);
      setMyScore(myPlayer?.score || 0);
      setOpponentScore(opponent?.score || 0);
      // Combo будет управляться через realtime обновления
    }
  };

  const loadBoosts = async () => {
    try {
      const { data, error } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId)
        .gt('quantity', 0);

      if (error) {
        console.error('Error loading boosts:', error);
        return;
      }

      if (data) setBoosts(data);
    } catch (error) {
      console.error('Exception loading boosts:', error);
    }
  };

  const handleBoostUse = async (boostType: string) => {
    if (usedBoosts.includes(boostType) || isAnswered) return;
    
    const boost = boosts.find(b => b.boost_type === boostType);
    if (!boost || boost.quantity <= 0) return;

    setUsedBoosts(prev => [...prev, boostType]);

    try {
      if (boostType === 'fifty_fifty') {
        sounds.boostFiftyFifty();
        const question = questions[currentIndex];
        const incorrectOptions = (question.question_snapshot.answer_options || [])
          .filter((opt: any) => !question.correct_option_ids.includes(opt.id))
          .map((opt: any) => opt.id);
        
        const toEliminate = incorrectOptions.slice(0, 2);
        setEliminatedOptions(toEliminate);
      } else if (boostType === 'time_extend') {
        sounds.boostTimeExtend();
        // CRITICAL: Add +30s as specified in requirements, not +15s
        setTimeLeft(prev => Math.min(prev + 30000, 60000));
      } else if (boostType === 'hint') {
        sounds.boostHint();
        toast.info('💡 Подсказка: обратите внимание на детали!');
      } else if (boostType === 'skip') {
        sounds.boostSkip();
        setIsAnswered(true);
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsAnswered(false);
            setSelectedAnswer(null);
            setTimeLeft(60000);
            setUsedBoosts([]);
            setEliminatedOptions([]);
          } else {
            finishDuel();
          }
        }, 500);
      }

      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          boost_type: boostType,
        },
      });

      await loadBoosts();
    } catch (error) {
      console.error('Error using boost:', error);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (isAnswered) return;

    setSelectedAnswer(optionId);
    setIsAnswered(true);

    const question = questions[currentIndex];
    const isCorrect = question.correct_option_ids.includes(optionId);

    if (isCorrect) {
      sounds.correctAnswer();
      haptics.correctAnswer();
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > 1) {
        sounds.combo(newCombo);
      }
      if (newCombo >= 3) {
        sounds.confetti();
      }
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
      setCombo(0);
    }

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: question.id,
          selected_option_id: optionId,
          time_taken_ms: 60000 - timeLeft,
        },
      });

      if (error) throw error;

      // ============================================================================
      // CRITICAL: USE SERVER SCORE - CLIENT NEVER CALCULATES
      // ============================================================================
      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);
        setCombo(isCorrect ? (data.combo || 0) : 0);
      } else {
        // Fallback: reload from DB if server doesn't return score
        await loadScores();
      }

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleTimeout = async () => {
    if (isAnswered) return;
    setIsAnswered(true);
    sounds.wrongAnswer();
    
    try {
      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          selected_option_id: null,
          time_taken_ms: 60000,
        },
      });
      
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    } catch (error) {
      console.error('Error on timeout:', error);
    }
  };

  const finishDuel = async () => {
    await supabase.functions.invoke('duel-manager', {
      body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
    });
    onDuelFinished();
  };

  if (loading || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Загрузка вопросов...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    console.error('[DuelBattleFullscreen] Invalid question data:', currentQuestion);
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive">Ошибка загрузки вопроса</p>
          <Button onClick={onExit}>Выйти</Button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 z-50 overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        <AnimatePresence mode="popLayout">
          {toastNotifications.map((notif) => (
            <NotificationToast
              key={notif.id}
              {...notif}
              onClose={() => setToastNotifications(prev => prev.filter(n => n.id !== notif.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress Bar - Duolingo Style */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-border">
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-400 shadow-lg shadow-green-500/50"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Exit Button - Top Left Corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="absolute top-2 left-2 z-10 rounded-full w-9 h-9 bg-card/80 backdrop-blur-sm hover:bg-card"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Main Content */}
      <div className="h-full flex flex-col p-3 md:p-4 pt-12 max-w-4xl mx-auto">
        {/* Header - Scores & Timer */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          {/* Scores */}
          <div className="flex items-center gap-2 md:gap-4">
            <motion.div 
              className="text-center px-3 py-1.5 rounded-2xl bg-primary/10 border-2 border-primary/30"
              animate={{ scale: myScore > opponentScore ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-xl md:text-2xl font-black text-primary">{myScore}</div>
              <div className="text-xs text-muted-foreground hidden md:block">Вы</div>
            </motion.div>
            
            <div className="text-2xl font-bold text-muted-foreground/30">VS</div>
            
            <motion.div 
              className="text-center px-3 py-1.5 rounded-2xl bg-secondary/10 border-2 border-secondary/30"
              animate={{ scale: opponentScore > myScore ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-xl md:text-2xl font-black text-secondary">{opponentScore}</div>
              <div className="text-xs text-muted-foreground hidden md:block">Соперник</div>
            </motion.div>
          </div>

          {/* Timer & Combo */}
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {combo > 1 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="relative"
                >
                  <Badge className="gradient-fire border-none text-white px-2 py-1 text-sm font-bold shadow-lg shadow-orange-500/50">
                    <Flame className="w-3 h-3 mr-1 animate-pulse" />
                    x{combo}
                  </Badge>
                  {/* Fire particles effect */}
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 0],
                      opacity: [1, 0.5, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div 
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full bg-muted/80 backdrop-blur-sm border border-border"
              animate={{ 
                scale: timeLeft < 10000 ? [1, 1.05, 1] : 1,
                borderColor: timeLeft < 10000 ? ['hsl(var(--border))', 'hsl(var(--destructive))', 'hsl(var(--border))'] : 'hsl(var(--border))'
              }}
              transition={{ duration: 0.5, repeat: timeLeft < 10000 ? Infinity : 0 }}
            >
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className={`font-mono font-bold text-xs md:text-sm ${timeLeft < 10000 ? 'text-destructive' : ''}`}>
                {Math.ceil(timeLeft / 1000)}s
              </span>
            </motion.div>
          </div>
        </div>

        {/* Question Progress */}
        <div className="text-center mb-3 md:mb-4">
          <p className="text-xs md:text-sm font-medium text-muted-foreground">
            Вопрос <span className="text-primary font-bold">{currentIndex + 1}</span> из {questions.length}
          </p>
        </div>

        {/* Boosts Section - Duolingo Style */}
        {boosts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-wrap gap-2 justify-center"
          >
            {boosts.map((boost) => {
              const boostConfig = {
                fifty_fifty: { icon: '5️⃣0️⃣', label: '50/50', gradient: 'from-blue-500 to-cyan-500' },
                time_extend: { icon: '⏱️', label: '+Время', gradient: 'from-purple-500 to-pink-500' },
                hint: { icon: '⚡', label: 'Подсказка', gradient: 'from-yellow-500 to-orange-500' },
                skip: { icon: '⏭️', label: 'Пропуск', gradient: 'from-green-500 to-emerald-500' },
              }[boost.boost_type] || { icon: '🎯', label: boost.boost_type, gradient: 'from-gray-500 to-gray-600' };

              const isUsed = usedBoosts.includes(boost.boost_type);
              const isDisabled = isUsed || isAnswered || boost.quantity <= 0;

              return (
                <motion.button
                  key={boost.boost_type}
                  onClick={() => handleBoostUse(boost.boost_type)}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.05 } : {}}
                  whileTap={!isDisabled ? { scale: 0.95 } : {}}
                  className={`relative px-3 py-2 rounded-xl font-bold text-sm transition-all shadow-lg border-2 ${
                    isDisabled
                      ? 'bg-muted/50 border-border/30 opacity-50 cursor-not-allowed'
                      : `bg-gradient-to-r ${boostConfig.gradient} text-white border-white/30 hover:shadow-xl`
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">{boostConfig.icon}</span>
                    <span className="hidden sm:inline">{boostConfig.label}</span>
                    <span className="text-xs bg-white/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {boost.quantity}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl flex-1 flex flex-col">
            {/* Question Image */}
            {currentQuestion.question_snapshot.image_url && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-2xl overflow-hidden bg-muted/50"
              >
                <img
                  src={currentQuestion.question_snapshot.image_url}
                  alt="Question"
                  className="w-full h-48 md:h-56 object-contain"
                />
              </motion.div>
            )}

            {/* Question Text */}
            <h2 className="text-xl md:text-2xl font-bold mb-6 leading-relaxed text-foreground">
              {currentQuestion.question_snapshot.question_ru}
            </h2>

            {/* Answer Options */}
            <div className="grid gap-3">
              {(currentQuestion.question_snapshot.answer_options || [])
                .sort((a: any, b: any) => a.position - b.position)
                .map((option: any, idx: number) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = currentQuestion.correct_option_ids.includes(option.id);
                  const showResult = isAnswered;
                  const isEliminated = eliminatedOptions.includes(option.id);

                  if (isEliminated && !showResult) {
                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0, height: 0 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden"
                      />
                    );
                  }

                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleAnswer(option.id)}
                      disabled={isAnswered || isEliminated}
                      whileHover={!isAnswered && !isEliminated ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered && !isEliminated ? { scale: 0.98 } : {}}
                      className={`p-3 md:p-4 rounded-2xl border-2 text-left transition-all font-semibold text-sm md:text-base leading-snug relative overflow-hidden min-h-[48px] md:min-h-[60px] break-words hyphens-auto ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-500 text-foreground shadow-lg'
                            : isSelected
                            ? 'bg-red-500/20 border-red-500 text-foreground shadow-lg'
                            : 'bg-muted/30 border-border/30 opacity-50'
                          : isSelected
                          ? 'bg-primary/20 border-primary shadow-lg'
                          : 'bg-card border-border hover:border-primary/50 hover:bg-primary/10 hover:shadow-md'
                      }`}
                    >
                      {showResult && (isCorrect || isSelected) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute top-2 md:top-3 right-2 md:right-3 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-white ${
                            isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        >
                          {isCorrect ? '✓' : '✗'}
                        </motion.div>
                      )}
                      <span className="block pr-10 text-base break-words">
                        {option.text_ru}
                      </span>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
