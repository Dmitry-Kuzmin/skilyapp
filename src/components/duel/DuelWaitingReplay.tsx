import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { 
  Clock, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  EyeOff,
  Eye,
  Zap,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';
import { DuelWidget } from './DuelWidget';
import { createPortal } from 'react-dom';

interface OpponentAnswer {
  question_number: number;
  is_correct: boolean;
  is_skipped: boolean;
  time_taken_ms: number;
  points_awarded: number;
}

interface DuelWaitingReplayProps {
  duelId: string;
  myScore: number;
  totalQuestions: number;
  onDuelFinished: () => void;
  onHide?: (hidden: boolean) => void;
  onExpand?: () => void; // Callback when widget is expanded
  initialHidden?: boolean; // Start in hidden state if true
}

export function DuelWaitingReplay({ 
  duelId, 
  myScore, 
  totalQuestions,
  onDuelFinished,
  onHide,
  onExpand,
  initialHidden = false
}: DuelWaitingReplayProps) {
  const { profileId } = useUserContext();
  const [opponentAnswers, setOpponentAnswers] = useState<OpponentAnswer[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentName, setOpponentName] = useState('Соперник');
  const [myName, setMyName] = useState('Вы');
  const [isHidden, setIsHidden] = useState(initialHidden);
  const [isDuelFinished, setIsDuelFinished] = useState(false);
  const isCheckingFinishedRef = useRef(false);
  const opponentPlayerIdRef = useRef<string | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    // Initial load with delay for Telegram to ensure WebApp is ready
    if (isTelegram) {
      // Small delay for Telegram WebApp to fully initialize
      setTimeout(() => {
        loadOpponentData();
        subscribeToOpponentProgress();
        checkDuelStatus();
      }, 300);
    } else {
      loadOpponentData();
      subscribeToOpponentProgress();
      checkDuelStatus();
    }
    
    // Periodically reload opponent data to catch any missed answers
    // This ensures we always have the latest state, especially when first player finishes
    // Telegram WebApp may have slower realtime updates, so we reload more frequently
    const reloadInterval = setInterval(() => {
      loadOpponentData();
    }, isTelegram ? 1000 : 2000); // Reload every 1 second in Telegram, 2 seconds in browser
    
    return () => {
      clearInterval(reloadInterval);
    };
  }, [duelId]);

  // Check if opponent finished all questions
  const checkIfOpponentFinished = async () => {
    try {
      if (isDuelFinished) return; // Already finished

      const { data: duel } = await supabase
        .from('duels')
        .select('num_questions')
        .eq('id', duelId)
        .single();

      if (!duel) return;

      const { data: players } = await supabase
        .from('duel_players')
        .select('id, user_id')
        .eq('duel_id', duelId);

      if (!players || players.length < 2) return;

      const opponent = players.find((p: any) => p.user_id !== profileId);
      if (!opponent) return;

      const { count: opponentAnswers } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', opponent.id)
        .eq('duel_id', duelId);

      console.log('[DuelWaitingReplay] Checking if opponent finished:', {
        opponentAnswers: opponentAnswers || 0,
        required: duel.num_questions
      });

      if ((opponentAnswers || 0) >= duel.num_questions) {
        console.log('[DuelWaitingReplay] ✅ Opponent finished! Transitioning to results');
        setIsDuelFinished(true);
        sounds.victory();
        toast.success('🏁 Соперник закончил!', {
          description: 'Переход к результатам...',
          duration: 2000,
        });
        setTimeout(() => {
          onDuelFinished();
        }, 1500);
      }
    } catch (error) {
      console.error('[DuelWaitingReplay] Error checking if opponent finished:', error);
    }
  };

  // Check if duel is really finished - verify opponent actually completed all questions
  const checkDuelStatus = async () => {
    try {
      const { data: duel } = await supabase
        .from('duels')
        .select('status, num_questions')
        .eq('id', duelId)
        .single();

      if (!duel || duel.status !== 'finished') return;

      // Get opponent's player ID
      const { data: players } = await supabase
        .from('duel_players')
        .select('id, user_id')
        .eq('duel_id', duelId);

      if (!players || players.length < 2) return;

      const opponent = players.find((p: any) => p.user_id !== profileId);
      if (!opponent) return;

      // Count opponent's actual answers
      const { count: opponentAnswers } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', opponent.id)
        .eq('duel_id', duelId);

      console.log('[DuelWaitingReplay] Initial status check:', {
        status: duel.status,
        opponentAnswers: opponentAnswers || 0,
        required: duel.num_questions
      });

      // Only transition if opponent really finished all questions
      if ((opponentAnswers || 0) >= duel.num_questions) {
        console.log('[DuelWaitingReplay] ✅ Opponent finished all questions, transitioning to results');
        setIsDuelFinished(true);
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', {
          description: 'Смотрите результаты',
          duration: 3000,
        });
        setTimeout(() => {
          onDuelFinished();
        }, 1000);
      } else {
        console.log('[DuelWaitingReplay] ⚠️ Status is finished but opponent hasn\'t answered all questions yet - staying on waiting screen');
      }
    } catch (error) {
      console.error('[DuelWaitingReplay] Error checking duel status:', error);
    }
  };

  const loadOpponentData = async () => {
    try {
      // Get opponent info
      const { data: players } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
        .eq('duel_id', duelId);

      if (players) {
        const opponent = players.find(p => p.user_id !== profileId);
        const myPlayer = players.find(p => p.user_id === profileId);
        
        if (opponent) {
          const opponentProfile = opponent.profiles as any;
          setOpponentName(opponentProfile?.first_name || opponentProfile?.username || 'Соперник');
          setOpponentScore(opponent.score || 0);
        }
        
        if (myPlayer) {
          const myProfile = myPlayer.profiles as any;
          setMyName(myProfile?.first_name || myProfile?.username || 'Вы');
        }
      }

      // Get opponent's answers so far
      // First, get all players to find opponent's player ID
      const { data: allPlayers } = await supabase
        .from('duel_players')
        .select('id, user_id, score')
        .eq('duel_id', duelId);
      
      if (!allPlayers || allPlayers.length < 2) {
        console.warn('[DuelWaitingReplay] Not enough players found');
        return;
      }
      
      const myPlayer = allPlayers.find(p => p.user_id === profileId);
      const opponent = allPlayers.find(p => p.user_id !== profileId);
      
      if (!myPlayer || !opponent) {
        console.warn('[DuelWaitingReplay] Could not find my player or opponent');
        return;
      }
      
      // Store player IDs in refs for use in subscriptions
      myPlayerIdRef.current = myPlayer.id;
      opponentPlayerIdRef.current = opponent.id;
      
      console.log('[DuelWaitingReplay] Stored player IDs:', {
        myPlayerId: myPlayerIdRef.current,
        opponentPlayerId: opponentPlayerIdRef.current
      });
      
      // Update opponent score
      setOpponentScore(opponent.score || 0);
      
      // Get opponent's answers using opponent's player ID
      const { data: answers, error: answersError } = await supabase
        .from('duel_answers')
        .select(`
          *,
          duel_questions!inner(position)
        `)
        .eq('duel_id', duelId)
        .eq('player_id', opponent.id)
        .order('created_at', { ascending: true });

      if (answersError) {
        console.error('[DuelWaitingReplay] Error loading opponent answers:', answersError);
        return;
      }

      if (answers && answers.length > 0) {
        const formattedAnswers = answers.map((ans: any) => {
          // Handle both nested and flat structure
          const position = ans.duel_questions?.position || ans.position;
          if (!position) {
            console.warn('[DuelWaitingReplay] Answer without position:', ans);
          }
          return {
            question_number: position,
            is_correct: ans.is_correct,
            is_skipped: ans.is_skipped || false,
            time_taken_ms: ans.time_taken_ms,
            points_awarded: ans.points_awarded || 0,
          };
        })
        // Filter out answers without position and sort by question_number
        .filter((a: any) => a.question_number)
        .sort((a, b) => a.question_number - b.question_number);
        
        console.log('[DuelWaitingReplay] Loaded opponent answers:', {
          count: formattedAnswers.length,
          answers: formattedAnswers,
          rawAnswers: answers,
          opponentPlayerId: opponent.id,
          myPlayerId: myPlayer.id,
          isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp
        });
        
        // Always update state
        setOpponentAnswers(formattedAnswers);
      } else {
        console.log('[DuelWaitingReplay] No opponent answers found yet');
        // Reset to empty array if no answers
        setOpponentAnswers([]);
      }
    } catch (error) {
      console.error('Error loading opponent data:', error);
    }
  };

  const getMyPlayerId = async () => {
    const { data } = await supabase
      .from('duel_players')
      .select('id')
      .eq('duel_id', duelId)
      .eq('user_id', profileId)
      .single();
    return data?.id;
  };

  const subscribeToOpponentProgress = async () => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    // Get all players to find opponent's player ID
    const { data: allPlayers } = await supabase
      .from('duel_players')
      .select('id, user_id')
      .eq('duel_id', duelId);
    
    if (!allPlayers || allPlayers.length < 2) {
      console.error('[DuelWaitingReplay] Could not get players for subscription');
      return;
    }
    
    const myPlayer = allPlayers.find(p => p.user_id === profileId);
    const opponent = allPlayers.find(p => p.user_id !== profileId);
    
    if (!myPlayer || !opponent) {
      console.error('[DuelWaitingReplay] Could not find my player or opponent for subscription');
      return;
    }
    
    const myPlayerId = myPlayer.id;
    const opponentPlayerId = opponent.id;
    
    // Update refs
    myPlayerIdRef.current = myPlayerId;
    opponentPlayerIdRef.current = opponentPlayerId;
    
    console.log('[DuelWaitingReplay] Subscribing to opponent progress:', {
      duelId,
      myPlayerId,
      opponentPlayerId,
      isTelegram
    });

    // Subscribe to new answers from opponent
    const channel = supabase
      .channel(`duel_waiting_${duelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const answer = payload.new as any;
          
          // Use ref to get current opponent player ID (handles closure issues)
          const currentOpponentPlayerId = opponentPlayerIdRef.current;
          
          if (!currentOpponentPlayerId) {
            console.warn('[DuelWaitingReplay] Opponent player ID not set in subscription');
            return;
          }
          
          // Check if it's opponent's answer using opponent player ID from ref
          if (answer.player_id === currentOpponentPlayerId) {
            console.log('[DuelWaitingReplay] ✅ Opponent answered!', {
              answerId: answer.id,
              playerId: answer.player_id,
              opponentPlayerId: currentOpponentPlayerId,
              questionId: answer.duel_question_id,
              isCorrect: answer.is_correct
            });

            // Get question position
            const { data: question } = await supabase
              .from('duel_questions')
              .select('position')
              .eq('id', answer.duel_question_id)
              .single();

            if (question) {
              const newAnswer: OpponentAnswer = {
                question_number: question.position,
                is_correct: answer.is_correct,
                is_skipped: answer.is_skipped || false,
                time_taken_ms: answer.time_taken_ms,
                points_awarded: answer.points_awarded || 0,
              };

              // Load actual score from database (server is source of truth)
              // This ensures we get the correct score even if realtime update is delayed
              // Small delay to ensure server has updated the score after inserting the answer
              setTimeout(async () => {
                const { data: players } = await supabase
                  .from('duel_players')
                  .select('score, user_id, id')
                  .eq('duel_id', duelId);
                
                if (players) {
                  const opponent = players.find((p: any) => p.user_id !== profileId);
                  if (opponent) {
                    console.log('[DuelWaitingReplay] Loading opponent score from DB:', opponent.score);
                    setOpponentScore(opponent.score || 0);
                  }
                }
              }, 200); // Small delay to ensure score is updated

              // Play sound and show notification if not hidden
              if (!isHidden) {
                sounds.notificationPop();
                if (answer.is_correct) {
                  toast.info(`✅ Соперник: Вопрос ${question.position} - Правильно! (+${newAnswer.points_awarded})`, {
                    duration: 2000,
                  });
                } else {
                  toast.info(`❌ Соперник: Вопрос ${question.position} - Ошибка`, {
                    duration: 2000,
                  });
                }
              }

              // Reload all answers from database to ensure we have the latest state
              // This is more reliable than trying to update state manually
              const reloadAnswers = async () => {
                try {
                  const { data: reloadedAnswers, error: reloadError } = await supabase
                    .from('duel_answers')
                    .select(`
                      *,
                      duel_questions!inner(position)
                    `)
                    .eq('duel_id', duelId)
                    .eq('player_id', currentOpponentPlayerId)
                    .order('created_at', { ascending: true });
                  
                  if (reloadError) {
                    console.error('[DuelWaitingReplay] Error reloading answers:', reloadError);
                    // Fallback: update state manually
                    setOpponentAnswers(prev => {
                      const existing = prev.find(a => a.question_number === question.position);
                      if (existing) {
                        console.log('[DuelWaitingReplay] Answer already exists, skipping:', question.position);
                        return prev;
                      }
                      const updated = [...prev, newAnswer].sort((a, b) => a.question_number - b.question_number);
                      return updated;
                    });
                    return;
                  }
                  
                  if (reloadedAnswers && reloadedAnswers.length > 0) {
                    const formatted = reloadedAnswers.map((ans: any) => {
                      const position = ans.duel_questions?.position || ans.position;
                      if (!position) {
                        console.warn('[DuelWaitingReplay] Answer without position in reload:', ans);
                      }
                      return {
                        question_number: position,
                        is_correct: ans.is_correct,
                        is_skipped: ans.is_skipped || false,
                        time_taken_ms: ans.time_taken_ms,
                        points_awarded: ans.points_awarded || 0,
                      };
                    })
                    .filter((a: any) => a.question_number)
                    .sort((a, b) => a.question_number - b.question_number);
                    
                    console.log('[DuelWaitingReplay] ✅ Reloaded opponent answers after new answer:', {
                      count: formatted.length,
                      questionNumbers: formatted.map(a => a.question_number),
                      totalQuestions
                    });
                    
                    setOpponentAnswers(formatted);
                    
                    // Check if opponent finished all questions
                    if (formatted.length >= totalQuestions && !isCheckingFinishedRef.current) {
                      console.log('[DuelWaitingReplay] Opponent answered all questions - checking if finished');
                      isCheckingFinishedRef.current = true;
                      
                      const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
                      setTimeout(async () => {
                        await checkIfOpponentFinished();
                        isCheckingFinishedRef.current = false;
                      }, isTelegram ? 1200 : 800);
                    }
                  } else {
                    console.warn('[DuelWaitingReplay] No answers found after reload');
                  }
                } catch (error) {
                  console.error('[DuelWaitingReplay] Exception reloading answers:', error);
                  // Fallback: update state manually
                  setOpponentAnswers(prev => {
                    const existing = prev.find(a => a.question_number === question.position);
                    if (existing) return prev;
                    const updated = [...prev, newAnswer].sort((a, b) => a.question_number - b.question_number);
                    return updated;
                  });
                }
              };
              
              // Small delay to ensure answer is committed to database
              setTimeout(() => {
                reloadAnswers();
              }, 300);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const updatedPlayer = payload.new as any;
          
          // Use ref to get current opponent player ID
          const currentOpponentPlayerId = opponentPlayerIdRef.current;
          
          if (!currentOpponentPlayerId) {
            return;
          }
          
          // Check if this is opponent's score update using opponent player ID from ref
          if (updatedPlayer.id === currentOpponentPlayerId) {
            console.log('[DuelWaitingReplay] ✅ Opponent score UPDATE:', {
              playerId: updatedPlayer.id,
              opponentPlayerId: currentOpponentPlayerId,
              score: updatedPlayer.score
            });
            // Use server score as source of truth
            setOpponentScore(updatedPlayer.score || 0);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duels',
          filter: `id=eq.${duelId}`,
        },
        async (payload) => {
          const duel = payload.new as any;
          if (duel.status === 'finished' && !isDuelFinished) {
            console.log('[DuelWaitingReplay] Duel status changed to finished - verifying opponent completed');
            
            // Small delay to ensure opponent's last answer is committed to database
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if opponent finished - this will transition to results if true
            await checkIfOpponentFinished();
            
            // Also check duel status directly - if both finished, go to results immediately
            const { data: duelData } = await supabase
              .from('duels')
              .select('status, num_questions')
              .eq('id', duelId)
              .single();
            
            if (duelData?.status === 'finished') {
              // Get opponent's player ID
              const { data: players } = await supabase
                .from('duel_players')
                .select('id, user_id')
                .eq('duel_id', duelId);
              
              if (players && players.length >= 2) {
                const opponent = players.find((p: any) => p.user_id !== profileId);
                if (opponent) {
                  // Count opponent's actual answers
                  const { count: opponentAnswers } = await supabase
                    .from('duel_answers')
                    .select('*', { count: 'exact', head: true })
                    .eq('player_id', opponent.id)
                    .eq('duel_id', duelId);
                  
                  if ((opponentAnswers || 0) >= (duelData.num_questions || 0)) {
                    console.log('[DuelWaitingReplay] ✅ Both players finished, transitioning to results');
                    if (!isDuelFinished) {
                      setIsDuelFinished(true);
                      sounds.victory();
                      toast.success('🏁 Дуэль завершена!', {
                        description: 'Переход к результатам...',
                        duration: 2000,
                      });
                      setTimeout(() => {
                        onDuelFinished();
                      }, 1000);
                    }
                  }
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const progress = (opponentAnswers.length / totalQuestions) * 100;

  // Notify parent when hide state changes
  useEffect(() => {
    if (onHide) {
      onHide(isHidden);
    }
  }, [isHidden, onHide]);

  // When hidden, show widget as portal and return null so parent can show normal content
  if (isHidden && !isDuelFinished) {
    // Render widget via portal to document.body
    // Portal renders to body, but component returns null so parent can show menu
    return createPortal(
      <DuelWidget
        myScore={myScore}
        opponentScore={opponentScore}
        myName={myName}
        opponentName={opponentName}
        progress={progress}
        totalQuestions={totalQuestions}
        currentQuestion={opponentAnswers.length + 1}
        onExpand={() => {
          setIsHidden(false);
          // Notify parent to switch back to battle mode
          if (onHide) {
            onHide(false);
          }
          // Also call onExpand callback if provided
          if (onExpand) {
            onExpand();
          }
        }}
      />,
      document.body
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4"
    >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl space-y-6"
            >
        {/* Header */}
        <Card className="p-6 bg-card border border-border/50 shadow-lg">
          <div className="text-center space-y-5">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Trophy className="w-8 h-8 text-white" />
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Вы закончили первым!</h2>
              <p className="text-muted-foreground">
                Ожидание ответа от <span className="font-semibold text-foreground">{opponentName}</span>
              </p>
            </div>

            {/* Scores */}
            <div className="flex items-center justify-center gap-8 pt-3 pb-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Вы</div>
                <motion.div 
                  className="text-3xl font-black text-primary"
                  key={myScore}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {myScore}
                </motion.div>
              </div>
              <div className="text-xl font-bold text-muted-foreground/40">VS</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">{opponentName}</div>
                <motion.div 
                  className="text-3xl font-black text-secondary"
                  key={opponentScore}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {opponentScore}
                </motion.div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Прогресс: {opponentAnswers.length}/{totalQuestions}
                </span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Hide/Show Toggle */}
        <div className="flex justify-center">
          <Button
            variant={isHidden ? "default" : "outline"}
            size="lg"
            onClick={() => setIsHidden(!isHidden)}
            className="gap-2"
          >
            {isHidden ? (
              <>
                <Eye className="w-5 h-5" />
                Показать прогресс
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5" />
                Скрыть игру
              </>
            )}
          </Button>
        </div>

        {/* Compact Live Progress */}
        <AnimatePresence>
          {!isHidden && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                {/* Visual Progress Timeline */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Ход игры {opponentName !== 'Соперник' ? opponentName : ''}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {opponentAnswers.length} / {totalQuestions}
                    </span>
                  </div>
                  
                  {/* Compact Visual Timeline */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                      const questionNum = idx + 1;
                      const answer = opponentAnswers.find(a => a.question_number === questionNum);
                      const isAnswered = !!answer;
                      
                      // Determine current question: next unanswered question after all answered ones
                      // Get all answered question numbers sorted
                      const answeredQuestionNumbers = opponentAnswers
                        .map(a => a.question_number)
                        .filter(n => n >= 1 && n <= totalQuestions)
                        .sort((a, b) => a - b);
                      
                      // Current question is the next unanswered question
                      // If answered [1, 2, 3, 4], current is 5
                      // If answered [1, 2, 4, 5], current is 3 (first gap)
                      // If all answered, no current question
                      let currentQuestionNumber: number | null = null;
                      if (answeredQuestionNumbers.length < totalQuestions) {
                        // Find first unanswered question
                        for (let i = 1; i <= totalQuestions; i++) {
                          if (!answeredQuestionNumbers.includes(i)) {
                            currentQuestionNumber = i;
                            break;
                          }
                        }
                      }
                      
                      const isCurrent = currentQuestionNumber !== null && questionNum === currentQuestionNumber && !isAnswered;

                      return (
                        <motion.div
                          key={questionNum}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                            isAnswered 
                              ? answer.is_skipped
                                ? 'bg-muted text-muted-foreground'
                                : answer.is_correct 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : isCurrent
                              ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse'
                              : 'bg-muted/30 text-muted-foreground border border-border/30'
                          }`}
                          title={
                            isAnswered 
                              ? answer.is_skipped
                                ? `Вопрос ${questionNum}: Пропущено`
                                : answer.is_correct 
                                ? `Вопрос ${questionNum}: Правильно (+${answer.points_awarded})`
                                : `Вопрос ${questionNum}: Неправильно`
                              : isCurrent
                              ? 'Отвечает...'
                              : 'Ожидание'
                          }
                        >
                          {isAnswered ? (
                            answer.is_skipped ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : answer.is_correct ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            questionNum
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity - Last 3 Answers */}
                {opponentAnswers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-3">
                      Последние ответы
                    </div>
                    {opponentAnswers.slice(-3).reverse().map((answer, idx) => (
                      <motion.div
                        key={`${answer.question_number}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          answer.is_skipped
                            ? 'bg-muted/20'
                            : answer.is_correct 
                            ? 'bg-green-500/10' 
                            : 'bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {answer.is_skipped ? (
                            <>
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Вопрос {answer.question_number} пропущен
                              </span>
                            </>
                          ) : answer.is_correct ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium">
                                Вопрос {answer.question_number} — Правильно
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="font-medium">
                                Вопрос {answer.question_number} — Неправильно
                              </span>
                            </>
                          )}
                        </div>
                        {!answer.is_skipped && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(answer.time_taken_ms / 1000).toFixed(1)}с</span>
                            {answer.points_awarded > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                +{answer.points_awarded}
                              </Badge>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Mode Message */}
        {isHidden && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Card className="p-8 bg-muted/50">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <EyeOff className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium mb-2">Игра скрыта</p>
              <p className="text-sm text-muted-foreground">
                Вы получите уведомление, когда соперник закончит
              </p>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
