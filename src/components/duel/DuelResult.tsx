import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins, CheckCircle2, XCircle, Shield, Star, Gift, Flame, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { AIWidget } from '@/components/AIWidget';
import { toast } from 'sonner';

interface DuelResultProps {
  duelId: string;
  onRematch: () => void;
  onBackToMenu: () => void;
}

export function DuelResult({ duelId, onRematch, onBackToMenu }: DuelResultProps) {
  const { profileId } = useUserContext();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myAnswers, setMyAnswers] = useState<any[]>([]);
  const [showAIWidget, setShowAIWidget] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [rewards, setRewards] = useState<{ sp: number; xp: number; bonusCoins: number; insuranceRefund?: number } | null>(null);

  useEffect(() => {
    loadResults();
  }, [duelId]);

  useEffect(() => {
    if (results && profileId) {
      const spSource = results.isDraw ? 'duel_draw' : (results.isWinner ? 'duel_win' : 'duel_lose');
      const metadata = {
        duel_id: duelId,
        is_winner: results.isWinner,
        is_draw: results.isDraw,
        bet_amount: results.betAmount || 0,
        has_bet: (results.betAmount || 0) > 0
      };
      
      // Apply rewards (SP and XP)
      const applyRewards = async () => {
        try {
          const { data: spData } = await supabase.functions.invoke('season-sp', {
            body: { 
              user_id: profileId, 
              source_type: spSource,
              metadata
            },
          });
          
          const { data: xpData } = await supabase.functions.invoke('duel-pass-xp', {
            body: { user_id: profileId, source_type: spSource, metadata },
          });
          
          // Update rewards with actual values
          if (spData && xpData) {
            setRewards(prev => prev ? {
              ...prev,
              sp: spData.sp_added || prev.sp,
              xp: xpData.xp_added || prev.xp
            } : null);
          }
          
          // Track challenges
          await supabase.functions.invoke('season-challenges-track', {
            body: {
              user_id: profileId,
              source_type: spSource,
              metadata
            },
          });
          
          // Check for level up
          if (xpData?.level_up) {
            const { data: suggestion } = await supabase.functions.invoke('assistant-suggest', {
              body: { trigger: 'duel_pass_level_up' },
            });
            const message = suggestion?.suggestion?.message;
            if (message) {
              toast.info(message);
            }
          }
        } catch (err) {
          console.error('[DuelResult] Error applying rewards:', err);
        }
      };
      
      applyRewards();
    }
  }, [results, profileId, duelId]);

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
    const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
    console.log('[DuelResult] 🔄 Loading results:', { duelId, profileId, isTelegram });
    
    try {
      // Load players, duel info, answers, and bet data
      const [playersResponse, duelResponse, answersResponse, betResponse, betHistoryResponse] = await Promise.all([
        supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
          .eq('duel_id', duelId),
        supabase
          .from('duels')
          .select('bet_amount, bet_type, commission_taken, rematch_pot')
          .eq('id', duelId)
          .single(),
        supabase
          .from('duel_answers')
          .select('*, duel_questions(question_snapshot)')
          .eq('duel_id', duelId)
          .order('created_at', { ascending: true }),
        supabase
          .from('duel_bets')
          .select('*')
          .eq('duel_id', duelId)
          .maybeSingle(),
        supabase
          .from('duel_bet_history')
          .select('*')
          .eq('duel_id', duelId)
          .maybeSingle()
      ]);

      if (duelResponse.error) {
        console.error('[DuelResult] ❌ Error loading duel data:', {
          error: duelResponse.error,
          code: duelResponse.error.code,
          message: duelResponse.error.message,
          details: duelResponse.error.details,
          hint: duelResponse.error.hint,
          duelId,
          profileId,
          isTelegram
        });
      }

      const players = playersResponse.data;
      const duel = duelResponse.data;
      const allAnswers = answersResponse.data;
      const bet = betResponse.data;
      const betHistory = betHistoryResponse.data;

      console.log('[DuelResult] ✅ Data loaded:', {
        hasPlayers: !!players,
        hasDuel: !!duel,
        betAmount: (duel as any)?.bet_amount || 0,
        hasBet: !!bet,
        hasBetHistory: !!betHistory,
        isTelegram
      });

      if (!players) {
        console.warn('[DuelResult] ⚠️ No players data');
        return;
      }

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);
      
      // Фильтруем мои ответы
      const myPlayerAnswers = allAnswers?.filter((a: any) => a.player_id === myPlayer?.id) || [];
      setMyAnswers(myPlayerAnswers);

      const isWinner = myPlayer && opponent && myPlayer.score > opponent.score;
      const isDraw = myPlayer && opponent && myPlayer.score === opponent.score;

      // Cast profiles to access nested properties
      const myProfile = myPlayer?.profiles as any;
      const opponentProfile = opponent?.profiles as any;
      
      // Calculate winnings if bet was placed
      let winnings = 0;
      let insuranceRefund = 0;
      const betAmount = (duel as any)?.bet_amount || 0;
      
      // Check if user had insurance
      const isHost = myPlayer?.is_host;
      const hadInsurance = isHost 
        ? bet?.host_insurance_enabled 
        : bet?.opponent_insurance_enabled;
      
      if (betAmount > 0) {
        if (isWinner) {
          const totalPot = betAmount * 2;
          winnings = totalPot;
        } else if (!isWinner && !isDraw && hadInsurance) {
          // Insurance refund for loser
          const coverageRate = isHost 
            ? bet?.host_coverage_rate || 0.6
            : bet?.opponent_coverage_rate || 0.6;
          insuranceRefund = Math.ceil(betAmount * coverageRate);
        } else if (isDraw && hadInsurance) {
          // Full refund for draw with insurance
          const premium = isHost 
            ? bet?.host_insurance_premium || 0
            : bet?.opponent_insurance_premium || 0;
          insuranceRefund = betAmount + premium;
        }
      }
      
      // Calculate expected rewards (will be applied in useEffect)
      let expectedSP = 0;
      let expectedXP = 0;
      let bonusCoins = 0;
      
      // Calculate expected SP based on new system
      if (isWinner) {
        expectedXP = betAmount > 0 ? 40 : 30;
        if (betAmount > 0) {
          const riskMultiplier = betAmount >= 600 ? 4 : betAmount >= 300 ? 2.25 : betAmount >= 100 ? 1.25 : 1;
          expectedSP = Math.round(20 * riskMultiplier);
        } else {
          expectedSP = 0; // No SP without bet
        }
      } else if (isDraw) {
        expectedXP = 25;
        expectedSP = betAmount > 0 ? 15 : 0;
      } else {
        expectedXP = 15;
        expectedSP = (betAmount >= 100) ? 5 : 0;
      }
      
      // Check for bonus coins from bet history
      if (betHistory && isWinner) {
        // Bonus coins are calculated server-side, we'll show them if available
        bonusCoins = 0; // Will be updated from transactions if needed
      }
      
      setRewards({
        sp: expectedSP,
        xp: expectedXP,
        bonusCoins,
        insuranceRefund: insuranceRefund > 0 ? insuranceRefund : undefined
      });
      
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
        rematchPot: (duel as any)?.rematch_pot || 0,
        hadInsurance,
      });
      
      console.log('[DuelResult] Loaded results:', {
        myScore: myPlayer?.score,
        opponentScore: opponent?.score,
        betAmount,
        winnings,
        isDraw,
        rewards: { sp: actualSP, xp: actualXP, bonusCoins, insuranceRefund }
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
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 overflow-y-auto pt-16">
      <div className="min-h-screen w-full max-w-2xl mx-auto px-3 py-4 pb-20 space-y-3 animate-fade-in">
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
          
          {/* Betting results - Compact Modern Design */}
          {results.betAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="w-full"
            >
              <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 ${
                results.isWinner ? 'md:grid-cols-4' : ''
              }`}>
                {/* Ставка */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/15 via-rose-500/10 to-pink-500/15 dark:from-red-500/20 dark:via-rose-500/15 dark:to-pink-500/20 border border-red-400/30 dark:border-red-600/40 p-3 shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-400/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Coins className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Ставка</p>
                    </div>
                    <p className="text-lg font-black text-red-700 dark:text-red-400 leading-tight">
                      -{results.betAmount}
                    </p>
                  </div>
                </motion.div>

                {/* Банк (только для победителя) */}
                {results.isWinner && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/15 dark:from-amber-500/20 dark:via-yellow-500/15 dark:to-orange-500/20 border border-amber-400/30 dark:border-amber-600/40 p-3 shadow-sm"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Банк</p>
                      </div>
                      <p className="text-lg font-black text-amber-700 dark:text-amber-400 leading-tight">
                        {results.betAmount * 2}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Выигрыш / Возврат / Проигрыш */}
                {results.isWinner ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/20 via-emerald-500/15 to-teal-500/20 dark:from-green-500/25 dark:via-emerald-500/20 dark:to-teal-500/25 border-2 border-green-500/50 dark:border-green-600/60 p-3 shadow-lg col-span-2 md:col-span-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Coins className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </motion.div>
                        <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Выигрыш</p>
                      </div>
                      <p className="text-xl font-black text-green-700 dark:text-green-400 leading-tight">
                        +{results.winnings}
                      </p>
                    </div>
                  </motion.div>
                ) : results.isDraw ? (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-sky-500/15 dark:from-blue-500/20 dark:via-cyan-500/15 dark:to-sky-500/20 border border-blue-400/30 dark:border-blue-600/40 p-3 shadow-sm col-span-2 md:col-span-1"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Возврат</p>
                      </div>
                      <p className="text-lg font-black text-blue-700 dark:text-blue-400 leading-tight">
                        +{results.betAmount}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/15 via-rose-500/10 to-pink-500/15 dark:from-red-500/20 dark:via-rose-500/15 dark:to-pink-500/20 border border-red-400/30 dark:border-red-600/40 p-3 shadow-sm col-span-2 md:col-span-1"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-400/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Проигрыш</p>
                      </div>
                      <p className="text-lg font-black text-red-700 dark:text-red-400 leading-tight">
                        -{results.betAmount}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Страховка (если была) */}
                {results.hadInsurance && rewards?.insuranceRefund && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-teal-500/15 dark:from-green-500/20 dark:via-emerald-500/15 dark:to-teal-500/20 border border-green-400/40 dark:border-green-600/50 p-3 shadow-sm"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-400/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Страховка</p>
                      </div>
                      <p className="text-lg font-black text-green-700 dark:text-green-400 leading-tight">
                        +{results.isDraw ? rewards.insuranceRefund - results.betAmount : rewards.insuranceRefund}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Rewards Section - Ultra Modern Design */}
          {rewards && (
            <motion.div 
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border-2 border-purple-500/30 rounded-2xl p-4 shadow-2xl"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 animate-pulse" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </motion.div>
                  <h3 className="font-black text-base bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent">
                    Награды
                  </h3>
                  <motion.div
                    animate={{ rotate: [360, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 text-pink-500" />
                  </motion.div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Season Points (SP) */}
                  <motion.div 
                    className="relative group bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 border-2 border-purple-500/40 shadow-lg overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Star className="w-5 h-5 text-purple-500 mb-1" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Season Points</span>
                      <span className="text-xl font-black text-purple-700 dark:text-purple-300">
                        +{rewards.sp}
                      </span>
                      {results.betAmount === 0 && (
                        <span className="text-[10px] text-muted-foreground">Без ставки</span>
                      )}
                    </div>
                  </motion.div>
                  
                  {/* XP */}
                  <motion.div 
                    className="relative group bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 border-2 border-blue-500/40 shadow-lg overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.85 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Zap className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Опыт</span>
                      <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                        +{rewards.xp}
                      </span>
                    </div>
                  </motion.div>
                </div>
                
                {/* Bonus Coins & Insurance */}
                {(rewards.bonusCoins > 0 || rewards.insuranceRefund) && (
                  <motion.div 
                    className="mt-3 pt-3 border-t border-purple-500/20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <div className="flex flex-col gap-2">
                      {rewards.bonusCoins > 0 && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-2 border border-yellow-500/30">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Бонус</span>
                          </div>
                          <span className="text-sm font-black text-yellow-700 dark:text-yellow-300">
                            +{rewards.bonusCoins} монет
                          </span>
                        </div>
                      )}
                      {rewards.insuranceRefund && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-2 border border-green-500/30">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">Страховка</span>
                          </div>
                          <span className="text-sm font-black text-green-700 dark:text-green-300">
                            +{rewards.insuranceRefund} монет
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

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

          {/* Обзор вопросов - компактная версия */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Accordion type="single" collapsible className="bg-card/50 rounded-xl border-2">
              <AccordionItem value="questions" className="border-none">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>📝</span>
                    <span>Обзор вопросов</span>
                    <span className="text-xs text-muted-foreground">({results.myCorrect}/{myAnswers.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {myAnswers.map((answer: any, index: number) => {
                      const questionSnapshot = (answer.duel_questions as any)?.question_snapshot;
                      const questionText = questionSnapshot?.question_ru || questionSnapshot?.question_es || 'Вопрос';
                      const isCorrect = answer.is_correct;
                      
                      return (
                        <div 
                          key={answer.id}
                          className={`p-2 rounded-lg border ${
                            isCorrect 
                              ? 'bg-success/5 border-success/20' 
                              : 'bg-destructive/5 border-destructive/20'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium line-clamp-2">{questionText.substring(0, 80)}...</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-semibold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                                  {isCorrect ? 'Правильно' : 'Неправильно'}
                                </span>
                                {questionSnapshot && (
                                  <button
                                    onClick={() => {
                                      setSelectedQuestion(questionSnapshot);
                                      setShowAIWidget(true);
                                    }}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Объяснить
                                  </button>
                                )}
                    </div>
                    </div>
                            <span className="text-[10px] text-muted-foreground">+{answer.points_awarded || 0}</span>
                    </div>
                    </div>
                      );
                    })}
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
      
      {/* AI Widget для объяснения вопросов */}
      {showAIWidget && selectedQuestion && (
        <AIWidget
          questionText={selectedQuestion.question_ru || selectedQuestion.question_es || ''}
          questionImage={selectedQuestion.image_url || null}
          onClose={() => {
            setShowAIWidget(false);
            setSelectedQuestion(null);
          }}
        />
      )}
    </div>
  );
}
