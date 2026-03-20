import { useEffect, useState, useRef, useMemo } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins, CheckCircle2, XCircle, Shield, Star, Gift, Flame, ChevronRight, RefreshCw, ChevronDown, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
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
import { clearDuelResultSnapshot, loadDuelResultSnapshot } from '@/utils/duelResultSnapshot';
import { DataLaunderingButton } from './DataLaunderingButton';
import { usePremium } from '@/hooks/usePremium';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { QuestCompletionOverlay } from '@/components/quests/QuestCompletionOverlay';

import SmartDebriefCard from "@/components/test-results/SmartDebriefCardV3";
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import type { DuelResultSnapshot } from '@/features/duel/shared';
import { isTelegramMiniApp, getTelegramWebApp, canShareToStory, hasTelegramPremium } from '@/lib/telegram';
import { generateDuelResultImage } from '@/utils/generateDuelResultImage';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = import.meta.env.DEV;

interface DuelResultProps {
  duelId: string;
  onRematch: (isBotRematch: boolean, opponentData: { id: string, name: string, isBot: boolean }) => void;
  onBackToMenu: () => void;
  initialSnapshot?: DuelResultSnapshot | null;
}

// Разные варианты эффектов фейерверков/салютов
const confettiEffects = [
  { numberOfPieces: 200, gravity: 0.25, colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493'] },
  { numberOfPieces: 300, gravity: 0.3, colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'] },
  { numberOfPieces: 250, gravity: 0.2, colors: ['#4A90E2', '#7B68EE', '#9370DB', '#BA55D3'] },
  { numberOfPieces: 350, gravity: 0.35, colors: ['#32CD32', '#ADFF2F', '#FFD700', '#FFA500'] },
  { numberOfPieces: 280, gravity: 0.28, colors: ['#FF69B4', '#FF1493', '#DC143C', '#FF6347'] },
  { numberOfPieces: 400, gravity: 0.4, colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'] },
];

const getFallbackAvatar = (name: string) => {
  if (!name) return `https://i.pravatar.cc/150?u=fallback`;
  const lowerName = name.toLowerCase().trim();
  const isFemale = lowerName.endsWith('a') || lowerName.endsWith('я') || lowerName.endsWith('и') || lowerName.endsWith('ah') || lowerName === 'chloe' || lowerName === 'zoe';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const femaleIds = [1, 5, 9, 10, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 47, 48, 49];
  const maleIds = [3, 4, 6, 7, 8, 11, 12, 13, 14, 15, 17, 18, 33, 37, 46, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67];
  const ids = isFemale ? femaleIds : maleIds;
  const index = Math.abs(hash) % ids.length;
  return `https://i.pravatar.cc/150?img=${ids[index]}`;
};

export function DuelResult({ duelId, onRematch, onBackToMenu, initialSnapshot }: DuelResultProps) {
  const { t, language } = useLanguage();
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const [shouldShowInterstitial, setShouldShowInterstitial] = useState(false);
  const { clearActiveDuel } = useActiveDuel();
  const { completedQuests, updateProgress, clearCompleted } = useQuestProgress();

  const winPhrases = (t('duelResult.phrases.win', undefined, { returnObjects: true }) || []) as string[];
  const losePhrases = (t('duelResult.phrases.lose', undefined, { returnObjects: true }) || []) as string[];

  const [restoredSnapshot, setRestoredSnapshot] = useState<DuelResultSnapshot | null>(null);

  useEffect(() => {
    if (!initialSnapshot && duelId) {
      const savedSnapshot = loadDuelResultSnapshot(duelId);
      if (savedSnapshot && savedSnapshot.duelId === duelId) {
        setRestoredSnapshot(savedSnapshot);
      }
    }
  }, [duelId, initialSnapshot]);

  const effectiveSnapshot = initialSnapshot || restoredSnapshot;
  const { data: duelResultsData, isLoading: loading, refetch, error } = useDuelResults(duelId, profileId, effectiveSnapshot);

  const [selectedConfettiEffect] = useState(() => {
    return confettiEffects[Math.floor(Math.random() * confettiEffects.length)];
  });

  useEffect(() => {
    return () => {
      if (duelId) {
        clearDuelResultSnapshot();
      }
    };
  }, [duelId]);

  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    const webApp = getTelegramWebApp();
    if (!webApp || !webApp.BackButton) return;
    webApp.BackButton.show();
    const handleBack = () => {
      clearActiveDuel();
      clearDuelResultSnapshot();
      onBackToMenu();
    };
    webApp.BackButton.onClick(handleBack);
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [onBackToMenu, clearActiveDuel]);

  const [results, setResults] = useState<any>(duelResultsData?.results || null);
  const [myAnswers, setMyAnswers] = useState<any[]>(duelResultsData?.myAnswers || []);
  const [showAIWidget, setShowAIWidget] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [rewards, setRewards] = useState<{ sp: number; xp: number; bonusCoins: number; insuranceRefund?: number } | null>(null);
  const rewardsAppliedRef = useRef(false);
  const notificationSentRef = useRef(false);
  const counterAnimationCompleteRef = useRef(false);
  const [showBotProposal, setShowBotProposal] = useState(false);
  const [rematchProposalCount, setRematchProposalCount] = useState(0);

  const proposalPhrase = useMemo(() => {
    if (!results || winPhrases.length === 0 || losePhrases.length === 0) return "";
    const phrases = results.isWinner ? losePhrases : winPhrases;
    const index = (duelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % phrases.length;
    return phrases[index];
  }, [results, duelId, winPhrases, losePhrases]);

  useEffect(() => {
    if (duelResultsData) {
      if (!results) setResults(duelResultsData.results);
      if (myAnswers.length === 0) setMyAnswers(duelResultsData.myAnswers);
      if (!notificationSentRef.current && duelResultsData.opponentPlayer?.user_id) {
        notificationSentRef.current = true;
        dispatchUserEvent(duelResultsData.opponentPlayer.user_id, 'duel_finished', {
          duel_id: duelId,
          opponent_score: duelResultsData.results.myScore,
          is_opponent_winner: duelResultsData.results.isWinner
        });
      }
    }
  }, [duelResultsData, duelId, results, myAnswers.length]);

  const totalQuestions = duelResultsData?.duel?.num_questions || myAnswers.length || 10;

  useEffect(() => {
    if (results && profileId && !rewardsAppliedRef.current) {
      rewardsAppliedRef.current = true;
      clearActiveDuel();
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
            queryClient.invalidateQueries({ queryKey: ["profile-data"] });
          }
          const questParams = [
            { userId: profileId, category: 'duels', delta: 1 },
            { userId: profileId, category: 'questions', delta: myAnswers.length },
          ];
          if (results.isWinner) {
            questParams.push({ userId: profileId, category: 'duel_wins', delta: 1 });
          }
          const hasNoErrors = myAnswers.every(a => a.is_correct);
          if (hasNoErrors && myAnswers.length > 0) {
            questParams.push({ userId: profileId, category: 'accuracy', delta: myAnswers.length });
          }
          await updateProgress(questParams);
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
  }, [results, profileId, duelId, clearActiveDuel, myAnswers, queryClient, updateProgress]);

  useEffect(() => {
    if (results?.isWinner) {
      sounds.victory();
      haptics.victory();
    } else if (results && !results.isDraw) {
      sounds.defeat();
      haptics.defeat();
    }
  }, [results]);

  useEffect(() => {
    const isDefinitelyBot = results?.isBot === true && duelResultsData?.opponentPlayer?.is_bot === true;
    if (results && isDefinitelyBot && !showBotProposal && rematchProposalCount < 2) {
      const timer = setTimeout(() => {
        setShowBotProposal(true);
        setRematchProposalCount(prev => prev + 1);
        sounds.notificationPop();
        haptics.boostActivated();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [results, duelResultsData, showBotProposal, rematchProposalCount]);

  useEffect(() => {
    if (results && !counterAnimationCompleteRef.current) {
      counterAnimationCompleteRef.current = true;
      const timer = setTimeout(() => {
        haptics.correctAnswer();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [results]);

  useEffect(() => {
    if (results) {
      const baseReward = results.isWinner ? 20 : (results.isDraw ? 10 : 0);
      setRewards(prev => prev ? {
        ...prev,
        bonusCoins: baseReward,
        insuranceRefund: results.insuranceRefund
      } : {
        sp: 0,
        xp: 0,
        bonusCoins: baseReward,
        insuranceRefund: results.insuranceRefund
      });
    }
  }, [results]);

  const handleQuestionClick = (answer: any) => {
    setSelectedQuestion(answer.duel_questions);
    setShowAIWidget(true);
  };

  const handleShareToStory = async () => {
    if (!results || !isTelegramMiniApp()) return;
    const webApp = getTelegramWebApp();
    if (!webApp) {
      toast.error(t('duelResult.stories.notAvailable'));
      return;
    }
    if (!webApp.shareToStory) {
      toast.error(t('duelResult.stories.updateTelegram'));
      return;
    }
    try {
      toast.loading(t('duelResult.stories.generating'), { id: 'share-story' });
      const imageDataUrl = await generateDuelResultImage({
        myScore: results.myScore,
        opponentScore: results.opponentScore,
        opponentName: results.opponentName || t('duelResult.opponent'),
        isWinner: results.isWinner,
        isDraw: results.isDraw,
      });

      const scoreStr = `${results.myScore}:${results.opponentScore}`;
      const shareText = results.isWinner
        ? t('duelResult.stories.winText', { score: scoreStr })
        : results.isDraw
          ? t('duelResult.stories.drawText', { score: scoreStr })
          : t('duelResult.stories.lossText', { score: scoreStr });

      webApp.shareToStory(imageDataUrl, {
        text: shareText,
        widget_link: {
          url: 'https://t.me/skilyapp_bot',
          name: t('duelResult.stories.widgetLinkName')
        }
      });
      toast.success(t('duelResult.stories.openingEditor'), { id: 'share-story' });
    } catch (error) {
      console.error('[DuelResult] Error sharing to story:', error);
      toast.error(t('duelResult.stories.error'), { id: 'share-story' });
    }
  };

  if (loading || (!results && !error)) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse text-lg font-medium">{t('duelResult.loading')}</p>
          <p className="text-xs text-muted-foreground/60">{t('duelResult.loadingDesc')}</p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }}>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
              {t('duelResult.forceLoad')}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-6 px-6 max-w-sm">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('duelResult.errorLoading')}</h2>
            <p className="text-muted-foreground">{t('duelResult.errorDesc')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => refetch()} className="w-full">{t('duelResult.retry')}</Button>
            <Button variant="outline" onClick={onBackToMenu} className="w-full">{t('duelResult.backToMenu')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full z-10 bg-transparent overflow-x-hidden pt-0 pb-24">
      <QuestCompletionOverlay quests={completedQuests} onDismiss={clearCompleted} />
      <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-6 relative z-10">
        <AnimatePresence>
          {results.isWinner && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={selectedConfettiEffect.numberOfPieces}
              gravity={selectedConfettiEffect.gravity}
              colors={selectedConfettiEffect.colors}
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: -50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.7, bounce: 0.4 }}
          className="text-center space-y-4 relative pt-0"
        >
          <motion.div
            animate={results.isWinner ? { y: [0, -10, 0], rotate: [0, -3, 3, -3, 0], scale: [1, 1.05, 1] } : results.isDraw ? { y: [0, -5, 0], scale: [1, 1.03, 1] } : { y: [0, -3, 0], scale: [1, 0.98, 1] }}
            transition={{ duration: results.isWinner ? 3 : 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative inline-block"
          >
            {results.isWinner && (
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-3xl" style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }} />
                <Trophy className="relative h-24 w-24 mx-auto text-yellow-600 dark:text-yellow-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
              </div>
            )}
            {!results.isWinner && !results.isDraw && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/20 to-zinc-600/20 blur-2xl opacity-30" />
                <motion.div className="text-7xl md:text-8xl relative z-10" animate={{ opacity: [0.6, 0.8, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>😔</motion.div>
              </div>
            )}
            {results.isDraw && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-2xl opacity-30" />
                <motion.div className="text-7xl md:text-8xl relative z-10" animate={{ opacity: [0.7, 0.9, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>🤝</motion.div>
              </div>
            )}
          </motion.div>

          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "text-5xl md:text-6xl font-black tracking-tight",
                results.isWinner && "bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent",
                results.isDraw && "bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent",
                !results.isWinner && !results.isDraw && "bg-gradient-to-r from-zinc-400 to-zinc-500 bg-clip-text text-transparent"
              )}
            >
              {results.isWinner ? t('duelResult.victory') : results.isDraw ? t('duelResult.draw') : t('duelResult.defeat')}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-lg md:text-xl font-medium">
              {results.isWinner ? t('duelResult.greatGame') : results.isDraw ? t('duelResult.equalMatch') : t('duelResult.tryAgain')}
            </motion.p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 100 }} className="relative overflow-hidden bg-white/40 dark:bg-[#0b0d14]/40 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 dark:border-white/[0.03]">
            <div className="text-center space-y-3 relative z-10">
              <AnimatedCounter value={results.myScore} duration={1500} className={cn("font-black bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 dark:from-blue-400 dark:via-blue-300 dark:to-white bg-clip-text text-transparent", results.myScore > 999 ? "text-5xl md:text-6xl" : "text-6xl md:text-7xl")} />
              <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{t('duelResult.you')}</div>
              <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{results.myCorrect}/{totalQuestions}</span>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 100 }} className="relative overflow-hidden bg-white/40 dark:bg-[#0b0d14]/40 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 dark:border-white/[0.03]">
            <div className="text-center space-y-3 relative z-10">
              <AnimatedCounter value={results.opponentScore} duration={1500} className={cn("font-black text-slate-600 dark:text-zinc-300", results.opponentScore > 999 ? "text-5xl md:text-6xl" : "text-6xl md:text-7xl")} />
              <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 truncate px-2 max-w-[150px] md:max-w-none mx-auto" title={results.opponentName}>{results.opponentName || t('duelResult.opponent')}</div>
              <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2">
                <Target className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{results.opponentCorrect}/{totalQuestions}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {rewards && (
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="relative overflow-hidden rounded-[32px] bg-white/40 dark:bg-[#0b0d14]/40 backdrop-blur-xl p-6 border border-white/5 dark:border-white/[0.03]">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{t('duelResult.rewards.title')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 text-center space-y-2">
                  <Zap className="w-8 h-8 text-indigo-400 mx-auto fill-indigo-500/20" />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{t('duelResult.rewards.xp')}</div>
                  <AnimatedCounter value={rewards.xp} duration={1500} prefix="+" className="text-2xl font-black bg-gradient-to-br from-indigo-400 to-indigo-300 bg-clip-text text-transparent" />
                </div>
                <div className="bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 text-center space-y-2">
                  <Trophy className="w-8 h-8 text-amber-500 mx-auto fill-amber-500/20" />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{t('duelResult.rewards.sp')}</div>
                  <AnimatedCounter value={rewards.sp} duration={1500} prefix="+" className="text-2xl font-black bg-gradient-to-br from-amber-400 to-yellow-300 bg-clip-text text-transparent" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {results?.betAmount > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg">
            <div className="p-4 bg-muted/30 dark:bg-white/5 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h3 className="font-bold text-foreground">{t('duelResult.betting.title')}</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center bg-muted/30 dark:bg-white/5 rounded-xl p-3">
                <span className="text-muted-foreground font-medium">{t('duelResult.betting.yourStake')}</span>
                <span className="font-bold text-red-500 dark:text-red-400">-{results.betAmount}</span>
              </div>
              {results.isWinner && (
                <>
                  <div className="flex justify-between items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-3">
                    <span className="font-bold text-green-600 dark:text-green-400">{t('duelResult.betting.winnings')}</span>
                    <span className="font-black text-2xl text-green-600 dark:text-green-400">+{results.winnings}</span>
                  </div>
                  <div className="mt-3">
                    <DataLaunderingButton winnings={results.winnings} duelId={duelId} />
                  </div>
                </>
              )}
              {!results.isWinner && !results.isDraw && (
                <div className="flex justify-between items-center bg-red-500/10 rounded-xl p-3">
                  <span className="font-bold text-red-600 dark:text-red-400">{t('duelResult.betting.loss')}</span>
                  <span className="font-black text-2xl text-red-600 dark:text-red-400">-{results.betAmount}</span>
                </div>
              )}
              {results.isDraw && (
                <div className="flex justify-between items-center bg-blue-500/10 rounded-xl p-3">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{t('duelResult.betting.refund')}</span>
                  <span className="font-black text-2xl text-blue-600 dark:text-blue-400">+{results.betAmount}</span>
                </div>
              )}
              <div className={cn("flex items-center justify-between rounded-xl p-3 border mt-1", results.insuranceUsed ? "bg-indigo-500/10 border-indigo-500/20" : "bg-slate-500/5 border-dashed border-slate-500/20")}>
                <div className="flex items-center gap-2.5">
                  <Shield className={cn("w-4 h-4", results.insuranceUsed ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400")} />
                  <span className={cn("font-semibold text-sm", results.insuranceUsed ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")}>{results.insuranceUsed ? t('duelResult.betting.insurance') : t('duelResult.betting.noInsurance')}</span>
                </div>
                <div className="text-right">
                  {results.insuranceUsed ? (
                    results.insuranceRefund > 0 ? <span className="font-black text-green-600 dark:text-green-400">+{results.insuranceRefund}</span> : <span className="text-xs font-bold text-indigo-500/80">{t('duelResult.betting.notNeeded')}</span>
                  ) : <span className="text-xs font-medium text-slate-400">{t('duelResult.betting.couldSave', { amount: Math.floor(results.betAmount * (results.insuranceCoverageRate || 0.7)) })}</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showBotProposal && (
            <motion.div initial={{ y: -100, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0, scale: 0.9 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[360px] max-w-[calc(100vw-32px)]">
              <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-3xl rounded-[2rem] p-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <img src={results.opponentAvatar || getFallbackAvatar(results.opponentName)} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" alt="" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black text-xs uppercase tracking-widest opacity-60">{t('duelResult.rematch.title')}</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-tight pr-2">
                      <span className="text-indigo-400">{results.opponentName}:</span> "{proposalPhrase}"
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 mt-5">
                  <Button onClick={() => { setShowBotProposal(false); onRematch(true, { id: results.opponentId || 'bot', name: results.opponentName, isBot: true }); }} className="flex-[2] bg-indigo-600 text-white font-black rounded-xl h-10">{t('duelResult.rematch.accept')}</Button>
                  <Button onClick={() => setShowBotProposal(false)} variant="ghost" className="flex-1 text-slate-400 font-bold rounded-xl h-10">{t('duelResult.rematch.decline')}</Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                  <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 8, ease: "linear" }} onAnimationComplete={() => setShowBotProposal(false)} className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {myAnswers.length > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="questions" className="border-none">
                <AccordionTrigger className="px-5 py-4 hover:no-underline bg-muted/30 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-indigo-500" />
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">{t('duelResult.review.title')}</h3>
                      <p className="text-xs text-muted-foreground">{t('duelResult.stats.correct', { count: results.myCorrect, total: totalQuestions })}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-border/50">
                    {myAnswers.map((answer, idx) => (
                      <div key={idx} onClick={() => handleQuestionClick(answer)} className="p-4 hover:bg-muted/50 cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", answer.is_correct ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600")}>{idx + 1}</div>
                          <p className="text-sm text-foreground/90 line-clamp-2">{answer.duel_questions?.question_snapshot?.[`question_${language}`] || answer.duel_questions?.question_snapshot?.question_ru || answer.duel_questions?.[`question_${language}`] || answer.duel_questions?.question_ru || t('duelResult.review.question')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {answer.is_correct ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )}

        {results && myAnswers.filter(a => !a.is_correct).length > 0 && (
          <div className="mt-4">
            <SmartDebriefCard
              failedQuestions={myAnswers.filter(a => !a.is_correct).map(ans => {
                const q = ans.duel_questions;
                const snapshot = q?.question_snapshot;
                const correctOption = snapshot?.answer_options?.find((opt: any) => opt.is_correct);
                const selectedOption = snapshot?.answer_options?.find((opt: any) => opt.id === ans.selected_option_id);
                return {
                  questionId: ans.question_id,
                  questionText: snapshot?.[`question_${language}`] || snapshot?.question_ru || q?.[`question_${language}`] || q?.question_ru || t('duelResult.review.question'),
                  userAnswer: selectedOption?.[`text_${language}`] || selectedOption?.text_ru || '---',
                  correctAnswer: correctOption?.[`text_${language}`] || correctOption?.text_ru || '---',
                  topic: snapshot?.topics?.[`title_${language}`] || snapshot?.topics?.title_ru || 'Topic',
                  explanation: snapshot?.[`explanation_${language}`] || snapshot?.explanation_ru || q?.[`explanation_${language}`] || q?.explanation_ru || '',
                  imageUrl: snapshot?.image_url || q?.image_url || null,
                };
              })}
              country={language === 'ru' ? 'russia' : 'spain'} 
            />
          </div>
        )}

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="space-y-4 pt-4">
          {canShareToStory() && (
            <Button onClick={handleShareToStory} size="lg" className={cn("w-full font-bold h-14 rounded-2xl relative overflow-hidden text-white", results.isWinner ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" : "bg-slate-500")}>
              <Share2 className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">{t('duelResult.actions.shareToStory')}</span>
            </Button>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => { clearActiveDuel(); clearDuelResultSnapshot(); onRematch(results.isBot, { id: results.opponentId, name: results.opponentName, isBot: results.isBot }); }} size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold h-14 rounded-2xl">
              <Swords className="w-5 h-5 mr-2" />
              {results.isBot ? t('duelResult.actions.rematch') : t('duelResult.actions.challengeRematch')}
            </Button>
            <Button onClick={() => { clearActiveDuel(); clearDuelResultSnapshot(); if (!isPremium) setShouldShowInterstitial(true); setTimeout(onBackToMenu, 100); }} size="lg" variant="ghost" className="bg-slate-100 dark:bg-white/10 font-bold h-14 rounded-2xl">
              <Home className="w-5 h-5 mr-2" />
              {t('duelResult.actions.backToMenu')}
            </Button>
          </div>
        </motion.div>
      </div>

      {showAIWidget && selectedQuestion && (
        <AIWidget
          id={selectedQuestion?.duel_questions?.id || selectedQuestion?.id}
          question={selectedQuestion?.question_snapshot?.[`question_${language}`] || selectedQuestion?.question_snapshot?.question_ru || selectedQuestion?.[`question_${language}`] || selectedQuestion?.question_ru || ''}
          correctAnswer={selectedQuestion?.duel_questions?.correct_answer || ''}
          isCorrect={selectedQuestion?.is_correct || false}
        />
      )}
    </div>
  );
}
