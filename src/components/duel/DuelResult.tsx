import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Home, Share2, Sparkles, Target, Zap, Award, TrendingUp, Coins, CheckCircle2, XCircle, Shield, Star, Gift, Flame, ChevronRight, RefreshCw, ChevronDown } from 'lucide-react';
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
import { useVignetteBanner } from '@/hooks/useVignetteBanner';
import { useInterstitialBanner } from '@/hooks/useInterstitialBanner';
import { usePremium } from '@/hooks/usePremium';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import type { DuelResultSnapshot } from '@/features/duel/shared';
import { isTelegramMiniApp, getTelegramWebApp, canShareToStory, hasTelegramPremium } from '@/lib/telegram';
import { generateDuelResultImage } from '@/utils/generateDuelResultImage';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = import.meta.env.DEV;

interface DuelResultProps {
  duelId: string;
  onRematch: () => void;
  onBackToMenu: () => void;
  // 🆕 CRITICAL FIX: Передача данных напрямую из памяти (минуя localStorage)
  // Это решает race condition на мобильных устройствах
  initialSnapshot?: DuelResultSnapshot | null;
}

// Разные варианты эффектов фейерверков/салютов
const confettiEffects = [
  // Эффект 1: Классический золотой салют
  { numberOfPieces: 200, gravity: 0.25, colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493'] },
  // Эффект 2: Радужный фейерверк
  { numberOfPieces: 300, gravity: 0.3, colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'] },
  // Эффект 3: Синий-фиолетовый взрыв
  { numberOfPieces: 250, gravity: 0.2, colors: ['#4A90E2', '#7B68EE', '#9370DB', '#BA55D3'] },
  // Эффект 4: Зеленый-желтый салют
  { numberOfPieces: 350, gravity: 0.35, colors: ['#32CD32', '#ADFF2F', '#FFD700', '#FFA500'] },
  // Эффект 5: Розово-красный фейерверк
  { numberOfPieces: 280, gravity: 0.28, colors: ['#FF69B4', '#FF1493', '#DC143C', '#FF6347'] },
  // Эффект 6: Многоцветный взрыв
  { numberOfPieces: 400, gravity: 0.4, colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'] },
];

export function DuelResult({ duelId, onRematch, onBackToMenu, initialSnapshot }: DuelResultProps) {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const [shouldShowInterstitial, setShouldShowInterstitial] = useState(false);
  const { clearActiveDuel } = useActiveDuel();

  // 🎯 ГИБРИДНАЯ ЛОГИКА: Восстанавливаем snapshot из localStorage при монтировании (если нет в props)
  // Это решает проблему reload - если пользователь перезагрузил страницу, snapshot будет восстановлен
  const [restoredSnapshot, setRestoredSnapshot] = useState<DuelResultSnapshot | null>(null);

  useEffect(() => {
    // Если нет initialSnapshot в props (reload scenario), пытаемся восстановить из localStorage
    if (!initialSnapshot && duelId) {
      const savedSnapshot = loadDuelResultSnapshot(duelId);
      if (savedSnapshot && savedSnapshot.duelId === duelId) {
        console.log('[DuelResult] ✅ Restored snapshot from localStorage (reload recovery)');
        setRestoredSnapshot(savedSnapshot);
      }
    }
  }, [duelId, initialSnapshot]);

  // 🎯 Используем каскад: initialSnapshot (props) -> restoredSnapshot (localStorage) -> null (server fetch)
  // useDuelResults сам обработает этот каскад внутри
  const effectiveSnapshot = initialSnapshot || restoredSnapshot;

  // 🔍 DEBUG: Логируем состояние snapshot для отладки проблемы с Telegram
  console.log('[DuelResult] 📊 Snapshot status:', {
    hasInitialSnapshot: !!initialSnapshot,
    hasRestoredSnapshot: !!restoredSnapshot,
    hasEffectiveSnapshot: !!effectiveSnapshot,
    duelId,
    profileId
  });

  const { data: duelResultsData, isLoading: loading, refetch, error } = useDuelResults(duelId, profileId, effectiveSnapshot);

  // 🔍 DEBUG: Логируем состояние загрузки
  console.log('[DuelResult] 📊 Loading status:', {
    loading,
    hasData: !!duelResultsData,
    hasResults: !!duelResultsData?.results,
    error: error?.message
  });

  // 🔍 DEBUG: Логируем состояние shareToStory для диагностики проблемы
  const webAppDebug = getTelegramWebApp();
  console.log('[DuelResult] 📊 ShareToStory Debug:', {
    isTelegramMiniApp: isTelegramMiniApp(),
    hasTelegramPremium: hasTelegramPremium(),
    hasShareToStoryAPI: !!webAppDebug?.shareToStory,
    canShareToStory: canShareToStory(),
    webAppVersion: webAppDebug?.version,
    userIsPremium: webAppDebug?.initDataUnsafe?.user?.is_premium,
    userData: webAppDebug?.initDataUnsafe?.user ? {
      id: webAppDebug.initDataUnsafe.user.id,
      username: webAppDebug.initDataUnsafe.user.username,
      is_premium: webAppDebug.initDataUnsafe.user.is_premium
    } : null
  });

  // Выбираем случайный эффект фейерверка при монтировании компонента
  const [selectedConfettiEffect] = useState(() => {
    return confettiEffects[Math.floor(Math.random() * confettiEffects.length)];
  });

  // 🆕 FIX: Очищаем snapshot при размонтировании компонента (выход с экрана результатов)
  useEffect(() => {
    return () => {
      if (duelId) {
        clearDuelResultSnapshot();
        console.log('[DuelResult] ✅ Snapshot cleared on exit');
      }
    };
  }, [duelId]);

  // 🆕 FIX: Обработка Telegram BackButton на экране результатов
  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    const webApp = getTelegramWebApp();
    if (!webApp || !webApp.BackButton) return;

    // Показываем BackButton
    webApp.BackButton.show();

    const handleBack = () => {
      console.log('[DuelResult] BackButton clicked - going back to menu');
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

  // Обновляем состояние при загрузке данных
  useEffect(() => {
    if (duelResultsData) {
      if (!results) setResults(duelResultsData.results);
      if (myAnswers.length === 0) setMyAnswers(duelResultsData.myAnswers);

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
  }, [duelResultsData, duelId, results, myAnswers.length]);

  // Получаем общее количество вопросов из данных дуэли
  const totalQuestions = duelResultsData?.duel?.num_questions || myAnswers.length || 10;

  // Показываем Vignette Banner после завершения дуэли (только в веб-версии, один раз за сессию)
  // Задержка 1.5 секунды, чтобы не перекрывать анимацию результатов
  useVignetteBanner(!!results, 1500);

  // Показываем Interstitial Banner при возврате в меню (только в веб-версии, один раз за сессию)
  useInterstitialBanner(shouldShowInterstitial, 300);

  useEffect(() => {
    if (results && profileId && !rewardsAppliedRef.current) {
      rewardsAppliedRef.current = true;

      // 🏁 Сразу очищаем активную дуэль из контекста, чтобы в меню вернулась кнопка "Игры"
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

            // 🔄 FORCE REFRESH: Invalidate profile data after rewards
            queryClient.invalidateQueries({ queryKey: ["profile-data"] });
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

  // Вибрация при завершении анимации счетчика (через 1.5 секунды после появления результатов)
  useEffect(() => {
    if (results && !counterAnimationCompleteRef.current) {
      counterAnimationCompleteRef.current = true;
      const timer = setTimeout(() => {
        // Вибрация успеха при завершении анимации счетчика
        haptics.correctAnswer();
      }, 1500); // Время анимации счетчика

      return () => clearTimeout(timer);
    }
  }, [results]);

  // Вычисляем bonusCoins из results
  useEffect(() => {
    if (results) {
      // КРИТИЧНО: Награды должны совпадать с логикой на бэкенде (duel-manager/index.ts)
      // Для дуэлей без ставок: Победа = 20 монет, Ничья = 10 монет
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
    if (!results || !isTelegramMiniApp()) {
      return;
    }

    const webApp = getTelegramWebApp();
    if (!webApp) {
      toast.error('Telegram WebApp недоступен');
      return;
    }

    // Проверяем доступность shareToStory (доступна с версии 7.8+)
    if (!webApp.shareToStory) {
      toast.error('Обновите Telegram для публикации в Stories');
      return;
    }

    try {
      // Показываем загрузку
      toast.loading('Генерируем изображение...', { id: 'share-story' });

      // Генерируем изображение результата
      const imageDataUrl = await generateDuelResultImage({
        myScore: results.myScore,
        opponentScore: results.opponentScore,
        opponentName: results.opponentName || 'Оппонент',
        isWinner: results.isWinner,
        isDraw: results.isDraw,
      });

      // Telegram shareToStory требует URL медиа (для data URL используем media_url напрямую)
      // Документация: https://core.telegram.org/bots/webapps#sharetostory
      const shareText = results.isWinner
        ? `Я выиграл со счетом ${results.myScore}:${results.opponentScore}! 🏆`
        : results.isDraw
          ? `Ничья ${results.myScore}:${results.opponentScore}! 🤝`
          : `Результат: ${results.myScore}:${results.opponentScore}`;

      console.log('[DuelResult] Calling shareToStory with image length:', imageDataUrl.length);

      // Вызываем shareToStory (синтаксис: media_url, optional_params)
      webApp.shareToStory(imageDataUrl, {
        text: shareText,
        widget_link: {
          url: 'https://t.me/dgt_prep_bot',
          name: 'Попробуй обыграть меня!'
        }
      });

      toast.success('Открываем редактор Stories...', { id: 'share-story' });
    } catch (error) {
      console.error('[DuelResult] Error sharing to story:', error);
      toast.error('Не удалось поделиться в Stories', { id: 'share-story' });
    }
  };

  if (loading || (!results && !error)) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse text-lg font-medium">Подсчитываем результаты...</p>
          <p className="text-xs text-muted-foreground/60">Это может занять несколько секунд</p>

          {/* Скрытая кнопка сброса через 10 секунд ожидания */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5 }}
          >
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
              Загрузить принудительно
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !results) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-6 px-6 max-w-sm">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Ошибка загрузки</h2>
            <p className="text-muted-foreground">Не удалось получить результаты дуэли. Попробуйте обновить данные.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => refetch()} className="w-full">
              Повторить попытку
            </Button>
            <Button variant="outline" onClick={onBackToMenu} className="w-full">
              Вернуться в меню
            </Button>
          </div>
          {isDev && (
            <p className="text-[10px] text-muted-foreground/40 font-mono break-all">
              {error instanceof Error ? error.message : JSON.stringify(error)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full z-10 bg-background overflow-x-hidden pt-0 pb-24">

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
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }}
            />
          )}
        </AnimatePresence>

        {/* Header - Animated Result Status */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: -50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.7, bounce: 0.4 }}
          className="text-center space-y-4 relative pt-0"
        >
          {/* Animated Trophy/Icon - Classic Bounce Animation Only */}
          <motion.div
            animate={results.isWinner ? {
              y: [0, -10, 0],
              rotate: [0, -3, 3, -3, 0],
              scale: [1, 1.05, 1]
            } : results.isDraw ? {
              y: [0, -5, 0],
              scale: [1, 1.03, 1]
            } : {
              y: [0, -3, 0],
              scale: [1, 0.98, 1]
            }}
            transition={{
              duration: results.isWinner ? 3 : 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative inline-block"
          >
            {results.isWinner && (
              <div className="relative">
                {/* Упрощенное статичное свечение для кубка */}
                <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-3xl" style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }} />
                <Trophy className="relative h-24 w-24 mx-auto text-yellow-600 dark:text-yellow-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
              </div>
            )}
            {!results.isWinner && !results.isDraw && (
              <div className="relative">
                {/* Subtle glow for defeat */}
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/20 to-zinc-600/20 blur-2xl opacity-30" />
                <motion.div
                  className="text-7xl md:text-8xl relative z-10"
                  animate={{
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  😔
                </motion.div>
              </div>
            )}
            {results.isDraw && (
              <div className="relative">
                {/* Subtle glow for draw */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-2xl opacity-30" />
                <motion.div
                  className="text-7xl md:text-8xl relative z-10"
                  animate={{
                    opacity: [0.7, 0.9, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🤝
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Status Text */}
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
              style={results.isWinner ? { backgroundSize: "200% 100%" } : {}}
            >
              {results.isWinner ? 'Победа!' : results.isDraw ? 'Ничья!' : 'Поражение'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "text-lg md:text-xl font-medium",
                results.isWinner && "text-yellow-500/90 dark:text-yellow-400/80",
                results.isDraw && "text-blue-500/90 dark:text-blue-400/80",
                !results.isWinner && !results.isDraw && "text-muted-foreground"
              )}
            >
              {results.isWinner ? 'Отличная игра!' : results.isDraw ? 'Вы на равных' : 'Попробуй ещё раз!'}
            </motion.p>
          </div>
        </motion.div>

        {/* Score Cards - Premium Glassmorphism Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative group"
          >
            {/* Hover Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Premium Glass Card - улучшено для светлой темы */}
            <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] p-6 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />

              <div className="text-center space-y-3 relative z-10">
                <AnimatedCounter
                  value={results.myScore}
                  duration={1500}
                  className="text-6xl font-black bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 dark:from-blue-400 dark:via-blue-300 dark:to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
                <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Вы</div>
                <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{results.myCorrect}/{totalQuestions}</span>
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
            {/* Hover Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Premium Glass Card - улучшено для светлой темы */}
            <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] p-6 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />

              {/* Subtle animated background */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/20 rounded-full blur-3xl"
              />

              <div className="text-center space-y-3 relative z-10">
                <AnimatedCounter
                  value={results.opponentScore}
                  duration={1500}
                  className="text-6xl font-black text-slate-600 dark:text-zinc-300 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                />
                <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 truncate px-2 max-w-[150px] md:max-w-none mx-auto" title={results.opponentName}>{results.opponentName}</div>
                <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10">
                  <Target className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{results.opponentCorrect}/{totalQuestions}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Rewards Section - Premium Glassmorphism with Sparkles */}
        {rewards && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-[32px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {/* Animated background gradient */}
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-blue-500/5 opacity-40 rounded-[32px] overflow-hidden"
              style={{ backgroundSize: "200% 200%" }}
            />

            {/* Subtle mesh gradient overlay */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />

            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                </motion.div>
                <h3 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Награды
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Season Points */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-200 dark:border-blue-500/30 text-center space-y-2 overflow-hidden group"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Rotating glow orb */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"
                  />

                  {/* Sparkle effect on icon */}
                  <div className="relative z-10">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full blur-md" />
                    </motion.div>
                    <Star className="relative z-10 w-8 h-8 text-blue-400 mx-auto fill-blue-500/20 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                  </div>

                  <div className="relative z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Season Points</div>
                  <AnimatedCounter
                    value={rewards.sp}
                    duration={1500}
                    prefix="+"
                    className="relative z-10 text-3xl font-black bg-gradient-to-br from-blue-400 to-blue-300 bg-clip-text text-transparent"
                  />
                </motion.div>

                {/* XP */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative bg-slate-100 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-indigo-200 dark:border-indigo-500/30 text-center space-y-2 overflow-hidden group"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Rotating glow orb */}
                  <motion.div
                    animate={{ rotate: [360, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl"
                  />

                  {/* Sparkle effect on icon */}
                  <div className="relative z-10">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full blur-md" />
                    </motion.div>
                    <Zap className="relative z-10 w-8 h-8 text-indigo-400 mx-auto fill-indigo-500/20 drop-shadow-[0_0_15px_rgba(129,140,248,0.6)]" />
                  </div>

                  <div className="relative z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Опыт</div>
                  <AnimatedCounter
                    value={rewards.xp}
                    duration={1500}
                    prefix="+"
                    className="relative z-10 text-3xl font-black bg-gradient-to-br from-indigo-400 to-indigo-300 bg-clip-text text-transparent"
                  />
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
            className="bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-border/50 dark:border-white/10 overflow-hidden shadow-lg"
          >
            <div className="p-4 border-b border-border/50 dark:border-white/10 bg-muted/30 dark:bg-white/5 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h3 className="font-bold text-foreground">Ставка</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center bg-muted/30 dark:bg-white/5 rounded-xl p-3">
                <span className="text-muted-foreground font-medium">Ваша ставка:</span>
                <span className="font-bold text-red-500 dark:text-red-400">-{results.betAmount}</span>
              </div>

              {results.isWinner && (
                <>
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex justify-between items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-3 border border-green-500/30 dark:border-green-500/30"
                  >
                    <span className="font-bold text-green-600 dark:text-green-400">Выигрыш:</span>
                    <span className="font-black text-2xl text-green-600 dark:text-green-400">+{results.winnings}</span>
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
                <div className="flex justify-between items-center bg-red-500/10 rounded-xl p-3 border border-red-500/30 dark:border-red-500/20">
                  <span className="font-bold text-red-600 dark:text-red-400">Проигрыш:</span>
                  <span className="font-black text-2xl text-red-600 dark:text-red-400">-{results.betAmount}</span>
                </div>
              )}

              {results.isDraw && (
                <div className="flex justify-between items-center bg-blue-500/10 rounded-xl p-3 border border-blue-500/30 dark:border-blue-500/20">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Возврат:</span>
                  <span className="font-black text-2xl text-blue-600 dark:text-blue-400">+{results.betAmount}</span>
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
            className="bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-border/50 dark:border-white/10 overflow-hidden shadow-lg"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="questions" className="border-none">
                <AccordionTrigger className="px-5 py-4 hover:no-underline bg-muted/30 dark:bg-white/5 border-b border-border/50 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Trophy className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">Обзор вопросов</h3>
                      <p className="text-xs text-muted-foreground">{results.myCorrect} правильных из {totalQuestions}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-border/50 dark:divide-white/5">
                    {myAnswers.map((answer, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleQuestionClick(answer)}
                        className="p-4 hover:bg-muted/50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              answer.is_correct ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                            )}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground/90 line-clamp-2">
                                {answer.duel_questions?.question_snapshot?.question_ru ||
                                  answer.duel_questions?.question_ru ||
                                  'Вопрос'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {answer.is_correct ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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

        {/* Action Buttons - Premium with Shine Effect */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-4 pt-4"
        >
          {/* Share to Story Button - показываем только если canShareToStory() = true */}
          {/* Требования: Telegram Mini App + Telegram Premium + shareToStory API */}
          {canShareToStory() && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                onClick={handleShareToStory}
                size="lg"
                className={cn(
                  "relative w-full font-bold h-14 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all border-0 overflow-hidden text-white",
                  results.isWinner && "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-400 hover:via-purple-400 hover:to-indigo-400",
                  results.isDraw && "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400",
                  !results.isWinner && !results.isDraw && "bg-gradient-to-r from-slate-500 via-slate-600 to-slate-500 hover:from-slate-400 hover:via-slate-500 hover:to-slate-400"
                )}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                />
                <div className="relative z-10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 mr-2" />
                  Поделиться в Stories
                </div>
              </Button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => {
                // 🆕 CRITICAL FIX: Очищаем activeDuel при выходе с экрана результатов (Delayed Cleanup)
                console.log('[DuelResult] 🧹 Cleaning up activeDuel on rematch');
                clearActiveDuel();
                clearDuelResultSnapshot();
                onRematch();
              }}
              size="lg"
              className="relative w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 hover:from-blue-400 hover:via-indigo-400 hover:to-violet-400 text-white font-bold h-14 rounded-2xl shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] border-0 overflow-hidden"
            >
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />
              <div className="relative z-10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 mr-2" />
                Реванш
              </div>
            </Button>

            <Button
              onClick={() => {
                // 🆕 CRITICAL FIX: Очищаем activeDuel при выходе с экрана результатов (Delayed Cleanup)
                console.log('[DuelResult] 🧹 Cleaning up activeDuel on back to menu');
                clearActiveDuel();
                clearDuelResultSnapshot();

                // Показываем Interstitial при возврате в меню (только для обычных пользователей, один раз за сессию)
                if (!isPremium) {
                  setShouldShowInterstitial(true);
                }
                // Небольшая задержка для показа Interstitial перед навигацией
                setTimeout(() => {
                  onBackToMenu();
                }, 100);
              }}
              size="lg"
              variant="outline"
              className="border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 font-bold h-14 rounded-2xl backdrop-blur-sm shadow-sm"
            >
              <Home className="w-5 h-5 mr-2" />
              В меню
            </Button>
          </div>
        </motion.div>
      </div>

      {/* AI Widget */}
      {showAIWidget && selectedQuestion && (
        <AIWidget
          question={selectedQuestion?.question_snapshot?.question_ru || selectedQuestion?.question_ru || 'Вопрос'}
          correctAnswer={selectedQuestion?.duel_questions?.correct_answer || ''}
          isCorrect={selectedQuestion?.is_correct || false}
        />
      )}
    </div>
  );
}
