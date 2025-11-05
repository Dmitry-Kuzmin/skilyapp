import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp } from 'lucide-react';
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
      const { data: players } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
        .eq('duel_id', duelId);

      if (!players) return;

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);

      const isWinner = myPlayer && opponent && myPlayer.score > opponent.score;
      const isDraw = myPlayer && opponent && myPlayer.score === opponent.score;

      // Cast profiles to access nested properties
      const myProfile = myPlayer?.profiles as any;
      const opponentProfile = opponent?.profiles as any;
      
      setResults({
        myScore: myPlayer?.score || 0,
        myCorrect: myPlayer?.correct_count || 0,
        opponentScore: opponent?.score || 0,
        opponentCorrect: opponent?.correct_count || 0,
        opponentName: opponentProfile?.first_name || opponentProfile?.username || 'Соперник',
        myName: myProfile?.first_name || myProfile?.username || 'Вы',
        isWinner,
        isDraw,
      });
      
      console.log('[DuelResult] Loaded results:', {
        myScore: myPlayer?.score,
        opponentScore: opponent?.score,
        myCorrect: myPlayer?.correct_count,
        opponentCorrect: opponent?.correct_count,
        myName: myProfile?.first_name || myProfile?.username,
        opponentName: opponentProfile?.first_name || opponentProfile?.username
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
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
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
        className="w-full"
      >
        <Card className="p-4 sm:p-6 md:p-8 text-center space-y-4 sm:space-y-6 bg-gradient-to-br from-card via-card to-card/50 border-2 shadow-2xl">
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
              className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 ${
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
              className="text-muted-foreground text-sm sm:text-base md:text-lg px-2"
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

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <motion.div 
              className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border-2 border-primary/30 shadow-lg backdrop-blur-sm"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 sm:mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {results.myScore}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-foreground font-bold mb-2 sm:mb-3">Ваш счёт</div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-success/10 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-success" />
                <span className="text-xs sm:text-sm font-semibold text-success">
                  {results.myCorrect}/10
                </span>
              </div>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                Точность: {((results.myCorrect / 10) * 100).toFixed(0)}%
              </div>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-br from-muted/60 to-muted/30 p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border-2 border-muted/50 shadow-lg backdrop-blur-sm"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 sm:mb-3 text-foreground/80">{results.opponentScore}</div>
              <div className="text-xs sm:text-sm md:text-base text-foreground/80 font-bold mb-2 sm:mb-3 truncate">{results.opponentName}</div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-orange-500/10 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-orange-500" />
                <span className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {results.opponentCorrect}/10
                </span>
              </div>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                Точность: {((results.opponentCorrect / 10) * 100).toFixed(0)}%
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-yellow-500/30 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-lg backdrop-blur-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" />
              <h3 className="font-black text-base sm:text-lg md:text-xl bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                Награды получены
              </h3>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-blue-500/10 rounded-lg p-2 sm:p-3 border border-blue-500/20">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500 flex-shrink-0" />
                <span className="font-bold text-sm sm:text-base md:text-lg text-blue-600 dark:text-blue-400 text-center">
                  +{Math.round(results.myScore / 20) + (results.isWinner ? 25 : 10)} XP
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-yellow-500/10 rounded-lg p-2 sm:p-3 border border-yellow-500/20">
                <span className="text-xl sm:text-2xl">💰</span>
                <span className="font-bold text-xs sm:text-sm md:text-base lg:text-lg text-yellow-600 dark:text-yellow-400 text-center">
                  +{results.isWinner ? 50 : results.isDraw ? 25 : 15} монет
                </span>
              </div>
            </div>
          </motion.div>

          {/* Achievement Progress */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-3 sm:p-4 md:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm sm:text-base">Прогресс до Мастера</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Ещё {10 - (results.myCorrect || 0)} побед до нового ранга
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
              </div>
              <Progress value={(results.myCorrect || 0) * 10} className="h-2 sm:h-3 bg-purple-500/20" />
            </Card>
          </motion.div>

          {/* Detailed Statistics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Accordion type="single" collapsible className="bg-card/50 backdrop-blur-sm rounded-xl border-2">
              <AccordionItem value="stats" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <span>📊</span>
                    <span>Подробная статистика</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Правильных ответов:</span>
                      <span className="font-bold text-lg text-success">{results.myCorrect}/10</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Точность:</span>
                      <span className="font-bold text-lg text-primary">
                        {((results.myCorrect / 10) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Набрано очков:</span>
                      <span className="font-bold text-lg">{results.myScore}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Разница:</span>
                      <span className={`font-bold text-lg ${results.myScore > results.opponentScore ? 'text-success' : 'text-destructive'}`}>
                        {results.myScore > results.opponentScore ? '+' : ''}{results.myScore - results.opponentScore}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-2 sm:gap-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <Button 
              onClick={() => {
                haptics.buttonClick();
                onRematch();
              }} 
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold" 
              size="lg"
            >
              <RotateCcw className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              Реванш
            </Button>
            <Button 
              onClick={() => {
                haptics.buttonClick();
                handleShare();
              }} 
              variant="outline" 
              size="lg" 
              className="h-12 sm:h-14 px-4 sm:px-6"
            >
              <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            <Button 
              onClick={() => {
                haptics.buttonClick();
                onBackToMenu();
              }} 
              variant="ghost" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base" 
              size="lg"
            >
              <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              В меню
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
