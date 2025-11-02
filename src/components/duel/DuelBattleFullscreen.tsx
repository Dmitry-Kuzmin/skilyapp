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
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>>([]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
    loadScores();
    loadBoosts();
  }, [duelId]);

  // Update scores from realtime and show notification
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      loadScores();
      
      // Show toast notification
      const isCorrect = state.opponentAnswerData.is_correct;
      const notification = {
        id: `notif-${Date.now()}`,
        title: isCorrect ? '💡 Соперник ответил!' : '❌ Соперник ошибся!',
        message: isCorrect 
          ? 'Правильный ответ! Продолжайте бороться!' 
          : 'Ваш шанс догнать!',
        icon: isCorrect ? '⚡' : '🎯'
      };
      
      setToastNotifications(prev => [...prev, notification]);
      sounds.notificationPop();
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
    }
  }, [state.opponentAnswered, state.opponentAnswerData]);

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
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'get_questions', duel_id: duelId, profile_id: profileId },
      });

      if (error) throw error;
      if (data?.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
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
    const { data } = await supabase
      .from('boost_inventory')
      .select('*, boost_definitions(*)')
      .eq('user_id', profileId)
      .gt('quantity', 0);

    if (data) setBoosts(data);
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
    } else {
      sounds.wrongAnswer();
      haptics.wrongAnswer();
    }

    try {
      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: question.id,
          selected_option_id: optionId,
          time_taken_ms: 60000 - timeLeft,
        },
      });

      await loadScores();

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
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
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 z-50 overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toastNotifications.map((notif) => (
            <NotificationToast
              key={notif.id}
              {...notif}
              onClose={() => setToastNotifications(prev => prev.filter(n => n.id !== notif.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Exit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="absolute top-4 left-4 z-10 rounded-full w-10 h-10"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-secondary to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="h-full flex flex-col p-4 pt-16 max-w-4xl mx-auto">
        {/* Header - Scores & Timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-primary">{myScore}</div>
              <div className="text-xs text-muted-foreground">Вы</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-black text-secondary">{opponentScore}</div>
              <div className="text-xs text-muted-foreground">Соперник</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {combo > 1 && (
              <Badge className="gradient-fire border-none animate-pulse">
                <Flame className="w-3 h-3 mr-1" />
                x{combo}
              </Badge>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">
                {Math.ceil(timeLeft / 1000)}s
              </span>
            </div>
          </div>
        </div>

        {/* Question Number */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Вопрос {currentIndex + 1} из {questions.length}
          </p>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-card border-2 border-border rounded-3xl p-6 md:p-8 shadow-xl flex-1 flex flex-col">
            {/* Question Image */}
            {currentQuestion.question_snapshot?.image_url && (
              <div className="mb-6 rounded-2xl overflow-hidden bg-muted">
                <img
                  src={currentQuestion.question_snapshot.image_url}
                  alt="Question"
                  className="w-full h-48 object-contain"
                />
              </div>
            )}

            {/* Question Text */}
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-6 md:mb-8 leading-relaxed break-words hyphens-auto">
              {currentQuestion.question_snapshot.question_ru}
            </h2>

            {/* Answer Options */}
            <div className="grid gap-3 md:gap-4">
              {currentQuestion.question_snapshot.answer_options
                .sort((a: any, b: any) => a.position - b.position)
                .map((option: any) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = currentQuestion.correct_option_ids.includes(option.id);
                  const showResult = isAnswered;

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      className={`p-4 md:p-5 rounded-2xl border-2 text-left transition-all text-base md:text-lg font-medium leading-relaxed break-words hyphens-auto ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300'
                            : isSelected
                            ? 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300'
                            : 'bg-muted/50 border-border/50 opacity-50'
                          : isSelected
                          ? 'bg-primary/20 border-primary'
                          : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {option.text_ru}
                    </motion.button>
                  );
                })}
            </div>
          </div>

          {/* Boosts - будут добавлены позже */}
          {boosts.length > 0 && (
            <div className="flex gap-2 justify-center mt-4">
              <p className="text-sm text-muted-foreground">Бусты: {boosts.length}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
