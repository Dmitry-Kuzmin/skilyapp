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
import { DataLaunderingButton } from './DataLaunderingButton';

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
    <div className="fixed inset-0 bg-background overflow-y-auto pt-safe z-40">
      <div className="min-h-screen w-full max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6 relative z-10">
        <AnimatePresence>
          {results.isWinner && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.25} style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }} />}
        </AnimatePresence>

        {/* Header - Animated Result Status */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: -50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.7, bounce: 0.4 }}
          className="text-center space-y-4 relative"
        >
          {/* Animated Trophy/Icon */}
          <motion.div
            animate={results.isWinner ? {
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.1, 1, 1.05, 1]
            } : {}}
            transition={{ duration: 1, repeat: results.isWinner ? Infinity : 0, repeatDelay: 3 }}
            className="relative inline-block"
          >
            {results.isWinner && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 blur-3xl opacity-50 animate-pulse" />
                <Trophy className="relative h-24 w-24 mx-auto text-yellow-400 drop-shadow-2xl" />
              </div>
            )}
            {!results.isWinner && !results.isDraw && (
              <div className="text-7xl opacity-80">😔</div>
            )}
            {results.isDraw && (
              <div className="text-7xl opacity-80">🤝</div>
            )}
          </motion.div>

          {/* Status Text */}
          <div className="space-y-2">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "text-5xl md:text-6xl font-black tracking-tight",
                results.isWinner && "bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent animate-shimmer",
                results.isDraw && "text-blue-400",
                !results.isWinner && !results.isDraw && "text-slate-400"
              )}
              style={results.isWinner ? { backgroundSize: "200% 100%" } : {}}
            >
              {results.isWinner ? 'Победа!' : results.isDraw ? 'Ничья!' : 'Поражение'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-400 text-lg font-medium"
            >
              {results.isWinner ? 'Отличная игра!' : results.isDraw ? 'Вы на равных' : 'Попробуй ещё раз!'}
            </motion.p>
          </div>
        </motion.div>

        {/* Score Cards - Modern Glass Design */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl font-black bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent"
                >
                  {results.myScore}
                </motion.div>
                <div className="text-sm font-bold text-white/80">Вы</div>
                <div className="flex items-center justify-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-white">{results.myCorrect}/10</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="text-center space-y-3">
                <div className="text-6xl font-black text-slate-300">
                  {results.opponentScore}
                </div>
                <div className="text-sm font-bold text-slate-400 truncate px-2 max-w-[150px] md:max-w-none mx-auto" title={results.opponentName}>{results.opponentName}</div>
                <div className="flex items-center justify-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">{results.opponentCorrect}/10</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Rewards Section - Completely Redesigned */}
        {rewards && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-xl p-6"
          >
            {/* Animated background gradient */}
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50 rounded-3xl overflow-hidden"
              style={{ backgroundSize: "200% 200%" }}
            />

            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </motion.div>
                <h3 className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Награды
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Season Points */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20 text-center space-y-2"
                >
                  <Star className="w-8 h-8 text-blue-400 mx-auto fill-blue-400/20" />
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Season Points</div>
                  <div className="text-3xl font-black bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    +{rewards.sp}
                  </div>
                </motion.div>

                {/* XP */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20 text-center space-y-2"
                >
                  <Zap className="w-8 h-8 text-purple-400 mx-auto fill-purple-400/20" />
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Опыт</div>
                  <div className="text-3xl font-black bg-gradient-to-br from-purple-400 to-purple-600 bg-clip-text text-transparent">
                    +{rewards.xp}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Betting Results */}
        {results.betAmount > 0 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white">Ставка</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                <span className="text-slate-400 font-medium">Ваша ставка:</span>
                <span className="font-bold text-red-400">-{results.betAmount}</span>
              </div>

              {results.isWinner && (
                <>
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex justify-between items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-3 border border-green-500/30"
                  >
                    <span className="font-bold text-green-400">Выигрыш:</span>
                    <span className="font-black text-2xl text-green-400">+{results.winnings}</span>
                  </motion.div>
                  
                  {/* DATA LAUNDERING - Удвоение выигрыша за рекламу */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3"
                  >
                    <DataLaunderingButton 
                      winnings={results.winnings} 
                      duelId={duelId}
                    />
                  </motion.div>
                </>
              )}

              {!results.isWinner && !results.isDraw && (
                <div className="flex justify-between items-center bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <span className="font-bold text-red-400">Проигрыш:</span>
                  <span className="font-black text-2xl text-red-400">-{results.betAmount}</span>
                </div>
              )}

              {results.isDraw && (
                <div className="flex justify-between items-center bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                  <span className="font-bold text-blue-400">Возврат:</span>
                  <span className="font-black text-2xl text-blue-400">+{results.betAmount}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Questions Review */}
        {myAnswers.length > 0 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="questions" className="border-none">
                <AccordionTrigger className="px-5 py-4 hover:no-underline bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Trophy className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Обзор вопросов</h3>
                      <p className="text-xs text-slate-400">{results.myCorrect} правильных из 10</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-white/5">
                    {myAnswers.map((answer, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleQuestionClick(answer)}
                        className="p-4 hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              answer.is_correct ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-white/90 line-clamp-2">
                                {answer.duel_questions?.question_snapshot?.question_ru || 
                                 answer.duel_questions?.question_ru || 
                                 'Вопрос'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {answer.is_correct ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
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
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-2 gap-4 pt-4"
        >
          <Button
            onClick={onRematch}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold h-14 rounded-2xl shadow-lg shadow-blue-500/30"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Реванш
          </Button>
          <Button
            onClick={onBackToMenu}
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold h-14 rounded-2xl backdrop-blur-sm"
          >
            <Home className="w-5 h-5 mr-2" />
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
