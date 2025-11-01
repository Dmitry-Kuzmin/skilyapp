import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';

interface DuelLobbyProps {
  duelId: string | null;
  duelCode: string | null;
  onDuelCreated: (id: string, code: string) => void;
  onDuelStarted: () => void;
  onCancel: () => void;
}

export function DuelLobby({ duelId, duelCode, onDuelCreated, onDuelStarted, onCancel }: DuelLobbyProps) {
  const { profileId } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('mix');
  const [waitTime, setWaitTime] = useState(0);
  const { state } = useDuelRealtime(duelId);

  useEffect(() => {
    if (!duelId) return;

    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [duelId]);

  useEffect(() => {
    if (state.opponentJoined && duelId) {
      // Start countdown
      setTimeout(() => {
        handleStartDuel();
      }, 5000);
    }
  }, [state.opponentJoined, duelId]);

  const handleCreateDuel = async () => {
    if (!profileId) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'create_duel',
          num_questions: numQuestions,
          categories: null,
          difficulty,
        },
      });

      if (error) throw error;

      toast.success('Дуэль создана!');
      onDuelCreated(data.duel.id, data.code);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания дуэли');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartDuel = async () => {
    if (!duelId) return;

    try {
      const { error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'start_duel',
          duel_id: duelId,
        },
      });

      if (error) throw error;

      toast.success('Дуэль началась!');
      onDuelStarted();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка старта дуэли');
    }
  };

  const handleCopyCode = () => {
    if (duelCode) {
      navigator.clipboard.writeText(duelCode);
      toast.success('Код скопирован!');
    }
  };

  const handleShare = () => {
    if (duelCode && window.Telegram?.WebApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(`Присоединяйся к дуэли! Код: ${duelCode}`)}`;
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    }
  };

  if (duelCode) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card className="p-8 text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ожидание соперника</h2>
            <p className="text-muted-foreground">Поделитесь кодом с другом</p>
          </div>

          <div className="bg-primary/10 p-8 rounded-lg">
            <div className="text-4xl font-bold tracking-wider mb-2">{duelCode}</div>
            <div className="text-sm text-muted-foreground">Код дуэли</div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button onClick={handleCopyCode} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </Button>
            <Button onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Поделиться
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{state.opponentJoined ? '2/2' : '1/2'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>

          {state.opponentJoined && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-500 font-semibold">Соперник присоединился!</p>
              <p className="text-sm text-muted-foreground">Старт через 5 секунд...</p>
            </div>
          )}

          <Button variant="ghost" onClick={onCancel} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Отменить
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Создать дуэль</h2>
          <p className="text-muted-foreground">Настройте параметры игры</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Количество вопросов</Label>
            <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 вопросов (быстрая)</SelectItem>
                <SelectItem value="10">10 вопросов</SelectItem>
                <SelectItem value="15">15 вопросов</SelectItem>
                <SelectItem value="20">20 вопросов</SelectItem>
                <SelectItem value="30">30 вопросов (марафон)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Сложность</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mix">Микс (все уровни)</SelectItem>
                <SelectItem value="easy">Легкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="hard">Сложный</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleCreateDuel} disabled={isCreating} className="flex-1">
            Создать дуэль
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </Card>
    </div>
  );
}
