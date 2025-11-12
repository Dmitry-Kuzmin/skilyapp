import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

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
    if (results && profileId) {
      // Начисляем монеты после загрузки результатов
      const coinsEarned = results.isWinner ? 50 : results.isDraw ? 25 : 15;
      updateCoins(coinsEarned);
    }
  }, [results, profileId]);

  const updateCoins = async (amount: number) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', profileId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ coins: (profile.coins || 0) + amount })
          .eq('id', profileId);
      }
    } catch (error) {
      console.error('Ошибка начисления монет:', error);
    }
  };

  useEffect(() => {
    if (results?.isWinner) {
      sounds.victory();
      haptics.victory();
    } else if (results && !results.isDraw) {
      sounds.defeat();
      haptics.defeat();
    }
  }, [results]);

  const loadResults = async () => {
    try {
      // Load players and duel info
      const [playersResponse, duelResponse] = await Promise.all([
        supabase
          .from('duel_players')
          .select('*, profiles(first_name, username)')
          .eq('duel_id', duelId),
        supabase
          .from('duels')
          .select('bet_amount, bet_type, commission_taken, rematch_pot')
          .eq('id', duelId)
          .single()
      ]);

      const players = playersResponse.data;
      const duel = duelResponse.data;
      
      if (!players) return;

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);

      const isWinner = myPlayer && opponent && myPlayer.score > opponent.score;
      const isDraw = myPlayer && opponent && myPlayer.score === opponent.score;

      // Cast profiles to access nested properties
      const myProfile = myPlayer?.profiles as any;
      const opponentProfile = opponent?.profiles as any;
      
      // Calculate winnings if bet was placed
      let winnings = 0;
      let commission = 0;
      const betAmount = (duel as any)?.bet_amount || 0;
      
      if (betAmount > 0) {
        if (isWinner) {
          const totalPot = betAmount * 2;
          commission = Math.floor(totalPot * 0.1);
          winnings = totalPot - commission;
        }
      }
      
      setResults({
        myScore: myPlayer?.score || 0,
        myCorrect: myPlayer?.correct_count || 0,
        opponentScore: opponent?.score || 0,
        opponentCorrect: opponent?.correct_count || 0,
        opponentName: opponentProfile?.first_name || opponentProfile?.username || 'Соперник',
        myName: myProfile?.first_name || myProfile?.username || 'Вы',
        isWinner,
        isDraw,
        betAmount,
        winnings,
        commission,
        rematchPot: (duel as any)?.rematch_pot || 0,
      });
      
      console.log('[DuelResult] Loaded results:', {
        myScore: myPlayer?.score,
        opponentScore: opponent?.score,
        betAmount,
        winnings,
        isDraw
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
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 overflow-y-auto">
      <div className="min-h-screen w-full max-w-2xl mx-auto px-3 py-4 space-y-3 animate-fade-in">
        {results.isWinner && typeof window !== 'undefined' && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            gravity={0.3}
          />
        )}

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full"
        >
          <Card className="p-4 text-center space-y-3 bg-gradient-to-br from-card via-card to-card/50 border-2 shadow-2xl">
          <div>
            {results.isWinner && (
              <motion.div 
                className="mb-3 sm:mb-4"
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
              >
                <Trophy className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-yellow-500 drop-shadow-lg" />
              </motion.div>
            )}
            <motion.h2 
              className={`text-2xl font-bold mb-1 ${
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
              className="text-muted-foreground text-sm"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {results.isWinner 
                ? 'Отлично!'
                : results.isDraw
                ? 'Одинаковый результат'
                : 'В следующий раз получится!'}
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <motion.div 
              className="bg-gradient-to-br from-primary/20 to-primary/5 p-3 rounded-xl border-2 border-primary/30 shadow-lg"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-4xl font-black mb-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {results.myScore}
              </div>
              <div className="text-xs text-foreground font-bold mb-2">Ваш счёт</div>
              <div className="flex items-center justify-center gap-1 bg-success/10 rounded-lg px-2 py-1">
                <Target className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-semibold text-success">
                  {results.myCorrect}/10
                </span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {((results.myCorrect / 10) * 100).toFixed(0)}%
              </div>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-br from-muted/60 to-muted/30 p-3 rounded-xl border-2 border-muted/50 shadow-lg"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-4xl font-black mb-1 text-foreground/80">{results.opponentScore}</div>
              <div className="text-xs text-foreground/80 font-bold mb-2 truncate">{results.opponentName}</div>
              <div className="flex items-center justify-center gap-1 bg-orange-500/10 rounded-lg px-2 py-1">
                <Target className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {results.opponentCorrect}/10
                </span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {((results.opponentCorrect / 10) * 100).toFixed(0)}%
              </div>
            </motion.div>
          </div>
          
          {/* Betting results */}
          {results.betAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`p-4 sm:p-6 rounded-2xl border-2 ${
                results.isWinner 
                  ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/40'
                  : results.isDraw
                  ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/40'
                  : 'bg-gradient-to-br from-muted/20 to-muted/10 border-muted/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-lg">
                  {results.isWinner ? 'Выигрыш' : results.isDraw ? 'Реванш' : 'Ставка'}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ваша ставка:</span>
                  <span className="font-bold">-{results.betAmount}</span>
                </div>
                
                {results.isWinner && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Банк:</span>
                      <span className="font-bold">{results.betAmount * 2}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>Комиссия (10%):</span>
                      <span className="font-bold">-{results.commission}</span>
                    </div>
                    <div className="border-t border-amber-500/30 pt-2 mt-2"></div>
                    <div className="flex justify-between text-lg">
                      <span className="font-black text-green-600 dark:text-green-400">Выигрыш:</span>
                      <span className="font-black text-green-600 dark:text-green-400">+{results.winnings}</span>
                    </div>
                  </>
                )}
                
                {results.isDraw && results.rematchPot > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Банк реванша:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{results.rematchPot}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Ставки сохранены для реванша. Победитель заберёт всё!
                    </p>
                  </>
                )}
                
                {!results.isWinner && !results.isDraw && (
                  <div className="flex justify-between text-red-500">
                    <span>Проигрыш:</span>
                    <span className="font-bold">-{results.betAmount}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div 
            className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-3 shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-1 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <h3 className="font-black text-sm bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                Награды
              </h3>
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-center gap-1 bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                  +{Math.round(results.myScore / 20) + (results.isWinner ? 25 : 10)} XP
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                <span className="text-lg">💰</span>
                <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">
                  +{results.isWinner ? 50 : results.isDraw ? 25 : 15}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Achievement Progress - компактная версия */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs">Прогресс до Мастера</div>
                  <div className="text-[10px] text-muted-foreground">
                    Ещё {10 - (results.myCorrect || 0)} побед
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-purple-500 flex-shrink-0" />
              </div>
              <Progress value={(results.myCorrect || 0) * 10} className="h-2 bg-purple-500/20" />
            </Card>
          </motion.div>

          {/* Detailed Statistics - компактная версия */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Accordion type="single" collapsible className="bg-card/50 rounded-xl border-2">
              <AccordionItem value="stats" className="border-none">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>📊</span>
                    <span>Подробная статистика</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Правильных:</span>
                      <span className="font-bold text-success">{results.myCorrect}/10</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Точность:</span>
                      <span className="font-bold text-primary">
                        {((results.myCorrect / 10) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Очков:</span>
                      <span className="font-bold">{results.myScore}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-muted-foreground text-xs">Разница:</span>
                      <span className={`font-bold ${results.myScore > results.opponentScore ? 'text-success' : 'text-destructive'}`}>
                        {results.myScore > results.opponentScore ? '+' : ''}{results.myScore - results.opponentScore}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          <motion.div 
            className="flex flex-col gap-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  haptics.buttonClick();
                  onRematch();
                }} 
                className="flex-1 h-11 text-sm font-bold" 
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Реванш
              </Button>
              <Button 
                onClick={() => {
                  haptics.buttonClick();
                  handleShare();
                }} 
                variant="outline" 
                size="lg" 
                className="h-11 px-4"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              onClick={() => {
                haptics.buttonClick();
                onBackToMenu();
              }} 
              variant="ghost" 
              className="w-full h-10 text-sm" 
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              В меню
            </Button>
          </motion.div>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}
