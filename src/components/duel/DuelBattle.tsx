import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { Clock, Zap, Award, Lightbulb } from 'lucide-react';
import { BoostButton } from './BoostButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DuelBattleProps {
  duelId: string;
  onDuelFinished: () => void;
}

export function DuelBattle({ duelId, onDuelFinished }: DuelBattleProps) {
  const { profileId } = useUserContext();
  const { state } = useDuelRealtime(duelId);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [boosts, setBoosts] = useState({ fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0 });
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [hintText, setHintText] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadScores();
    loadBoosts();
  }, [duelId]);

  useEffect(() => {
    // Reset boosts state for new question
    setHiddenOptions([]);
    setUsedBoosts([]);
    setHintText('');
    setShowHint(false);
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

      if (error) {
        console.error('Error loading questions:', error);
        toast.error('Не удалось загрузить вопросы');
        return;
      }

      if (data && data.length > 0) {
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error in loadQuestions:', error);
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

  const handleUseBoost = async (boostType: string) => {
    if (usedBoosts.includes(boostType) || answered) {
      toast.error('Буст уже использован');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          duel_question_id: questions[currentIndex].id,
          boost_type: boostType,
        },
      });

      if (error) throw error;

      setUsedBoosts(prev => [...prev, boostType]);
      setBoosts(prev => ({ ...prev, [boostType]: Math.max(0, prev[boostType as keyof typeof prev] - 1) }));

      if (boostType === 'fifty_fifty' && data.hide_options) {
        setHiddenOptions(data.hide_options);
        toast.success('Убраны 2 неправильных ответа');
      } else if (boostType === 'time_extend') {
        setTimeLeft(prev => Math.min(60000, prev + 30000));
        toast.success('+30 секунд!');
      } else if (boostType === 'hint' && data.hint) {
        setHintText(data.hint);
        setShowHint(true);
        toast.success('Подсказка показана');
      } else if (boostType === 'skip') {
        toast.success('Вопрос пропущен');
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setTimeLeft(60000);
            setAnswered(false);
            setSelectedOption(null);
          } else {
            finishDuel();
          }
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка использования буста');
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (answered) return;

    setAnswered(true);
    setSelectedOption(optionId);

    const timeTaken = 60000 - timeLeft;

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
          setTimeLeft(60000);
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

  const handleTimeout = async () => {
    if (answered) return;
    
    setAnswered(true);
    const timeTaken = 60000 - timeLeft;

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          duel_question_id: questions[currentIndex].id,
          selected_option_id: null,
          time_taken_ms: timeTaken,
          is_timeout: true,
        },
      });

      if (error) throw error;

      setIsCorrect(false);
      toast.error('Время вышло!');

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(60000);
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
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timeProgress = (timeLeft / 60000) * 100;

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

      {/* Boosts Panel */}
      {!answered && (
        <Card className="p-4">
          <div className="flex items-center justify-center gap-3">
            <BoostButton
              type="fifty_fifty"
              icon="⚡"
              name="50/50 - Убрать 2 ответа"
              available={boosts.fifty_fifty}
              onUse={handleUseBoost}
              disabled={usedBoosts.includes('fifty_fifty')}
            />
            <BoostButton
              type="time_extend"
              icon="⏱️"
              name="+30 секунд"
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
              name="Пропустить"
              available={boosts.skip}
              onUse={handleUseBoost}
              disabled={usedBoosts.includes('skip')}
            />
          </div>
        </Card>
      )}

      {/* Question */}
      <Card className="p-6 space-y-4">
        {snapshot.image_url && (
          <img 
            src={snapshot.image_url} 
            alt="Question" 
            className="w-full h-48 object-contain rounded-lg"
          />
        )}

        <h3 className="text-xl font-semibold">{snapshot.question_es}</h3>

        <div className="grid gap-3">
          {snapshot.options && Array.isArray(snapshot.options) && snapshot.options.map((option: any) => {
            if (!option || !option.id) return null;
            
            const isHidden = hiddenOptions.includes(option.id);
            if (isHidden) return null;
            
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
                {option.text_es}
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

      {/* Hint Dialog */}
      <Dialog open={showHint} onOpenChange={setShowHint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Подсказка
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{hintText}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
