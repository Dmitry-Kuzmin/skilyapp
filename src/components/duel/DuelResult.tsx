import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

interface DuelResultProps {
  duelId: string;
  onRematch: () => void;
  onBackToMenu: () => void;
}

export function DuelResult({ duelId, onRematch, onBackToMenu }: DuelResultProps) {
  const { profileId } = useUserContext();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [duelId]);

  const loadResults = async () => {
    try {
      const { data: players } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
        .eq('duel_id', duelId);

      if (!players) return;

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);

      const isWinner = myPlayer && opponent && myPlayer.score > opponent.score;
      const isDraw = myPlayer && opponent && myPlayer.score === opponent.score;

      setResults({
        myScore: myPlayer?.score || 0,
        myCorrect: myPlayer?.correct_count || 0,
        opponentScore: opponent?.score || 0,
        opponentCorrect: opponent?.correct_count || 0,
        opponentName: opponent?.profiles?.first_name || 'Соперник',
        isWinner,
        isDraw,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (window.Telegram?.WebApp) {
      const text = results.isWinner 
        ? `Победил в дуэли со счётом ${results.myScore}:${results.opponentScore}! 🏆`
        : `Сыграл дуэль со счётом ${results.myScore}:${results.opponentScore}`;
      
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    }
  };

  if (loading || !results) {
    return <div className="text-center p-8">Загрузка результатов...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="p-8 text-center space-y-6">
        <div>
          {results.isWinner && (
            <div className="mb-4">
              <Trophy className="h-16 w-16 mx-auto text-yellow-500 animate-pulse" />
            </div>
          )}
          <h2 className="text-3xl font-bold mb-2">
            {results.isWinner ? 'Победа!' : results.isDraw ? 'Ничья!' : 'Поражение'}
          </h2>
          <p className="text-muted-foreground">
            {results.isWinner 
              ? 'Отличная работа! Вы победили!'
              : results.isDraw
              ? 'Вы оба показали одинаковый результат'
              : 'В следующий раз повезёт больше!'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 p-6 rounded-lg">
            <div className="text-4xl font-bold mb-2">{results.myScore}</div>
            <div className="text-sm text-muted-foreground">Ваш счёт</div>
            <div className="text-xs text-muted-foreground mt-2">
              {results.myCorrect} правильных
            </div>
          </div>

          <div className="bg-muted p-6 rounded-lg">
            <div className="text-4xl font-bold mb-2">{results.opponentScore}</div>
            <div className="text-sm text-muted-foreground">{results.opponentName}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {results.opponentCorrect} правильных
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Награды получены:</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>🎯 XP: +{Math.round(results.myScore / 20) + (results.isWinner ? 25 : 10)}</div>
            <div>💰 Монеты: +{Math.floor(results.myScore / 500)}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onRematch} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Реванш
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={onBackToMenu} variant="ghost" className="w-full">
          <Home className="mr-2 h-4 w-4" />
          В меню
        </Button>
      </Card>
    </div>
  );
}
