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

interface OpponentAnswer {
  question_number: number;
  is_correct: boolean;
  time_taken_ms: number;
  points_awarded: number;
}

interface DuelWaitingReplayProps {
  duelId: string;
  myScore: number;
  totalQuestions: number;
  onDuelFinished: () => void;
}

export function DuelWaitingReplay({ 
  duelId, 
  myScore, 
  totalQuestions,
  onDuelFinished 
}: DuelWaitingReplayProps) {
  const { profileId } = useUserContext();
  const [opponentAnswers, setOpponentAnswers] = useState<OpponentAnswer[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentName, setOpponentName] = useState('Соперник');
  const [isHidden, setIsHidden] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const isHiddenRef = useRef(isHidden);

  useEffect(() => {
    loadOpponentData();
    checkDuelStatus();
  }, [duelId]);

  useEffect(() => {
    isHiddenRef.current = isHidden;
  }, [isHidden]);

  useEffect(() => {
    if (!duelId || !myPlayerId) return;

    const unsubscribe = subscribeToOpponentProgress(myPlayerId);
    return () => {
      unsubscribe?.();
    };
  }, [duelId, myPlayerId]);

  // Check if duel is already finished
  const checkDuelStatus = async () => {
    const { data } = await supabase
      .from('duels')
      .select('status')
      .eq('id', duelId)
      .single();

    if (data?.status === 'finished') {
      sounds.victory();
      toast.success('🏁 Дуэль завершена!', {
        description: 'Смотрите результаты',
        duration: 5000,
      });
      onDuelFinished();
    }
  };

  const loadOpponentData = async () => {
    try {
      // Get opponent info
      const { data: players } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name)')
        .eq('duel_id', duelId);

      let myPlayerIdLocal: string | null = null;

      if (players) {
        const myPlayer = players.find(p => p.user_id === profileId);
        const opponent = players.find(p => p.user_id !== profileId);

        myPlayerIdLocal = myPlayer?.id || null;
        setMyPlayerId(myPlayerIdLocal);

        if (opponent) {
          setOpponentName(opponent.profiles?.first_name || 'Соперник');
          setOpponentScore(opponent.score || 0);
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
        .order('created_at', { ascending: true });

      if (answers) {
        const formattedAnswers = answers
          .filter((ans: any) => !myPlayerIdLocal || ans.player_id !== myPlayerIdLocal)
          .map((ans: any) => ({
            question_number: ans.duel_questions.position,
            is_correct: ans.is_correct,
            time_taken_ms: ans.time_taken_ms,
            points_awarded: ans.points_awarded || 0,
          }));
        setOpponentAnswers(formattedAnswers);
      }
    } catch (error) {
      console.error('Error loading opponent data:', error);
    }
  };

  const subscribeToOpponentProgress = (myPlayerIdValue: string) => {
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

          if (!answer || answer.player_id === myPlayerIdValue) {
            return;
          }

          console.log('[DuelWaitingReplay] Opponent answered!', answer);

          const { data: question, error } = await supabase
            .from('duel_questions')
            .select('position')
            .eq('id', answer.duel_question_id)
            .single();

          if (error) {
            console.error('[DuelWaitingReplay] Failed to load question position:', error);
            return;
          }

          if (question) {
            const newAnswer: OpponentAnswer = {
              question_number: question.position,
              is_correct: answer.is_correct,
              time_taken_ms: answer.time_taken_ms,
              points_awarded: answer.points_awarded || 0,
            };

            setOpponentAnswers(prev => {
              const alreadyExists = prev.some(item => item.question_number === newAnswer.question_number);
              if (alreadyExists) {
                return prev.map(item => item.question_number === newAnswer.question_number ? newAnswer : item);
              }
              return [...prev, newAnswer];
            });

            if (!isHiddenRef.current) {
              sounds.notificationPop();
              if (answer.is_correct) {
                toast.info(`✅ Соперник: Вопрос ${question.position} - Правильно!`, {
                  duration: 2000,
                });
              } else {
                toast.info(`❌ Соперник: Вопрос ${question.position} - Ошибка`, {
                  duration: 2000,
                });
              }
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
        (payload) => {
          const updatedPlayer = payload.new as any;
          if (!updatedPlayer || updatedPlayer.id === myPlayerIdValue) {
            return;
          }

          setOpponentScore(updatedPlayer.score || 0);
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
        (payload) => {
          const duel = payload.new as any;
          if (duel.status === 'finished') {
            console.log('[DuelWaitingReplay] Duel finished!');
            sounds.victory();

            toast.success('🏁 Дуэль завершена!', {
              description: 'Соперник закончил! Смотрите результаты',
              duration: 5000,
            });

            onDuelFinished();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const progress = (opponentAnswers.length / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
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
                            ? answer.is_correct 
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
                            ? answer.is_correct ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
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
                              {answer.is_correct ? (
                                <CheckCircle2 className="w-5 h-5 text-success" />
                              ) : (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                              <span className="font-medium">
                                {answer.is_correct ? 'Правильно' : 'Неправильно'}
                              </span>
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
                        {isAnswered && (
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
    </div>
  );
}
