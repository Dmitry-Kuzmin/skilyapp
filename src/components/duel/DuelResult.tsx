import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins, CheckCircle2, XCircle, Shield, Star, Gift, Flame } from 'lucide-react';
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
import { dispatchUserEvent } from '@/lib/notification-events';

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
  const rewardsAppliedRef = useRef(false);
  const notificationSentRef = useRef(false);

  useEffect(() => {
    loadResults();
  }, [duelId]);

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

  const loadResults = async () => {
    try {
      const [playersResponse, duelResponse, answersResponse, betResponse] = await Promise.all([
        supabase.from('duel_players').select('*, profiles(first_name, username)').eq('duel_id', duelId),
        supabase.from('duels').select('bet_amount, bet_type, commission_taken, rematch_pot').eq('id', duelId).single(),
        supabase.from('duel_answers').select('*, duel_questions(question_snapshot)').eq('duel_id', duelId).order('created_at', { ascending: true }),
        supabase.from('duel_bets').select('*').eq('duel_id', duelId).maybeSingle()
      ]);

      const players = playersResponse.data;
      const duel = duelResponse.data;
      const allAnswers = answersResponse.data;
      const bet = betResponse.data;

      if (!players) return;

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);
      const myPlayerAnswers = allAnswers?.filter((a: any) => a.player_id === myPlayer?.id) || [];
      setMyAnswers(myPlayerAnswers);

      const isWinner = myPlayer && opponent && myPlayer.score > opponent.score;
      const isDraw = myPlayer && opponent && myPlayer.score === opponent.score;
      const myProfile = myPlayer?.profiles as any;
      const opponentProfile = opponent?.profiles as any;

      let winnings = 0;
      let insuranceRefund = 0;
      const betAmount = (duel as any)?.bet_amount || 0;
      const isHost = myPlayer?.is_host;
      const hadInsurance = isHost ? bet?.host_insurance_enabled : bet?.opponent_insurance_enabled;

      if (betAmount > 0) {
        if (isWinner) {
          winnings = betAmount * 2;
        } else if (!isWinner && !isDraw && hadInsurance) {
          const coverageRate = isHost ? bet?.host_coverage_rate || 0.6 : bet?.opponent_coverage_rate || 0.6;
          insuranceRefund = Math.ceil(betAmount * coverageRate);
        } else if (isDraw && hadInsurance) {
          const premium = isHost ? bet?.host_insurance_premium || 0 : bet?.opponent_insurance_premium || 0;
          insuranceRefund = betAmount + premium;
        }
      }

      let expectedSP = 0;
      let expectedXP = 0;
      if (isWinner) {
        expectedXP = betAmount > 0 ? 40 : 30;
        if (betAmount > 0) {
          const riskMultiplier = betAmount >= 600 ? 4 : betAmount >= 300 ? 2.25 : betAmount >= 100 ? 1.25 : 1;
          expectedSP = Math.round(20 * riskMultiplier);
        }
      } else if (isDraw) {
        expectedXP = 25;
        expectedSP = betAmount > 0 ? 15 : 0;
      } else {
        expectedXP = 15;
        expectedSP = (betAmount >= 100) ? 5 : 0;
      }

      setRewards({
        sp: expectedSP,
        xp: expectedXP,
        bonusCoins: 0,
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
        hadInsurance,
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
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 overflow-y-auto pt-safe">
      <div className="min-h-screen w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 animate-fade-in">
        {results.isWinner && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} gravity={0.3} />}

        {/* Header Status */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.5 }} className="text-center space-y-2">
          {results.isWinner && (
            <motion.div animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1, 1.1, 1] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}>
              <Trophy className="h-20 w-20 mx-auto text-yellow-500 drop-shadow-2xl" />
            </motion.div>
          )}
          {!results.isWinner && !results.isDraw && <div className="text-6xl mb-2">😔</div>}
          {results.isDraw && <div className="text-6xl mb-2">🤝</div>}

          <h2 className={`text-3xl font-black ${results.isWinner ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500' : results.isDraw ? 'text-blue-500' : 'text-muted-foreground'}`}>
            {results.isWinner ? 'Победа!' : results.isDraw ? 'Ничья!' : 'Поражение'}
          </h2>
          <p className="text-muted-foreground font-medium">
            {results.isWinner ? 'Великолепная игра!' : results.isDraw ? 'Силы равны' : 'В следующий раз получится!'}
          </p>
        </motion.div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 rounded-2xl border-2 border-primary/30 shadow-xl backdrop-blur-sm">
            <div className="text-5xl font-black mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent text-center">{results.myScore}</div>
            <div className="text-sm font-bold text-center mb-3">Ваш счёт</div>
            <div className="flex items-center justify-center gap-1.5 bg-success/10 rounded-xl px-3 py-1.5">
              <Target className="w-4 h-4 text-success" />
              <span className="text-sm font-bold text-success">{results.myCorrect}/10</span>
            </div>
          </motion.div>

          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-muted/60 to-muted/30 p-4 rounded-2xl border-2 border-muted/50 shadow-xl backdrop-blur-sm">
            <div className="text-5xl font-black mb-2 text-foreground/80 text-center">{results.opponentScore}</div>
            <div className="text-sm font-bold text-center mb-3 truncate px-2">{results.opponentName}</div>
            <div className="flex items-center justify-center gap-1.5 bg-orange-500/10 rounded-xl px-3 py-1.5">
              <Target className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{results.opponentCorrect}/10</span>
            </div>
          </motion.div>
        </div>

        {/* Financial Block */}
        {results.betAmount > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card/50 backdrop-blur-md rounded-2xl border shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg">Ставка</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center bg-muted/30 rounded-xl p-3">
                <span className="text-muted-foreground font-medium">Ваша ставка:</span>
                <span className="font-bold text-red-500">-{results.betAmount}</span>
              </div>

              {results.isWinner && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="flex justify-between items-center bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                  <span className="font-bold text-green-600">Выигрыш:</span>
                  <span className="font-black text-xl text-green-600">+{results.winnings}</span>
                </motion.div>
              )}

              {!results.isWinner && !results.isDraw && (
                <div className="flex justify-between items-center bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <span className="font-bold text-red-600">Проигрыш:</span>
                  <span className="font-black text-xl text-red-600">-{results.betAmount}</span>
                </div>
              )}

              {results.isDraw && (
                <div className="flex justify-between items-center bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                  <span className="font-bold text-blue-600">Возврат:</span>
                  <span className="font-black text-xl text-blue-600">+{results.betAmount}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Rewards Block */}
        {rewards && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl border-2 border-blue-500/20 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
              <h3 className="font-black text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Награды</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20 flex flex-col items-center gap-1">
                <Star className="w-6 h-6 text-blue-500 fill-blue-500/20" />
                <span className="text-xs font-bold text-muted-foreground">Season Points</span>
                <span className="text-2xl font-black text-blue-600">+{rewards.sp}</span>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20 flex flex-col items-center gap-1">
                <Zap className="w-6 h-6 text-purple-500 fill-purple-500/20" />
                <span className="text-xs font-bold text-muted-foreground">Опыт</span>
                <span className="text-2xl font-black text-purple-600">+{rewards.xp}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Bar */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card className="p-4 bg-muted/30 border-none shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground">Прогресс до Мастера</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <Progress value={(results.myCorrect || 0) * 10} className="h-3 bg-background" />
            <div className="text-right mt-1 text-[10px] text-muted-foreground">Ещё {10 - (results.myCorrect || 0)} побед</div>
          </Card>
        </motion.div>

        {/* Question Review */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border shadow-sm">
            <AccordionItem value="questions" className="border-none">
              <AccordionTrigger className="px-5 py-3 hover:no-underline">
                <div className="flex items-center gap-2 font-bold">
                  <span>📝 Обзор вопросов</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{results.myCorrect}/{myAnswers.length}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {myAnswers.map((answer: any) => {
                    const questionText = (answer.duel_questions?.question_snapshot?.question_ru || 'Вопрос');
                    const isCorrect = answer.is_correct;
                    return (
                      <div key={answer.id} className={`p-3 rounded-xl border flex gap-3 ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        {isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{questionText}</p>
                          {!isCorrect && answer.duel_questions?.question_snapshot && (
                            <button onClick={() => { setSelectedQuestion(answer.duel_questions.question_snapshot); setShowAIWidget(true); }} className="text-xs text-primary font-bold mt-1 hover:underline">
                              Почему это неправильно?
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col gap-3 pt-4">
          <div className="flex gap-3">
            <Button onClick={() => { haptics.buttonClick(); onRematch(); }} className="flex-1 h-12 text-base font-bold shadow-lg shadow-primary/20" size="lg">
              <RotateCcw className="mr-2 h-5 w-5" /> Реванш
            </Button>
            <Button onClick={() => { haptics.buttonClick(); handleShare(); }} variant="outline" size="lg" className="h-12 px-5 border-2">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button onClick={() => { haptics.buttonClick(); onBackToMenu(); }} variant="ghost" className="w-full h-12 font-medium text-muted-foreground hover:text-foreground">
            <Home className="mr-2 h-5 w-5" /> В меню
          </Button>
        </motion.div>
      </div>

      {showAIWidget && selectedQuestion && (
        <AIWidget
          questionText={selectedQuestion.question_ru || selectedQuestion.question_es || ''}
          questionImage={selectedQuestion.image_url || null}
          onClose={() => { setShowAIWidget(false); setSelectedQuestion(null); }}
        />
      )}
    </div>
  );
}
