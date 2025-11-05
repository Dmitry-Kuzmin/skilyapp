import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { BoostButton } from './BoostButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { Swords, Timer, Zap, Trophy, WifiOff, Wifi, Flame } from 'lucide-react';
import { DuelWaitingReplay } from './DuelWaitingReplay';

interface DuelBattleProps {
  duelId: string;
  onDuelFinished: () => void;
}

export function DuelBattle({ duelId, onDuelFinished }: DuelBattleProps) {
  const { profileId } = useUserContext();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000); // 60 seconds
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [boosts, setBoosts] = useState({ fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0, translate: 0 });
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [hintText, setHintText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<'ru' | 'en' | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const prevOpponentScore = useRef(opponentScore);
  const lastOpponentActivityRef = useRef(Date.now());
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [myName, setMyName] = useState<string>('Ты');
  const [opponentName, setOpponentName] = useState<string>('Соперник');

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
    setTranslationLanguage(null); // Сбрасываем перевод при переходе к следующему вопросу
  }, [currentIndex]);

  useEffect(() => {
    if (state.duelFinished) {
      onDuelFinished();
    }
  }, [state.duelFinished]);

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

  // Track opponent score changes with controlled notifications
  useEffect(() => {
    if (opponentScore > prevOpponentScore.current && prevOpponentScore.current > 0) {
      const diff = opponentScore - prevOpponentScore.current;
      const scoreDiff = opponentScore - myScore;
      
      if (diff > 100) {
        toast.warning('🔥 Соперник набрал комбо!', { 
          duration: 3000,
          icon: '🔥' 
        });
        haptics.warning();
      } else if (scoreDiff > 0 && scoreDiff <= 200) {
        // Only show if opponent is slightly ahead (not too spammy)
        toast.info(`⚡ Соперник впереди на ${scoreDiff} очков`, { 
          duration: 4000,
          icon: '⚡',
          id: 'opponent-ahead' // Prevent duplicates
        });
      } else if (scoreDiff > 200) {
        toast.warning(`🚀 Соперник опережает на ${scoreDiff}!`, {
          duration: 4000,
          icon: '🚀',
          id: 'opponent-far-ahead'
        });
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
      console.log('[DuelBattle] Loading questions via edge function');
      
      // Use edge function to load questions (bypasses RLS issues)
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'get_questions',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        console.log('[DuelBattle] Loaded', data.questions.length, 'questions');
        setQuestions(data.questions);
      } else {
        console.warn('[DuelBattle] No questions found');
        toast.error('Вопросы не найдены');
      }
    } catch (error) {
      console.error('[DuelBattle] Error loading questions:', error);
      toast.error('Не удалось загрузить вопросы');
    }
  };

  const loadScores = async () => {
    try {
      const { data } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
        .eq('duel_id', duelId);

      if (data && data.length > 0) {
        const myPlayer = data.find(p => p.user_id === profileId);
        const opponent = data.find(p => p.user_id !== profileId);
        
        // Сохраняем ID моего игрока для фильтрации realtime событий
        if (myPlayer?.id) {
          setMyPlayerId(myPlayer.id);
        }
        
        // Load player names
        const myProfile = myPlayer?.profiles as any;
        const opponentProfile = opponent?.profiles as any;
        setMyName(myProfile?.first_name || myProfile?.username || 'Ты');
        setOpponentName(opponentProfile?.first_name || opponentProfile?.username || 'Соперник');
        
        setMyScore(myPlayer?.score || 0);
        // Initial opponent score - realtime will update it
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
        const boostMap: any = { fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0, translate: 0 };
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

  // ============================================================================
  // CRITICAL: USE SERVER-PROVIDED BOOST EFFECTS ONLY
  // ============================================================================
  // All boost logic is calculated on server
  // Client only displays effects from server response
  // ============================================================================
  const handleUseBoost = async (type: string, language?: 'ru' | 'en') => {
    if (usedBoosts.includes(type) || answered) return;

    try {
      // Для translate бустера язык передается в метаданных
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          profile_id: profileId,
          duel_id: duelId,
          duel_question_id: currentQuestion.id,
          boost_type: type,
          language: language, // Для translate бустера
        },
      });

      if (error) throw error;

      // Apply server-provided boost effects
      if (type === 'fifty_fifty' && data.hidden_options) {
        sounds.boostFiftyFifty();
        haptics.boostActivated();
        setHiddenOptions(data.hidden_options);
        toast.success('⚡ 50/50: Два варианта убраны!', { duration: 3000 });
      } else if (type === 'time_extend' && data.time_added_ms) {
        sounds.boostTimeExtend();
        haptics.boostActivated();
        // Add exactly what server says (+30s), capped at 60s total
        setTimeLeft(prev => Math.min(prev + data.time_added_ms, 60000));
        toast.success(`⏱️ +${data.time_added_ms / 1000} секунд добавлено!`, { duration: 3000 });
      } else if (type === 'hint' && data.hint) {
        sounds.boostHint();
        haptics.boostActivated();
        setHintText(data.hint);
        setShowHint(true);
        toast.success('💡 Подсказка открыта!', { duration: 3000 });
      } else if (type === 'skip' && data.skip_confirmed) {
        sounds.boostSkip();
        haptics.boostActivated();
        toast.success('⏭️ Вопрос пропущен!', { duration: 2000 });
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            finishDuel();
          }
        }, 1000);
      } else if (type === 'translate' && language) {
        sounds.boostHint(); // Используем звук подсказки для перевода
        haptics.boostActivated();
        setTranslationLanguage(language);
        const langName = language === 'ru' ? 'русский' : 'английский';
        toast.success(`🌐 Перевод на ${langName} применён!`, { duration: 3000 });
      }

      setUsedBoosts(prev => [...prev, type]);
      setBoosts(prev => ({ ...prev, [type]: Math.max(0, prev[type as keyof typeof prev] - 1) }));
    } catch (error: any) {
      toast.error(error.message || 'Ошибка использования буста', { duration: 4000 });
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

      // ============================================================================
      // CRITICAL: USE SERVER-PROVIDED SCORE ONLY
      // ============================================================================
      // Client MUST use new_score from server response
      // Never calculate score locally - server is source of truth
      // ============================================================================
      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);
        
        // CRITICAL: Always use server-provided combo value, even if it's 0
        // Server returns 0 when answer is incorrect or skipped - this resets combo
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        
        console.log('[DuelBattle] Server response:', {
          isCorrect: correctAnswer,
          serverCombo,
          points: data.points_awarded
        });
        
        if (correctAnswer) {
          sounds.correctAnswer();
          haptics.correctAnswer();
          const points = data.points_awarded || 0;
          if (serverCombo > 1) {
            sounds.combo(serverCombo);
            haptics.combo();
            toast.success(`🔥 Комбо x${serverCombo}! +${points} очков`, { duration: 3000 });
          } else if (points > 150) {
            toast.success(`⭐ Идеальный ответ! +${points} очков`, { duration: 3000 });
          } else {
            toast.success(`✅ Правильно! +${points} очков`, { duration: 2500 });
          }
        } else {
          sounds.wrongAnswer();
          haptics.wrongAnswer();
          toast.error('❌ Неправильно', { duration: 2000 });
          // Combo should be 0 after wrong answer
          if (serverCombo !== 0) {
            console.warn('[DuelBattle] Warning: Server returned non-zero combo for incorrect answer:', serverCombo);
          }
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

      if (data) {
        // Update score and combo from server
        if (data.new_score !== undefined) {
          setMyScore(data.new_score);
        }
        // CRITICAL: Always set combo from server, even if 0 (timeout/skip resets combo)
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        console.log('[DuelBattle] Timeout - Server combo:', serverCombo);
        
        if (penaltyPoints < 0) {
        setMyScore(prev => Math.max(0, prev + penaltyPoints));
        }
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
      console.log('[DuelBattle] Finishing duel - I completed all questions');
      
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'finish_duel',
          profile_id: profileId,
          duel_id: duelId,
        },
      });

      if (error) throw error;

      // Server returns finished: true if both players finished, false if waiting
      if (data?.finished === true) {
        // Both finished - go to results immediately
        console.log('[DuelBattle] Both players finished, going to results');
        toast.success('🏁 Дуэль завершена!', { duration: 3000 });
        onDuelFinished();
      } else {
        // Wait for opponent - show waiting screen
        console.log('[DuelBattle] Waiting for opponent to finish');
        toast.info('⏳ Ожидание соперника...', { duration: 3000 });
        setIsWaitingForOpponent(true);
      }
    } catch (error) {
      console.error('Error finishing duel:', error);
      toast.error('Ошибка завершения дуэли');
    }
  };

  // ============================================================================
  // CRITICAL: WAITING FOR OPPONENT - LIVE REPLAY
  // ============================================================================
  if (isWaitingForOpponent) {
    return (
      <DuelWaitingReplay
        duelId={duelId}
        myScore={myScore}
        totalQuestions={questions.length}
        onDuelFinished={onDuelFinished}
      />
    );
  }

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
          {/* Top Row: Scores - Premium Design */}
          <div className="flex items-center justify-between gap-4">
            {/* My Score - Enhanced */}
            <motion.div 
              className="flex items-center gap-3 flex-1 group"
              whileHover={{ scale: 1.02 }}
              animate={myScore > opponentScore ? { 
                boxShadow: ['0 0 0px rgba(59, 130, 246, 0)', '0 0 20px rgba(59, 130, 246, 0.5)', '0 0 0px rgba(59, 130, 246, 0)']
              } : {}}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                {myScore > opponentScore && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{myName}</p>
                <motion.p 
                  key={myScore}
                  className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                  initial={{ scale: 1.2, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {myScore}
                </motion.p>
              </div>
            </motion.div>

            {/* Center: Progress & Timer - Enhanced */}
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border-2 border-primary/20 shadow-lg">
              <div className="text-center">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">
                    {currentIndex + 1}/{questions.length}
                  </span>
                </div>
                <div className="relative w-24 h-2 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full shadow-sm"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/30">
                <Timer className={`w-4 h-4 ${timeLeft < 10000 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                <span className={`font-bold text-sm tabular-nums ${timeLeft < 10000 ? 'text-destructive' : 'text-foreground'}`}>
                  {(timeLeft / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Opponent Score - Enhanced */}
            <motion.div 
              className="flex items-center gap-3 flex-1 justify-end group"
              whileHover={{ scale: 1.02 }}
              animate={state.opponentAnswered ? { scale: [1, 1.05, 1] } : {}}
            >
              <div className="flex-1 text-right">
                <p className="text-xs font-medium text-muted-foreground mb-0.5 truncate max-w-[120px] ml-auto" title={opponentName}>
                  {opponentName}
                </p>
                <motion.p 
                  key={opponentScore}
                  className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                  initial={{ scale: 1.2, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {opponentScore}
                </motion.p>
              </div>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                {opponentScore > myScore && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                {state.opponentAnswered && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Zap className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Bottom Row: Boosts + Status */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
            {/* Boosts */}
            <div className="flex items-center gap-1.5">
              <BoostButton
                type="fifty_fifty"
                name="50/50"
                available={boosts.fifty_fifty}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('fifty_fifty')}
              />
              <BoostButton
                type="time_extend"
                name="+30s"
                available={boosts.time_extend}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('time_extend')}
              />
              <BoostButton
                type="hint"
                name="Hint"
                available={boosts.hint}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('hint')}
              />
              <BoostButton
                type="skip"
                name="Skip"
                available={boosts.skip}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('skip')}
              />
              <BoostButton
                type="translate"
                name="Translate"
                available={boosts.translate}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('translate')}
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
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="relative"
                >
                  <Badge className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 border-none text-white px-2 py-1 text-xs font-bold shadow-lg shadow-orange-500/50 flex items-center gap-1">
                    <Flame className="w-3 h-3 animate-pulse" />
                  x{combo}
                  </Badge>
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
            {translationLanguage === 'ru' && snapshot.question_ru
              ? snapshot.question_ru
              : translationLanguage === 'en' && snapshot.question_en
              ? snapshot.question_en
              : snapshot.question_es}
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
                      <span className="flex-1">
                        {translationLanguage === 'ru' && option.text_ru
                          ? option.text_ru
                          : translationLanguage === 'en' && option.text_en
                          ? option.text_en
                          : option.text_es}
                      </span>
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
