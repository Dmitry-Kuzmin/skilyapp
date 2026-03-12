import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useDuelData } from '@/hooks/useDuelData';
import { BoostButton } from './BoostButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { Swords, Timer, Zap, Trophy, WifiOff, Wifi, Flame } from 'lucide-react';
import { DuelWaitingReplay } from './DuelWaitingReplay';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/imageUtils';

interface DuelBattleProps {
  duelId: string;
  onDuelFinished: () => void;
}

export function DuelBattle({ duelId, onDuelFinished }: DuelBattleProps) {
  const { t } = useLanguage();
  const { profileId } = useUserContext();
  const { fetchQuestions, fetchPlayers, fetchBoostInventory } = useDuelData(duelId, profileId);
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
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [myName, setMyName] = useState<string>(t('duelPass.table.columns.you'));
  const [opponentName, setOpponentName] = useState<string>(t('duelPass.table.columns.opponent'));
  const questionEndTimeRef = useRef<number | null>(null);
  const TIME_LIMIT_MS = 60000;

  const syncBoostInventory = useCallback(async () => {
    try {
      const inventory = await fetchBoostInventory();
      const boostMap = {
        fifty_fifty: 0,
        time_extend: 0,
        hint: 0,
        skip: 0,
        translate: 0,
      };
      inventory.forEach((item) => {
        if (item.boost_type in boostMap) {
          (boostMap as any)[item.boost_type] = item.quantity;
        }
      });
      setBoosts(boostMap);
    } catch (error) {
      console.error('[DuelBattle] Error syncing boosts:', error);
    }
  }, [fetchBoostInventory]);

  const finishDuel = useCallback(async () => {
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

      if (data?.finished === true) {
        console.log('[DuelBattle] Both players finished, going to results');
        toast.success(t('duel.finished'), { duration: 3000 });
        onDuelFinished();
      } else {
        console.log('[DuelBattle] Waiting for opponent to finish');
        toast.info(t('duel.waitingOpponent'), { duration: 3000 });
        setIsWaitingForOpponent(true);
      }
    } catch (error) {
      console.error('Error finishing duel:', error);
      toast.error(t('errors.generic'));
    }
  }, [duelId, profileId, onDuelFinished, t]);

  const handleTimeout = useCallback(async () => {
    if (answered) return;
    
    setAnswered(true);
    setShowCorrectAnswer(true);
    
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    let penaltyPoints = 0;
    if (newSkipCount % 2 === 0) {
      penaltyPoints = -50;
      toast.warning(t('duel.timeoutPenalty'));
    }
    if (newSkipCount >= 4) {
      penaltyPoints -= 100;
      toast.error(t('duel.timeoutCritical'));
    }

    try {
      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      const { data, error } = await supabase.functions.invoke('duel-manager', {
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

      if (error) throw error;

      if (data) {
        if (data.new_score !== undefined) {
          setMyScore(data.new_score);
        }
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        
        if (penaltyPoints < 0) {
          setMyScore(prev => Math.max(0, prev + penaltyPoints));
        }
      }

      toast.info(t('duel.timeoutInfo', { count: newSkipCount }));
    } catch (error) {
      console.error('[DuelBattle] Error submitting timeout:', error);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishDuel();
      }
    }, 3000);
  }, [answered, currentIndex, questions, skipCount, profileId, duelId, t, finishDuel]);

  const handleAnswer = useCallback(async (optionId: string) => {
    if (answered) return;

    setAnswered(true);
    setSelectedOption(optionId);

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

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

      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        
        const points = data.points_awarded || 0;
        if (correctAnswer) {
          sounds.correctAnswer();
          haptics.correctAnswer();
          if (serverCombo > 1) {
            sounds.combo(serverCombo);
            haptics.combo();
            toast.success(t('duel.comboToast', { combo: serverCombo, points }), { duration: 3000 });
          } else if (points > 150) {
            toast.success(t('duel.perfectToast', { points }), { duration: 3000 });
          } else {
            toast.success(t('duel.correctToast', { points }), { duration: 2500 });
          }
        } else {
          sounds.wrongAnswer();
          haptics.wrongAnswer();
          toast.error(t('duel.wrongToast'), { duration: 2000 });
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
      console.error('[DuelBattle] Error submitting answer:', error);
      toast.error(error.message || t('errors.generic'));
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          finishDuel();
        }
      }, 2500);
    }
  }, [answered, currentIndex, questions, timeLeft, profileId, duelId, t, finishDuel]);

  const handleUseBoost = useCallback(async (type: string, language?: 'ru' | 'en') => {
    if (usedBoosts.includes(type) || answered) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    try {
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('use_boost_attack', {
        p_duel_id: duelId,
        p_boost_type: type,
        p_duel_question_id: currentQuestion.id,
        p_language: language || null,
        p_profile_id: profileId || null,
      });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Failed to use boost');

      const data = rpcResult.boost_effect || rpcResult;

      if (type === 'fifty_fifty' && data.hidden_options) {
        sounds.boostFiftyFifty();
        haptics.boostActivated();
        setHiddenOptions(data.hidden_options);
        toast.success(t('duel.boostFiftyFifty'), { duration: 3000 });
      } else if (type === 'time_extend' && data.time_added_ms) {
        sounds.boostTimeExtend();
        haptics.boostActivated();
        if (questionEndTimeRef.current) {
          const now = Date.now();
          const currentRemaining = questionEndTimeRef.current - now;
          const newEndTime = now + Math.min(currentRemaining + data.time_added_ms, TIME_LIMIT_MS);
          questionEndTimeRef.current = newEndTime;
          setTimeLeft(Math.min(currentRemaining + data.time_added_ms, TIME_LIMIT_MS));
        } else {
          setTimeLeft(prev => Math.min(prev + data.time_added_ms, TIME_LIMIT_MS));
        }
        toast.success(t('duel.boostTimeExtend', { seconds: data.time_added_ms / 1000 }), { duration: 3000 });
      } else if (type === 'hint' && data.hint) {
        sounds.boostHint();
        haptics.boostActivated();
        setHintText(data.hint);
        setShowHint(true);
        toast.success(t('duel.boostHint'), { duration: 3000 });
      } else if (type === 'skip' && data.skip_confirmed) {
        sounds.boostSkip();
        haptics.boostActivated();
        toast.success(t('duel.boostSkip'), { duration: 2000 });
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            finishDuel();
          }
        }, 1000);
      } else if (type === 'translate' && language) {
        sounds.boostHint();
        haptics.boostActivated();
        setTranslationLanguage(language);
        const langName = language === 'ru' ? t('duel.russian') : t('duel.english');
        toast.success(t('duel.boostTranslate', { language: langName }), { duration: 3000 });
      }

      setUsedBoosts(prev => [...prev, type]);
      setBoosts(prev => ({ ...prev, [type]: Math.max(0, (prev as any)[type] - 1) }));
      await syncBoostInventory();
    } catch (error: any) {
      toast.error(error.message || t('errors.generic'), { duration: 4000 });
    }
  }, [usedBoosts, answered, questions, currentIndex, duelId, profileId, t, syncBoostInventory, finishDuel]);

  useEffect(() => {
    if (!duelId) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const questionsData = await fetchQuestions();
        if (isMounted) {
          setQuestions(questionsData);
        }
      } catch (error) {
        console.error('[DuelBattle] Failed to load questions:', error);
        toast.error(t('errors.generic'));
      }

      try {
        const players = await fetchPlayers();
        if (isMounted && players) {
          setMyPlayerId(players.myPlayerId);
          setMyScore(players.myScore);
          setOpponentScore(players.opponentScore);
          setMyName(players.myName);
          setOpponentName(players.opponentName);
        }
      } catch (error) {
        console.error('[DuelBattle] Failed to load player data:', error);
      }

      await syncBoostInventory();
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [duelId, fetchPlayers, fetchQuestions, syncBoostInventory, t]);

  useEffect(() => {
    if (!questions.length) return;
    
    setAnswered(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setTimeLeft(60000);
    setHiddenOptions([]);
    setUsedBoosts([]);
    setShowCorrectAnswer(false);
    setTranslationLanguage(null);
  }, [currentIndex]);

  useEffect(() => {
    if (state.duelFinished) {
      onDuelFinished();
    }
  }, [state.duelFinished, onDuelFinished]);

  useEffect(() => {
    if (typeof state.opponentScore === 'number') {
      if (state.opponentScore !== opponentScore) {
        setOpponentScore(state.opponentScore);
      }
    }
  }, [state.opponentScore, opponentScore]);

  useEffect(() => {
    if (typeof state.myScore === 'number') {
      if (state.myScore !== myScore) {
        setMyScore(state.myScore);
      }
    }
  }, [state.myScore, myScore]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (opponentScore > prevOpponentScore.current && prevOpponentScore.current > 0) {
      const diff = opponentScore - prevOpponentScore.current;
      if (diff > 100) {
        toast.warning(t('duel.comboToast', { combo: '?', points: diff }), { 
          duration: 3000,
          icon: '🔥' 
        });
        haptics.warning();
      }
    }
    prevOpponentScore.current = opponentScore;
  }, [opponentScore, myScore, t]);

  useEffect(() => {
    if (answered) return;
    const targetTime = Date.now() + TIME_LIMIT_MS;
    questionEndTimeRef.current = targetTime;
    setTimeLeft(TIME_LIMIT_MS);
  }, [currentIndex, answered]);

  useEffect(() => {
    if (answered || !questionEndTimeRef.current) return;

    const timer = setInterval(() => {
      if (questionEndTimeRef.current) {
        const now = Date.now();
        const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;

        if (secondsRemaining <= 0) {
          setTimeLeft(0);
          clearInterval(timer);
          questionEndTimeRef.current = null;
          handleTimeout();
        } else {
          setTimeLeft(secondsRemaining);
          if (secondsRemaining <= 10000 && secondsRemaining > 9750) {
            sounds.timeRunningOut();
          }
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [answered, handleTimeout]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && questionEndTimeRef.current && !answered) {
        const now = Date.now();
        const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;
        
        if (secondsRemaining <= 0) {
          setTimeLeft(0);
          questionEndTimeRef.current = null;
          handleTimeout();
        } else {
          setTimeLeft(secondsRemaining);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [answered, handleTimeout]);

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
        <p className="text-muted-foreground">{t('duel.loading')}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">{t('duel.errorLoading')}</p>
      </div>
    );
  }

  const snapshot = currentQuestion.question_snapshot as any;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Card className="p-4 md:p-5 bg-gradient-to-br from-card via-card/98 to-primary/5 border-2 border-primary/20 shadow-2xl backdrop-blur-sm relative overflow-hidden">
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
          <div className="flex items-center justify-between gap-4">
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
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5 truncate" title={myName}>{myName}</p>
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
                    className="h-full bg-gradient-to-r from-primary via-blue-500 to-pink-500 rounded-full shadow-sm"
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

            <motion.div 
              className="flex items-center gap-3 flex-1 justify-end group"
              whileHover={{ scale: 1.02 }}
              animate={state.opponentAnswered ? { scale: [1, 1.05, 1] } : {}}
            >
              <div className="flex-1 text-right min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5 truncate ml-auto" title={opponentName}>
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

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <BoostButton
                type="fifty_fifty"
                name={t('boostShop.boostNames.fifty_fifty.name')}
                available={boosts.fifty_fifty}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('fifty_fifty')}
              />
              <BoostButton
                type="time_extend"
                name={t('boostShop.boostNames.time_extend.name')}
                available={boosts.time_extend}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('time_extend')}
              />
              <BoostButton
                type="hint"
                name={t('boostShop.boostNames.hint.name')}
                available={boosts.hint}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('hint')}
              />
              <BoostButton
                type="skip"
                name={t('boostShop.boostNames.skip.name')}
                available={boosts.skip}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('skip')}
              />
              <BoostButton
                type="translate"
                name={t('boostShop.boostNames.translate.name')}
                available={boosts.translate}
                onUse={handleUseBoost}
                disabled={usedBoosts.includes('translate')}
              />
            </div>

            <div className="flex items-center gap-2">
              {!isOnline && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-bold"
                >
                  <WifiOff className="w-3 h-3" />
                  {t('duel.offline')}
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

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8 shadow-xl border-2">
          {snapshot.image_url && getImageUrl(snapshot.image_url) && (
            <motion.div 
              className="mb-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img
                src={getImageUrl(snapshot.image_url) || ''}
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
              <p className="text-sm font-medium">{t('duel.timeoutNoPoints')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('duel.timeoutCorrectHighlight')}</p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      <Dialog open={showHint} onOpenChange={setShowHint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💡 {t('duel.hint')}
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
