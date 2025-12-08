import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins, CheckCircle2, XCircle, Shield, Star, Gift, Flame, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { AIWidget } from '@/components/AIWidget';
import { toast } from 'sonner';
import { dispatchUserEvent } from '@/lib/notification-events';
import { cn } from '@/lib/utils';
import { useDuelResults } from '@/hooks/useDuelResults';

interface DuelResultProps {
  duelId: string;
  onRematch: () => void;
  onBackToMenu: () => void;
}

export function DuelResult({ duelId, onRematch, onBackToMenu }: DuelResultProps) {
  const { profileId } = useUserContext();
  
  // ОПТИМИЗАЦИЯ: Используем React Query хук вместо прямых запросов
  const { data: duelResultsData, isLoading: loading, refetch } = useDuelResults(duelId, profileId);
  
  const [results, setResults] = useState<any>(null);
  const [myAnswers, setMyAnswers] = useState<any[]>([]);
  const [showAIWidget, setShowAIWidget] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [rewards, setRewards] = useState<{ sp: number; xp: number; bonusCoins: number; insuranceRefund?: number } | null>(null);
  const rewardsAppliedRef = useRef(false);
  const notificationSentRef = useRef(false);

  // Обновляем состояние при загрузке данных
  useEffect(() => {
    if (duelResultsData) {
      setResults(duelResultsData.results);
      setMyAnswers(duelResultsData.myAnswers);
      
      // Отправляем уведомление сопернику
      if (!notificationSentRef.current && duelResultsData.opponentPlayer?.user_id) {
        notificationSentRef.current = true;
        dispatchUserEvent(duelResultsData.opponentPlayer.user_id, 'duel_finished', {
          duel_id: duelId,
          opponent_score: duelResultsData.results.myScore,
          is_opponent_winner: duelResultsData.results.isWinner
        });
      }
    }
  }, [duelResultsData, duelId]);

  useEffect(() => {
    if (results && profileId && !rewardsAppliedRef.current) {
      rewardsAppliedRef.current = true;

      const spSource = results.isDraw ? 'duel_draw' : (results.isWinner ? 'duel_win' : 'duel_lose');
      const metadata = {
        duel_id: duelId,
        is_winner: results.isWinner,
        is_draw: results.isDraw,
        bet_amount: results.betAmount || 0,
        has_bet: (results.betAmount || 0) > 0
      };

      const applyRewards = async () => {
        try {
          const { data: spData } = await supabase.functions.invoke('season-sp', {
            body: { user_id: profileId, source_type: spSource, metadata },
          });

          const { data: xpData } = await supabase.functions.invoke('duel-pass-xp', {
            body: { user_id: profileId, source_type: spSource, metadata },
          });

          if (spData && xpData) {
            setRewards(prev => prev ? {
              ...prev,
              sp: spData.sp_added || prev.sp,
              xp: xpData.xp_added || prev.xp
            } : null);
          }

          await supabase.functions.invoke('season-challenges-track', {
            body: { user_id: profileId, source_type: spSource, metadata },
          });

          if (xpData?.level_up) {
            const { data: suggestion } = await supabase.functions.invoke('assistant-suggest', {
              body: { trigger: 'duel_pass_level_up' },
            });
            const message = suggestion?.suggestion?.message;
            if (message) toast.info(message);
          }
        } catch (err) {
          console.error('[DuelResult] Error applying rewards:', err);
          rewardsAppliedRef.current = false;
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

  // Вычисляем bonusCoins из results
  useEffect(() => {
    if (results) {
      const bonusCoins = results.isWinner ? 10 : (results.isDraw ? 5 : 0);
      setRewards(prev => prev ? {
        ...prev,
        bonusCoins,
        insuranceRefund: results.insuranceRefund
      } : {
        sp: 0,
        xp: 0,
        bonusCoins,
        insuranceRefund: results.insuranceRefund
      });
    }
  }, [results]);

  const handleQuestionClick = (answer: any) => {
    setSelectedQuestion(answer.duel_questions);
    setShowAIWidget(true);
  };

  if (loading || !results) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Подсчитываем результаты...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-y-auto pt-safe z-40">
      <div className="min-h-screen w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4 relative z-10">
        <AnimatePresence>
          {results.isWinner && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={150} gravity={0.2} style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }} />}
        </AnimatePresence>

        {/* Header - Animated Result Status */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          className="text-center space-y-3 relative"
        >
          {/* Animated Trophy/Icon */}
          <motion.div
            animate={results.isWinner ? {
              scale: [1, 1.02, 1]
            } : {}}
            transition={{ duration: 2, repeat: results.isWinner ? Infinity : 0, repeatDelay: 2 }}
            className="relative inline-block"
          >
            {results.isWinner && (
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/10 blur-2xl opacity-30" />
                <Trophy className="relative h-16 w-16 mx-auto text-indigo-400" />
              </div>
            )}
            {!results.isWinner && !results.isDraw && (
              <div className="text-6xl opacity-60">😔</div>
            )}
            {results.isDraw && (
              <div className="text-6xl opacity-60">🤝</div>
            )}
          </motion.div>

          {/* Status Text */}
          <div className="space-y-1">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-4xl md:text-5xl font-bold tracking-tight",
                results.isWinner && "bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent",
                results.isDraw && "text-zinc-300",
                !results.isWinner && !results.isDraw && "text-zinc-500"
              )}
            >
              {results.isWinner ? 'Победа!' : results.isDraw ? 'Ничья!' : 'Поражение'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-zinc-400 text-sm font-medium"
            >
              {results.isWinner ? 'Отличная игра!' : results.isDraw ? 'Вы на равных' : 'Попробуй ещё раз!'}
            </motion.p>
          </div>
        </motion.div>

        {/* Score Cards - Premium Glass Design */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="relative group"
          >
            <div className="relative bg-zinc-900/50 backdrop-blur-xl rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold text-zinc-100">
                  {results.myScore}
                </div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Вы</div>
                <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 rounded-full px-2 py-1 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">{results.myCorrect}/10</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="relative group"
          >
            <div className="relative bg-zinc-900/50 backdrop-blur-xl rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold text-zinc-300">
                  {results.opponentScore}
                </div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate px-2 max-w-[120px] md:max-w-none mx-auto" title={results.opponentName}>{results.opponentName}</div>
                <div className="flex items-center justify-center gap-1.5 bg-orange-500/10 rounded-full px-2 py-1 border border-orange-500/20">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-zinc-200">{results.opponentCorrect}/10</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Rewards Section - Premium Design */}
        {rewards && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-4"
          >
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] opacity-30" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Награды</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Season Points */}
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-lg p-4 border border-white/5 text-center space-y-2">
                  <Star className="w-5 h-5 text-indigo-400 mx-auto fill-indigo-400/10" />
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Season Points</div>
                  <div className="text-2xl font-bold text-zinc-100">
                    +{rewards.sp}
                  </div>
                </div>

                {/* XP */}
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-lg p-4 border border-white/5 text-center space-y-2">
                  <Zap className="w-5 h-5 text-violet-400 mx-auto fill-violet-400/10" />
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Опыт</div>
                  <div className="text-2xl font-bold text-zinc-100">
                    +{rewards.xp}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Betting Results */}
        {results.betAmount > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden"
          >
            <div className="p-3 border-b border-white/5 bg-zinc-800/30 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Ставка</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center bg-zinc-800/30 rounded-lg p-3 border border-white/5">
                <span className="text-xs font-medium text-zinc-400">Ваша ставка:</span>
                <span className="text-sm font-semibold text-red-400">-{results.betAmount}</span>
              </div>

              {results.isWinner && (
                <div className="flex justify-between items-center bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                  <span className="text-xs font-semibold text-emerald-400">Выигрыш:</span>
                  <span className="text-xl font-bold text-emerald-400">+{results.winnings}</span>
                </div>
              )}

              {!results.isWinner && !results.isDraw && (
                <div className="flex justify-between items-center bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <span className="text-xs font-semibold text-red-400">Проигрыш:</span>
                  <span className="text-xl font-bold text-red-400">-{results.betAmount}</span>
                </div>
              )}

              {results.isDraw && (
                <div className="flex justify-between items-center bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
                  <span className="text-xs font-semibold text-indigo-400">Возврат:</span>
                  <span className="text-xl font-bold text-indigo-400">+{results.betAmount}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Questions Review */}
        {myAnswers.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="questions" className="border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-zinc-800/30 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                      <Trophy className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-zinc-200">Обзор вопросов</h3>
                      <p className="text-xs text-zinc-500">{results.myCorrect} правильных из 10</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-white/5">
                    {myAnswers.map((answer, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleQuestionClick(answer)}
                        className="p-3 hover:bg-zinc-800/30 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                              answer.is_correct ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-300 line-clamp-2 font-medium">
                                {answer.duel_questions?.question_snapshot?.question_ru || 
                                 answer.duel_questions?.question_ru || 
                                 'Вопрос'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {answer.is_correct ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="grid grid-cols-2 gap-3 pt-2"
        >
          <Button
            onClick={onRematch}
            className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold h-12 rounded-xl shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-[1.01] transition-all"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Реванш
          </Button>
          <Button
            onClick={onBackToMenu}
            variant="outline"
            className="border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-200 font-semibold h-12 rounded-xl backdrop-blur-sm"
          >
            <Home className="w-4 h-4 mr-2" />
            В меню
          </Button>
        </motion.div>
      </div>

      {/* AI Widget */}
      {showAIWidget && selectedQuestion && (
        <AIWidget
          question={selectedQuestion}
          onClose={() => {
            setShowAIWidget(false);
            setSelectedQuestion(null);
          }}
        />
      )}
    </div>
  );
}
