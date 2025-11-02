import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Flame, Shield, Users, Globe, Lightbulb } from 'lucide-react';
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

type Language = 'es' | 'en' | 'ru';

const LANGUAGE_FLAGS = {
  es: '🇪🇸',
  en: '🇬🇧',
  ru: '🇷🇺'
};

export function DuelBattleFullscreen({ duelId, onExit, onDuelFinished }: DuelBattleFullscreenProps) {
  const { profileId } = useUserContext();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  
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
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>>([]);
  const [showHint, setShowHint] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  
  const prevOpponentScore = useRef(0);
  const hasShownOvertake = useRef(false);

  const { state } = useDuelRealtime(duelId, myPlayerId);

  // Handle realtime notifications
  useEffect(() => {
    if (state.notifications.length > 0) {
      const latestNotif = state.notifications[state.notifications.length - 1];
      const id = `notif-${latestNotif.id}-${Date.now()}`;
      setToastNotifications(prev => [...prev, {
        id,
        title: latestNotif.title,
        message: latestNotif.message,
        icon: latestNotif.icon,
      }]);
      sounds.notificationPop();
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    }
  }, [state.notifications]);

  // Check if opponent overtook us - SHOW ONLY ONCE
  useEffect(() => {
    const currentOpponentScore = state.opponentScore || 0;
    
    if (
      currentOpponentScore > myScore && 
      prevOpponentScore.current <= myScore &&
      currentOpponentScore > 0 && 
      myScore > 0 &&
      !hasShownOvertake.current
    ) {
      const diff = currentOpponentScore - myScore;
      const id = `overtake-${Date.now()}`;
      
      setToastNotifications(prev => [...prev, {
        id,
        title: '⚠️ Соперник впереди!',
        message: `Разница: ${diff} очков`,
        icon: '🏃',
      }]);
      sounds.notificationPop();
      haptics.warning();
      hasShownOvertake.current = true;
      
      // Auto-remove after 2 seconds
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== id));
      }, 2000);
    }
    
    // Reset flag when we're back in the lead
    if (myScore > currentOpponentScore) {
      hasShownOvertake.current = false;
    }
    
    prevOpponentScore.current = currentOpponentScore;
  }, [state.opponentScore, myScore]);

  // Show notification when opponent answers
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      const id = `opponent-answer-${Date.now()}`;
      setToastNotifications(prev => [...prev, {
        id,
        title: state.opponentAnswerData.is_correct ? '✅ Правильно!' : '❌ Ошибка',
        message: 'Соперник ответил на вопрос',
        icon: state.opponentAnswerData.is_correct ? '⚡' : '❌'
      }]);
      
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== id));
      }, 2000);
    }
  }, [state.opponentAnswered, state.opponentAnswerData]);

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
          await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'create_notification',
              duel_id: duelId,
              user_id: profileId,
              type: 'opponent_answer',
              is_correct: state.opponentAnswerData.is_correct,
            }
          });
        } catch (error) {
          console.error('Error creating notification:', error);
        }
      };
      
      createNotification();
    }
  }, [state.opponentAnswered, state.opponentAnswerData]);

  // Handle duel finished
  useEffect(() => {
    if (state.duelFinished) {
      console.log('[DuelBattleFullscreen] Duel finished from realtime!');
      onDuelFinished();
    }
  }, [state.duelFinished, onDuelFinished]);

  // Timer countdown
  useEffect(() => {
    if (loading || isAnswered || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          handleTimeout();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [loading, isAnswered, timeLeft]);

  const loadQuestions = async () => {
    try {
      const response = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'get_questions',
          duel_id: duelId,
        }
      });

      if (response.error) throw response.error;

      if (response.data?.questions) {
        setQuestions(response.data.questions);
        console.log('Questions loaded:', response.data.questions);
      }
      
      if (response.data?.player_id) {
        setMyPlayerId(response.data.player_id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Ошибка загрузки вопросов');
      onExit();
    }
  };

  const loadScores = async () => {
    try {
      const { data, error } = await supabase
        .from('duel_players')
        .select('*')
        .eq('duel_id', duelId);

      if (error) throw error;
      if (!data) return;

      // Find my player using either user_id or id
      const myPlayer = data.find(p => p.user_id === profileId || p.id === myPlayerId);
      const opponent = data.find(p => p.user_id !== profileId && p.id !== myPlayerId);

      if (myPlayer) setMyScore(myPlayer.score);
      if (opponent) setOpponentScore(opponent.score);
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  };

  const loadBoosts = async () => {
    try {
      const { data, error } = await supabase
        .from('boost_inventory')
        .select('*')
        .eq('user_id', profileId)
        .gt('quantity', 0);

      if (error) throw error;
      setBoosts(data || []);
    } catch (error) {
      console.error('Error loading boosts:', error);
    }
  };

  const handleBoostUse = async (boostType: string) => {
    try {
      const response = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          boost_type: boostType,
          duel_question_id: currentQuestion?.id
        }
      });

      if (response.error) throw response.error;

      // Handle different boost effects
      if (boostType === 'fifty_fifty') {
        // Filter out 2 incorrect answers
        const currentQuestion = questions[currentIndex];
        const incorrectOptions = currentQuestion.question_snapshot.options
          .filter((opt: any) => !currentQuestion.correct_option_ids.includes(opt.id));
        const toEliminate = incorrectOptions.slice(0, 2).map((opt: any) => opt.id);
        setEliminatedOptions(prev => [...prev, ...toEliminate]);
        
        const id = `boost-${Date.now()}`;
        setToastNotifications(prev => [...prev, {
          id,
          title: '✂️ 50/50 активирован!',
          message: 'Убрано 2 неправильных ответа',
          icon: '✂️'
        }]);
        setTimeout(() => setToastNotifications(prev => prev.filter(n => n.id !== id)), 2000);
        
      } else if (boostType === 'time_extend') {
        // Add 30 seconds to current time
        setTimeLeft(prev => prev + 30000);
        
        const id = `boost-${Date.now()}`;
        setToastNotifications(prev => [...prev, {
          id,
          title: '⏰ Время продлено!',
          message: '+30 секунд к таймеру',
          icon: '⏰'
        }]);
        setTimeout(() => setToastNotifications(prev => prev.filter(n => n.id !== id)), 2000);
        
      } else if (boostType === 'hint') {
        // Show explanation
        setShowHint(true);
        
        const id = `boost-${Date.now()}`;
        setToastNotifications(prev => [...prev, {
          id,
          title: '💡 Подсказка показана!',
          message: 'Читайте объяснение к вопросу',
          icon: '💡'
        }]);
        setTimeout(() => setToastNotifications(prev => prev.filter(n => n.id !== id)), 2000);
        
      } else if (boostType === 'skip') {
        // Skip question
        setShowHint(false);
        handleTimeout();
      }

      // Mark boost as used
      setUsedBoosts(prev => [...prev, boostType]);
      await loadBoosts();
      
      sounds.boostActivate();
      haptics.buttonClick();
    } catch (error) {
      console.error('Error using boost:', error);
      toast.error('Ошибка использования бустера');
    }
  };

  const handleAnswer = async (selectedOptionId: string) => {
    if (isAnswered) return;

    setSelectedAnswer(selectedOptionId);
    setIsAnswered(true);

    const currentQuestion = questions[currentIndex];
    const isCorrect = currentQuestion.correct_option_ids.includes(selectedOptionId);
    const timeTaken = 60000 - timeLeft;

    sounds.answerSubmit();
    if (isCorrect) {
      sounds.correctAnswer();
      haptics.success();
      setCombo(prev => prev + 1);
    } else {
      sounds.wrongAnswer();
      haptics.error();
      setCombo(0);
    }

    try {
      const response = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          selected_option_id: selectedOptionId,
          time_taken_ms: timeTaken,
          is_correct: isCorrect,
          combo: combo,
        }
      });

      if (response.error) throw response.error;

      await loadScores();

      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(60000);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setEliminatedOptions([]);
          setShowHint(false);
          setUsedBoosts([]);
        } else {
          finishDuel();
        }
      }, 1500);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleTimeout = () => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    sounds.wrongAnswer();
    haptics.error();
    setCombo(0);

    setTimeout(async () => {
      const currentQuestion = questions[currentIndex];
      
      try {
        await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'submit_answer',
            duel_id: duelId,
            duel_question_id: currentQuestion.id,
            selected_option_id: null,
            time_taken_ms: 60000,
            is_correct: false,
            combo: 0,
          }
        });

        await loadScores();
      } catch (error) {
        console.error('Error submitting timeout:', error);
      }

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(60000);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setEliminatedOptions([]);
        setShowHint(false);
        setUsedBoosts([]);
      } else {
        finishDuel();
      }
    }, 1000);
  };

  const finishDuel = async () => {
    console.log('[DuelBattleFullscreen] Finishing duel...');
    
    try {
      const response = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'finish_duel',
          duel_id: duelId,
        }
      });

      if (response.error) throw response.error;

      console.log('[DuelBattleFullscreen] Finish response:', response.data);

      // If we need to wait for opponent
      if (response.data?.waiting) {
        console.log('[DuelBattleFullscreen] Waiting for opponent to finish...');
        setIsWaitingForOpponent(true);
        
        // Play notification sound
        sounds.victory();
        haptics.success();
      } else if (response.data?.finished) {
        console.log('[DuelBattleFullscreen] Both players finished, navigating to results...');
        onDuelFinished();
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error finishing duel:', error);
      toast.error('Ошибка завершения дуэли');
    }
  };

  const handleExit = () => {
    if (confirm('Вы уверены, что хотите выйти? Вы потеряете прогресс.')) {
      onExit();
    }
  };

  const currentQuestion = questions[currentIndex];

  if (loading || !currentQuestion) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">⚔️</div>
          <div className="text-xl font-bold">Загрузка дуэли...</div>
        </div>
      </div>
    );
  }

  // Minimized waiting widget
  if (isWaitingForOpponent && isMinimized) {
    return (
      <motion.div 
        className="fixed bottom-4 right-4 bg-card border-2 border-primary rounded-xl p-4 shadow-2xl cursor-pointer z-50"
        onClick={() => setIsMinimized(false)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-6 h-6 text-primary" />
          </motion.div>
          <div className="text-sm font-bold">Ожидание...</div>
        </div>
      </motion.div>
    );
  }

  // Waiting screen
  if (isWaitingForOpponent) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center space-y-6 border-2 shadow-xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-16 h-16 mx-auto text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold">⏳ Ожидание соперника...</h2>
          <p className="text-muted-foreground">Вы завершили дуэль! Следите за прогрессом соперника.</p>
          
          {/* Opponent Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс соперника:</span>
              <span className="font-bold">{state.opponentProgress || 0}/10</span>
            </div>
            <Progress 
              value={(state.opponentProgress || 0) * 10} 
              className="h-3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-3xl font-bold text-primary">{myScore}</div>
              <div className="text-sm text-muted-foreground mt-1">Ваш счёт</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <motion.div 
                className="text-3xl font-bold"
                key={state.opponentScore}
                initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'currentColor' }}
                transition={{ duration: 0.3 }}
              >
                {state.opponentScore || opponentScore}
              </motion.div>
              <div className="text-sm text-muted-foreground mt-1">Соперник</div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setIsMinimized(true);
              sounds.buttonClick();
              haptics.buttonClick();
            }}
            className="w-full"
          >
            Свернуть игру 📱
          </Button>
        </div>
      </div>
    );
  }

  // Main duel interface
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/10 to-background overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExit}
              className="bg-background/80 hover:bg-background backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1">
              {(['es', 'en', 'ru'] as Language[]).map((lang) => (
                <Button
                  key={lang}
                  variant={language === lang ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setLanguage(lang);
                    sounds.buttonClick();
                  }}
                  className="h-8 px-2 text-lg"
                >
                  {LANGUAGE_FLAGS[lang]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              <Users className="w-5 h-5 text-primary" />
              <motion.span 
                className="font-bold text-xl"
                key={myScore}
                initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'currentColor' }}
                transition={{ duration: 0.3 }}
              >
                {myScore}
              </motion.span>
            </div>
            
            <span className="text-muted-foreground font-bold">VS</span>
            
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="w-5 h-5 text-orange-500" />
              <motion.span 
                className="font-bold text-xl"
                key={state.opponentScore || opponentScore}
                initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                animate={{ 
                  scale: (state.opponentScore || opponentScore) > myScore ? 1.15 : 1,
                  color: (state.opponentScore || opponentScore) > myScore ? 'hsl(var(--destructive))' : 'currentColor'
                }}
                transition={{ duration: 0.3 }}
              >
                {state.opponentScore || opponentScore}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">Вопрос {currentIndex + 1} из {questions.length}</span>
            {combo > 1 && (
              <Badge variant="default" className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Серия {combo}
              </Badge>
            )}
          </div>
          <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
        </div>

        {/* Timer and Boosts */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timeLeft < 10000 ? 'text-destructive' : 'text-primary'}`} />
            <span className={`text-2xl font-bold ${timeLeft < 10000 ? 'text-destructive' : ''}`}>
              {Math.ceil(timeLeft / 1000)}s
            </span>
          </div>

          <div className="flex gap-2">
            {boosts.map((boost) => (
              <Button
                key={boost.boost_type}
                variant="outline"
                size="sm"
                onClick={() => handleBoostUse(boost.boost_type)}
                disabled={usedBoosts.includes(boost.boost_type) || isAnswered}
                className="relative"
              >
                {boost.boost_type === 'fifty_fifty' && '✂️'}
                {boost.boost_type === 'time_extend' && '⏰'}
                {boost.boost_type === 'hint' && '💡'}
                {boost.boost_type === 'skip' && '⏭️'}
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {boost.quantity}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Hint Display */}
        {showHint && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 rounded-xl max-h-48 overflow-y-auto shadow-lg"
          >
            <div className="flex items-start gap-2">
              <div className="text-3xl">💡</div>
              <div className="flex-1">
                <div className="font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center justify-between">
                  <span>Подсказка:</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowHint(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentQuestion.question_snapshot[`explanation_${language}`] || currentQuestion.question_snapshot.explanation_es}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Question */}
        <div className="bg-card rounded-2xl p-6 border-2 shadow-xl mb-6">
          <h3 className="text-2xl font-bold text-center mb-6 leading-tight">
            {currentQuestion.question_snapshot[`question_${language}`] || currentQuestion.question_snapshot.question_es}
          </h3>

          {currentQuestion.question_snapshot.image_url && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img 
                src={currentQuestion.question_snapshot.image_url} 
                alt="Question" 
                className="w-full max-h-64 object-contain"
              />
            </div>
          )}

          <div className="grid gap-3">
            {currentQuestion.question_snapshot.options
              .filter((opt: any) => !eliminatedOptions.includes(opt.id))
              .map((option: any, index: number) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrect = currentQuestion.correct_option_ids.includes(option.id);
                const showResult = isAnswered && isSelected;

                return (
                  <Button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    disabled={isAnswered}
                    variant="outline"
                    className={`
                      h-auto py-4 px-6 text-left justify-start text-lg font-medium
                      transition-all duration-200 hover:scale-[1.02]
                      ${showResult && isCorrect ? 'bg-success/20 border-success text-success-foreground' : ''}
                      ${showResult && !isCorrect ? 'bg-destructive/20 border-destructive text-destructive-foreground' : ''}
                      ${!showResult ? 'hover:bg-primary/5 hover:border-primary/30' : ''}
                    `}
                  >
                    <span className="mr-3 font-bold text-primary">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option[`text_${language}`] || option.text_es}
                  </Button>
                );
              })}
          </div>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {toastNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-1/2 z-50"
            >
              <NotificationToast
                title={notif.title}
                message={notif.message}
                icon={notif.icon}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
