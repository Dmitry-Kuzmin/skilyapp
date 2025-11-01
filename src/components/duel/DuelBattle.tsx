import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { Clock, Zap, Award } from 'lucide-react';

interface DuelBattleProps {
  duelId: string;
  onDuelFinished: () => void;
}

export function DuelBattle({ duelId, onDuelFinished }: DuelBattleProps) {
  const { profileId } = useUserContext();
  const { state } = useDuelRealtime(duelId);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12000);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadScores();
  }, [duelId]);

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
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [answered, currentIndex]);

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from('duel_questions')
      .select('*')
      .eq('duel_id', duelId)
      .order('position');

    if (!error && data) {
      setQuestions(data);
    }
  };

  const loadScores = async () => {
    const { data } = await supabase
      .from('duel_players')
      .select('*')
      .eq('duel_id', duelId);

    if (data) {
      const myPlayer = data.find(p => p.user_id === profileId);
      const opponent = data.find(p => p.user_id !== profileId);
      setMyScore(myPlayer?.score || 0);
      setOpponentScore(opponent?.score || 0);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (answered) return;

    setAnswered(true);
    setSelectedOption(optionId);

    const timeTaken = 12000 - timeLeft;

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          duel_question_id: questions[currentIndex].id,
          selected_option_id: optionId,
          time_taken_ms: timeTaken,
          latency_ms: 0,
        },
      });

      if (error) throw error;

      setIsCorrect(data.is_correct);
      setMyScore(prev => prev + data.points);
      setCombo(data.combo);

      toast.success(data.is_correct ? `+${data.points} очков! 🔥` : 'Неверно');

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(12000);
          setAnswered(false);
          setSelectedOption(null);
        } else {
          finishDuel();
        }
      }, 2000);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleTimeout = () => {
    if (answered) return;
    handleAnswer('');
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
      console.error(error);
    }
  };

  if (questions.length === 0) {
    return <div className="text-center p-8">Загрузка...</div>;
  }

  const currentQuestion = questions[currentIndex];
  const snapshot = currentQuestion.question_snapshot as any;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timeProgress = (timeLeft / 12000) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{myScore}</div>
            <div className="text-xs text-muted-foreground">Вы</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold">Вопрос {currentIndex + 1}/{questions.length}</div>
          <Progress value={progress} className="w-32 h-2" />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{opponentScore}</div>
            <div className="text-xs text-muted-foreground">Соперник</div>
          </div>
        </div>
      </div>

      {/* Timer */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{(timeLeft / 1000).toFixed(1)}s</span>
          </div>
          {combo > 0 && (
            <div className="flex items-center gap-2 text-orange-500">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-bold">x{combo} комбо!</span>
            </div>
          )}
        </div>
        <Progress value={timeProgress} className="h-2" />
      </Card>

      {/* Question */}
      <Card className="p-6 space-y-4">
        {snapshot.image_url && (
          <img 
            src={snapshot.image_url} 
            alt="Question" 
            className="w-full h-48 object-contain rounded-lg"
          />
        )}

        <h3 className="text-xl font-semibold">{snapshot.question_ru}</h3>

        <div className="grid gap-3">
          {snapshot.options?.map((option: any) => {
            const isSelected = selectedOption === option.id;
            const showCorrect = answered && option.is_correct;
            const showWrong = answered && isSelected && !option.is_correct;

            return (
              <Button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                disabled={answered}
                variant={showCorrect ? 'default' : showWrong ? 'destructive' : 'outline'}
                className={`h-auto py-4 px-6 text-left justify-start whitespace-normal ${
                  showCorrect ? 'bg-green-500 hover:bg-green-600' : ''
                }`}
              >
                {option.text_ru}
              </Button>
            );
          })}
        </div>

        {answered && (
          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <p className={`font-semibold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '✓ Правильно!' : '✗ Неверно'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
