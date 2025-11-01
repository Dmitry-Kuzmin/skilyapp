import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';

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

  useEffect(() => {
    if (results?.isWinner) {
      sounds.victory();
    } else if (results && !results.isDraw) {
      sounds.defeat();
    }
  }, [results]);

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
      {results.isWinner && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-card via-card to-card/50 border-2 shadow-2xl">
          <div>
            {results.isWinner && (
              <motion.div 
                className="mb-4"
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
              >
                <Trophy className="h-20 w-20 mx-auto text-yellow-500 drop-shadow-lg" />
              </motion.div>
            )}
            <motion.h2 
              className={`text-4xl font-bold mb-2 ${
                results.isWinner ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500' :
                results.isDraw ? 'text-blue-500' : 'text-muted-foreground'
              }`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {results.isWinner ? '🏆 Победа!' : results.isDraw ? '🤝 Ничья!' : '😔 Поражение'}
            </motion.h2>
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {results.isWinner 
                ? 'Отличная работа! Вы победили!'
                : results.isDraw
                ? 'Вы оба показали одинаковый результат'
                : 'В следующий раз повезёт больше!'}
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-xl border-2 border-primary/30 shadow-lg"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-5xl font-bold mb-2 text-primary">{results.myScore}</div>
              <div className="text-sm text-muted-foreground font-semibold">Ваш счёт</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">
                  {results.myCorrect} правильных
                </span>
              </div>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-br from-muted/50 to-muted/20 p-6 rounded-xl border-2 border-muted shadow-lg"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-5xl font-bold mb-2">{results.opponentScore}</div>
              <div className="text-sm text-muted-foreground font-semibold">{results.opponentName}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Target className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">
                  {results.opponentCorrect} правильных
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/20 rounded-xl p-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-lg">Награды получены</h3>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex items-center justify-center gap-6 text-base">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">XP: +{Math.round(results.myScore / 20) + (results.isWinner ? 25 : 10)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl">💰</span>
                <span className="font-semibold">+{Math.floor(results.myScore / 500)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="flex gap-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button onClick={onRematch} className="flex-1 h-12" size="lg">
              <RotateCcw className="mr-2 h-5 w-5" />
              Реванш
            </Button>
            <Button onClick={handleShare} variant="outline" size="lg" className="h-12">
              <Share2 className="h-5 w-5" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button onClick={onBackToMenu} variant="ghost" className="w-full h-12" size="lg">
              <Home className="mr-2 h-5 w-5" />
              В меню
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
