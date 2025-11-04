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

  useEffect(() => {
    loadOpponentData();
    subscribeToOpponentProgress();
    checkDuelStatus();
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
      const { data: answers } = await supabase
        .from('duel_answers')
        .select(`
          *,
          duel_questions!inner(position)
        `)
        .eq('duel_id', duelId)
        .neq('player_id', await getMyPlayerId())
        .order('created_at', { ascending: true });

      if (answers) {
        const formattedAnswers = answers.map((ans: any) => ({
          question_number: ans.duel_questions.position,
          is_correct: ans.is_correct,
          is_skipped: ans.is_skipped || false,
          time_taken_ms: ans.time_taken_ms,
          points_awarded: ans.points_awarded || 0,
        }));
        setOpponentAnswers(formattedAnswers);
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
    const myPlayerId = await getMyPlayerId();

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
          
          // Check if it's opponent's answer
          if (answer.player_id !== myPlayerId) {
            console.log('[DuelWaitingReplay] Opponent answered!', answer);

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

              // Check if opponent just finished all questions
              // Use a callback to get the latest state and check completion
              setOpponentAnswers(prev => {
                const updated = [...prev, newAnswer];
                // Check if this was the last question
                if (updated.length >= totalQuestions && !isCheckingFinishedRef.current) {
                  console.log('[DuelWaitingReplay] Opponent answered last question - checking if finished');
                  isCheckingFinishedRef.current = true;
                  
                  // Small delay to ensure answer is committed to database
                  setTimeout(async () => {
                    await checkIfOpponentFinished();
                    isCheckingFinishedRef.current = false;
                  }, 800);
                }
                return updated;
              });
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
          
          // Check if this is opponent's score update
          if (updatedPlayer.id !== myPlayerId) {
            console.log('[DuelWaitingReplay] Opponent score UPDATE:', updatedPlayer.score);
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
            
            // Use the same check function
            await checkIfOpponentFinished();
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
        <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-2 border-primary/20">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>
            
            <div>
              <h2 className="text-3xl font-black mb-2">Вы закончили первым!</h2>
              <p className="text-muted-foreground text-lg">
                Ждём {opponentName}...
              </p>
            </div>

            {/* Scores */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Вы</div>
                <div className="text-4xl font-black text-primary">{myScore}</div>
              </div>
              <div className="text-2xl font-bold text-muted-foreground/30">VS</div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">{opponentName}</div>
                <motion.div 
                  className="text-4xl font-black text-secondary"
                  key={opponentScore}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {opponentScore}
                </motion.div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Прогресс: {opponentAnswers.length}/{totalQuestions}
                </span>
                <span className="font-bold">{Math.round(progress)}%</span>
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

        {/* Live Progress Timeline */}
        <AnimatePresence>
          {!isHidden && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Live Replay</h3>
                </div>

                {/* Questions Timeline */}
                <div className="space-y-2">
                  {Array.from({ length: totalQuestions }).map((_, idx) => {
                    const questionNum = idx + 1;
                    const answer = opponentAnswers.find(a => a.question_number === questionNum);
                    const isAnswered = !!answer;
                    const isCurrent = opponentAnswers.length === idx;

                    return (
                      <motion.div
                        key={questionNum}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isAnswered 
                            ? answer.is_skipped
                              ? 'bg-muted/20 border border-muted/30'
                              : answer.is_correct 
                              ? 'bg-success/10 border border-success/20' 
                              : 'bg-destructive/10 border border-destructive/20'
                            : isCurrent
                            ? 'bg-primary/10 border border-primary/20 animate-pulse'
                            : 'bg-muted/30 border border-border/30'
                        }`}
                      >
                        {/* Question Number */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isAnswered 
                            ? answer.is_skipped
                              ? 'bg-muted text-muted-foreground'
                              : answer.is_correct 
                              ? 'bg-success text-success-foreground' 
                              : 'bg-destructive text-destructive-foreground'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {questionNum}
                        </div>

                        {/* Status Icon */}
                        <div className="flex-1">
                          {isAnswered ? (
                            <div className="flex items-center gap-2">
                              {answer.is_skipped ? (
                                <>
                                  <Clock className="w-5 h-5 text-muted-foreground" />
                                  <span className="font-medium text-muted-foreground">Пропущено</span>
                                </>
                              ) : answer.is_correct ? (
                                <>
                                  <CheckCircle2 className="w-5 h-5 text-success" />
                                  <span className="font-medium">Правильно</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 text-destructive" />
                                  <span className="font-medium">Неправильно</span>
                                </>
                              )}
                            </div>
                          ) : isCurrent ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="font-medium text-primary">Отвечает...</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Ожидание</span>
                          )}
                        </div>

                        {/* Time & Points */}
                        {isAnswered && !answer.is_skipped && (
                          <div className="flex items-center gap-3 text-sm">
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {(answer.time_taken_ms / 1000).toFixed(1)}s
                            </Badge>
                            {answer.points_awarded > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <Target className="w-3 h-3" />
                                +{answer.points_awarded}
                              </Badge>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
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
