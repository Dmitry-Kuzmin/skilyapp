import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Swords, Trophy, LogIn, Sparkles, Zap, Target, TrendingUp, Loader2, Copy, Check, Hash, Minus, Plus, ArrowLeft, X, Coins, DollarSign, Gift } from 'lucide-react';
import { getHumanReadableError, extractErrorFromResponse } from '@/utils/errorMessages';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelCreateModal } from '@/components/duel/DuelCreateModal';
import { DuelJoinModal } from '@/components/duel/DuelJoinModal';
import { DuelBattleFullscreen } from '@/components/duel/DuelBattleFullscreen';
import { DuelResult } from '@/components/duel/DuelResult';
import { DuelWaitingReplay } from '@/components/duel/DuelWaitingReplay';
import { AuthModal } from '@/components/AuthModal';
import { useUserContext } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { isTelegramMiniApp } from '@/lib/telegram';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { Users, Clock, Share2 } from 'lucide-react';
import { BoostShopModal } from '@/components/shop/BoostShopModal';

type GameMode = 'menu' | 'create' | 'join' | 'battle' | 'result';

export default function Duel() {
  const { isAuthenticated, profileId, user, supabaseUser } = useUserContext();
  const [mode, setMode] = useState<GameMode>('menu');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isBattleHidden, setIsBattleHidden] = useState(false);
  const [hiddenDuelState, setHiddenDuelState] = useState<{
    myScore: number;
    totalQuestions: number;
  } | null>(null);
  const isTelegramUser = isTelegramMiniApp();
  
  // Inline join state
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const hasAutoJoinedRef = useRef(false);
  const [duelPreview, setDuelPreview] = useState<{bet_amount: number; num_questions: number} | null>(null);
  
  // Inline create state
  const [numQuestions, setNumQuestions] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');
  
  // Betting state
  const [betType, setBetType] = useState<'none' | 'fixed' | 'custom'>('none');
  const [betAmount, setBetAmount] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const lowCoinsPromptedRef = useRef(false);
  
  // Use realtime hook when duel is created
  const { state: duelState } = useDuelRealtime(createdCode && duelId ? duelId : null);
  
  // Initialize notifications for duel page
  useNotifications({ showToasts: true, playSounds: true });
  
  // Load user coins
  useEffect(() => {
    const loadCoins = async () => {
      if (!profileId) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', profileId)
        .single();
      
      if (!error && data) {
        setUserCoins(data.coins || 0);
      }
    };
    
    loadCoins();
  }, [profileId]);

  useEffect(() => {
    const suggestLowCoins = async () => {
      const { data } = await supabase.functions.invoke('assistant-suggest', {
        body: { trigger: 'low_coins_in_duel' },
      });
      const message = data?.suggestion?.message;
      if (message) {
        toast.info(message, {
          action: {
            label: 'Купить монеты',
            onClick: () => setShowShop(true),
          },
        });
      }
    };

    if (userCoins > 0 && userCoins < 50 && !lowCoinsPromptedRef.current) {
      lowCoinsPromptedRef.current = true;
      suggestLowCoins();
    }
  }, [userCoins]);
  
  // Check if we're waiting for profile to load
  const isLoadingProfile = (user || supabaseUser) && !profileId;

  const handleDuelCreated = (id: string, code: string) => {
    setDuelId(id);
    setDuelCode(code);
    setMode('create');
  };

  const handleDuelJoined = async (id: string, code: string) => {
    console.log('[Duel] Player joined duel:', id);
    setDuelId(id);
    setDuelCode(code);
    
    // Check if duel is already active (auto-started)
    const { data } = await supabase
      .from('duels')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    
    if (data?.status === 'active') {
      console.log('[Duel] Duel already active, going straight to battle!');
      handleDuelStarted();
    } else {
      console.log('[Duel] Going to lobby to wait for start');
      setMode('create');
    }
  };

  const handleDuelStarted = () => {
    console.log('[Duel] ⚡ DUEL STARTED! Switching to battle mode. DuelId:', duelId);
    
    // Reset hidden state when starting new battle
    setIsBattleHidden(false);
    
    // Immediate state change
    setMode('battle');
    
    // Multiple retries for Telegram reliability
    const retries = [50, 150, 300];
    retries.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`[Duel] Battle mode retry #${index + 1}`);
        setMode('battle');
      }, delay);
    });
  };
  
  // Handle widget expand - restore battle mode when widget is expanded
  // When widget is expanded, we need to restore battle mode
  // The widget is displayed via portal, so we need a way to restore battle
  // We'll use a ref or event listener to detect widget expansion
  // Actually, simpler: add a callback that restores battle mode
  const handleWidgetExpand = () => {
    if (duelId && isBattleHidden) {
      setIsBattleHidden(false);
      setMode('battle');
    }
  };

  const handleDuelFinished = () => {
    console.log('[Duel] 🎯🎯🎯 handleDuelFinished called - transitioning to results', {
      currentMode: mode,
      duelId,
      willSetMode: 'result'
    });
    
    // КРИТИЧНО: Проверяем, что duelId установлен перед переходом к результатам
    if (!duelId) {
      console.error('[Duel] ❌ ERROR: handleDuelFinished called but duelId is null! Cannot show results.');
      toast.error('Ошибка: ID дуэли не найден');
      return;
    }
    
    console.log('[Duel] ✅ duelId is valid, proceeding with mode change...');
    
    // Устанавливаем режим результата - используем функциональное обновление для гарантии
    setMode((currentMode) => {
      console.log('[Duel] 🔄 setMode callback executing. Current mode:', currentMode);
      if (currentMode !== 'result') {
        console.log('[Duel] ✅✅✅ Setting mode to result (was:', currentMode, ')');
        return 'result';
      }
      console.log('[Duel] ⚠️ Mode already set to result, no change needed');
      return currentMode;
    });
    
    console.log('[Duel] ✅ Mode transition initiated, duelId:', duelId);
    
    // Force re-render check after small delay
    setTimeout(() => {
      console.log('[Duel] 🔍 Post-transition check - current mode should be "result"');
    }, 100);
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setDuelId(null);
    setDuelCode(null);
    setIsBattleHidden(false);
    setJoinCode('');
    setCreatedCode(null);
    setCopied(false);
    hasAutoJoinedRef.current = false;
  };

  // Check if user needs to login
  const handleActionClick = (action: () => void) => {
    // For non-Telegram users, require authentication first
    if (!isAuthenticated && !isTelegramUser) {
      setShowAuthModal(true);
      return;
    }
    
    // If we have a user but profileId is still loading, just execute the action
    // The profileId will be checked inside DuelLobby/DuelJoin when they try to invoke the function
    action();
  };

  // Handle inline join
  const handleInlineJoin = async (code: string) => {
    if (!code || code.length !== 4) {
      return;
    }

    if (!profileId) {
      toast.error('Загрузка профиля...');
      return;
    }

    if (hasAutoJoinedRef.current) {
      return;
    }

    hasAutoJoinedRef.current = true;
    setIsJoining(true);

    try {
      console.log('[Duel] ⚡ Invoking join_duel with code:', code);
      
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'join_duel',
          profile_id: profileId,
          code: code.toUpperCase(),
        },
      });

      console.log('[Duel] join_duel response:', { data, error });

      if (error) {
        console.error('[Duel] ❌ join_duel error:', error);
        throw error;
      }

      console.log('[Duel] join_duel data:', {
        auto_started: data.auto_started,
        duel_status: data.duel?.status,
        duel_id: data.duel?.id,
        player_id: data.player?.id
      });

      if (data.auto_started) {
        console.log('[Duel] ✅ AUTO-STARTED = TRUE, duel should be active!');
        toast.success('Дуэль начинается! 🎮');
      } else {
        console.log('[Duel] ⏳ AUTO-STARTED = FALSE, waiting for host to start');
        toast.success('Вы присоединились! Ожидание старта...');
      }

      handleDuelJoined(data.duel.id, data.duel.code);
      setJoinCode('');
      hasAutoJoinedRef.current = false;
      setIsJoining(false);
    } catch (error: any) {
      const extractedError = extractErrorFromResponse(error);
      const humanError = getHumanReadableError(extractedError, 'join');
      
      // Проверяем специальный случай - попытка присоединиться к своей дуэли
      if (extractedError.includes('host') || extractedError.includes('уже являетесь')) {
        toast.error('Вы не можете присоединиться к своей же дуэли. Вы уже являетесь хостом этой дуэли.');
      } else {
        toast.error(humanError);
      }
      
      hasAutoJoinedRef.current = false;
      setIsJoining(false);
      setJoinCode(''); // Clear code on error to allow retry
    }
  };

  // Load duel preview when code is entered
  useEffect(() => {
    const loadDuelPreview = async () => {
      if (joinCode.length === 4 && profileId) {
        try {
          const { data, error } = await supabase
            .from('duels')
            .select('bet_amount, num_questions, bet_type')
            .eq('code', joinCode.toUpperCase())
            .single();
          
          if (!error && data) {
            setDuelPreview({
              bet_amount: (data as any).bet_amount || 0,
              num_questions: (data as any).num_questions || 10
            });
          }
        } catch (e) {
          setDuelPreview(null);
        }
      } else {
        setDuelPreview(null);
      }
    };
    
    loadDuelPreview();
  }, [joinCode, profileId]);
  
  // Auto-join when code is 4 characters (but only if has enough coins for bet)
  useEffect(() => {
    if (joinCode.length === 4 && !isJoining && profileId && !hasAutoJoinedRef.current && (isAuthenticated || isTelegramUser)) {
      // Check if user has enough coins for bet
      if (duelPreview && duelPreview.bet_amount > 0 && userCoins < duelPreview.bet_amount) {
        toast.error(`Недостаточно монет! Нужно ${duelPreview.bet_amount}, у вас ${userCoins}`);
        return;
      }
      
      const timer = setTimeout(() => {
        if (joinCode.length === 4 && !hasAutoJoinedRef.current) {
          handleInlineJoin(joinCode);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode, isJoining, profileId, isAuthenticated, isTelegramUser, duelPreview, userCoins]);

  // Handle inline create
  const handleInlineCreate = async () => {
    if (!profileId) {
      toast.error('Загрузка профиля...');
      return;
    }

    if (isCreating) return;

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'create_duel',
          profile_id: profileId,
          num_questions: numQuestions,
          difficulty: 'mix',
          bet_amount: betAmount,
          bet_type: betType,
        },
      });

      if (error) throw error;
      
      // Reload coins after bet
      if (betAmount > 0) {
        setUserCoins(userCoins - betAmount);
      }

      setCreatedCode(data.duel.code);
      
      // Auto-copy code to clipboard
      try {
        await navigator.clipboard.writeText(data.duel.code);
        setCopied(true);
        toast.success('Дуэль создана! Код скопирован в буфер обмена 🎮');
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
        toast.success('Дуэль создана! 🎮');
      }
      
      // Store duel ID and code for lobby navigation
      setDuelId(data.duel.id);
      setDuelCode(data.duel.code);
      setConnectionStatus('checking');
      setWaitTime(0);
      
      setIsCreating(false);
    } catch (error: any) {
      const extractedError = extractErrorFromResponse(error);
      const humanError = getHumanReadableError(extractedError, 'create');
      toast.error(humanError);
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      toast.success('Код скопирован!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Не удалось скопировать код');
    }
  };

  const handleShare = () => {
    if (createdCode && window.Telegram?.WebApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(`Присоединяйся к дуэли! Код: ${createdCode}`)}`;
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    }
  };

  const handleCancelDuel = async () => {
    if (!duelId || !profileId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'cancel_duel',
          duel_id: duelId,
          profile_id: profileId
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        const refundAmount = data.refunded || 0;
        
        if (refundAmount > 0) {
          toast.success(`Дуэль отменена! Возвращено ${refundAmount} монет`, {
            duration: 3000
          });
          // Update local coin balance
          setUserCoins(prev => prev + refundAmount);
        } else {
          toast.success('Дуэль отменена!', {
            duration: 2000
          });
        }
        
        // Reset state
        setCreatedCode(null);
        setDuelId(null);
        setDuelCode(null);
        setWaitTime(0);
        setConnectionStatus('checking');
      }
    } catch (error: any) {
      console.error('Error canceling duel:', error);
      const errorMsg = error?.message || 'Не удалось отменить дуэль';
      toast.error(errorMsg);
    }
  };

  // Countdown logic
  // УБРАНО: startCountdown - дуэль начинается сразу без задержки

  // Check duel status when created
  useEffect(() => {
    if (!duelId || !createdCode || !profileId) return;

    let isActive = true;
    let checkCount = 0;
    const MAX_CHECKS = 120; // 120 seconds max

    console.log('[Duel] Initializing status check for:', duelId);
    
    const checkStatus = async () => {
      if (!isActive) return;
      
      checkCount++;
      
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'check_status',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (error) {
          console.error('[Duel] Error checking duel status:', error);
          return;
        }

        if (!data || data.error) {
          console.warn('[Duel] Duel not found or no access:', data?.error);
          return;
        }

        console.log('[Duel] Duel status:', data.status);
        
        if (data.status === 'active') {
          console.log('[Duel] ✅ DUEL IS ACTIVE! Starting battle immediately...');
          setConnectionStatus('connected');
          handleDuelStarted();
          isActive = false;
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('[Duel] Exception checking status:', err);
      }
    };

    // Immediate check
    checkStatus();

    // Then check every 500ms
    const interval = setInterval(() => {
      if (checkCount >= MAX_CHECKS || !isActive) {
        clearInterval(interval);
        return;
      }
      checkStatus();
    }, 500);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [duelId, createdCode, profileId]);

  // Handle timer
  useEffect(() => {
    if (!createdCode) return;

    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [createdCode]);

  // УБРАНО: Countdown логика - дуэль начинается сразу когда стартовала

  // Handle opponent joined
  useEffect(() => {
    if (duelState.opponentJoined && createdCode) {
      console.log('[Duel] Opponent joined!');
      toast.success('Противник найден!');
    }
  }, [duelState.opponentJoined, createdCode]);

  // Handle duel started from realtime - сразу переходим к битве
  useEffect(() => {
    if (duelState.duelStarted && createdCode) {
      console.log('[Duel] ✅ Duel started signal from realtime! Starting battle immediately...');
      handleDuelStarted();
    }
  }, [duelState.duelStarted, createdCode]);

  // Fullscreen modes - no Layout/Footer
  // But if hidden, show menu with widget overlay
  if (mode === 'battle' && duelId && !isBattleHidden) {
    return (
      <DuelBattleFullscreen
        duelId={duelId}
        onExit={handleBackToMenu}
        onDuelFinished={handleDuelFinished}
        onHide={() => {
          // When game is hidden, switch to menu mode but keep duelId for widget
          // We need to store the duel state for the widget
          // Load current scores to show in widget
          (async () => {
            if (duelId && profileId) {
              const { data: players } = await supabase
                .from('duel_players')
                .select('score')
                .eq('duel_id', duelId)
                .eq('user_id', profileId)
                .single();
              
              const { data: duel } = await supabase
                .from('duels')
                .select('num_questions')
                .eq('id', duelId)
                .single();
              
              if (players && duel) {
                setHiddenDuelState({
                  myScore: players.score || 0,
                  totalQuestions: duel.num_questions || 10
                });
              }
            }
          })();
          setIsBattleHidden(true);
          setMode('menu');
        }}
        onWidgetExpand={handleWidgetExpand}
      />
    );
  }

  // Lobby also fullscreen without footer
  if (mode === 'create' && duelCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
        <DuelLobby
          duelId={duelId}
          duelCode={duelCode}
          onDuelCreated={handleDuelCreated}
          onDuelStarted={handleDuelStarted}
          onCancel={handleBackToMenu}
        />
      </div>
    );
  }

  return (
    <Layout>
      {/* Render widget when battle is hidden */}
      {isBattleHidden && duelId && hiddenDuelState && (
        <DuelWaitingReplay
          duelId={duelId}
          myScore={hiddenDuelState.myScore}
          totalQuestions={hiddenDuelState.totalQuestions}
          onDuelFinished={handleDuelFinished}
          initialHidden={true}
          onExpand={() => {
            // When widget expands, restore battle mode
            setIsBattleHidden(false);
            setMode('battle');
            setHiddenDuelState(null);
          }}
          onHide={(hidden) => {
            // Track hidden state
            if (!hidden) {
              setIsBattleHidden(false);
              setMode('battle');
            }
          }}
        />
      )}
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1370px]">
      {isLoadingProfile && (
        <Card className="max-w-2xl mx-auto p-6 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold">Загрузка профиля...</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Пожалуйста, подождите</p>
          </div>
        </Card>
      )}

      {!isLoadingProfile && !isAuthenticated && !isTelegramUser && (
        <Card className="max-w-2xl mx-auto p-6 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <LogIn className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Войдите, чтобы играть
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Для участия в дуэлях необходимо авторизоваться
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="px-6 sm:px-8">
            <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Войти
          </Button>
        </Card>
      )}

      {!isLoadingProfile && (isAuthenticated || isTelegramUser) && mode === 'menu' && (
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10 animate-fade-in">

          {/* УБРАНО: Countdown Overlay - дуэль начинается сразу без задержки */}

          {/* Unified Action Card - Premium Design */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
            <Card className="p-0 border border-border/40 shadow-2xl rounded-3xl sm:rounded-[2rem] overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl relative group">
              {/* Premium border glow */}
              <div className="absolute inset-0 rounded-3xl sm:rounded-[2rem] bg-gradient-to-r from-primary/10 via-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
              
              <div className={`grid ${createdCode ? 'md:grid-cols-1' : 'md:grid-cols-2'} divide-y md:divide-y-0 ${createdCode ? '' : 'md:divide-x'} divide-border/30`}>
                {/* Create Duel Section - Premium */}
                <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/80 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-cyan-950/20 overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(16,185,129)_1px,transparent_0)] [background-size:24px_24px]" />
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl -z-10" />
                  
                  <div className="relative space-y-5 sm:space-y-6">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/40 flex-shrink-0 ring-4 ring-emerald-500/20"
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                        <Swords className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10 drop-shadow-md" />
            </motion.div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                          Создать дуэль
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                          Создайте дуэль и пригласите друга на битву знаний
                        </p>
                      </div>
                    </div>

                    {!createdCode ? (
                      <>
                        {/* User coins display */}
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-end gap-2 text-sm"
                        >
                          <Coins className="h-4 w-4 text-amber-500" />
                          <span className="font-bold text-muted-foreground">Ваш баланс:</span>
                          <span className="font-black text-amber-600 dark:text-amber-400">{userCoins}</span>
                          <span className="text-muted-foreground">монет</span>
          </motion.div>

                        <div className="space-y-4">
                          {/* Number of questions */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <motion.div
                              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 }}
                              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/80 dark:bg-emerald-950/40 backdrop-blur-sm border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10 shrink-0 ring-1 ring-emerald-500/20 w-full sm:w-auto"
                            >
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                                disabled={isCreating || numQuestions <= 5}
                                className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation disabled:hover:scale-100"
                              >
                                <Minus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                              </motion.button>
                              <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 min-w-[3rem] text-center px-2">
                                {numQuestions}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                                disabled={isCreating || numQuestions >= 30}
                                className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation disabled:hover:scale-100"
                              >
                                <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                              </motion.button>
                            </motion.div>
                </div>
                          
                          {/* Betting options */}
                    <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="space-y-3"
                    >
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-bold text-muted-foreground">Ставка (опционально)</span>
                </div>
                            
                            {/* Bet type selector */}
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={betType === 'none' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setBetType('none');
                                  setBetAmount(0);
                                }}
                                className="flex-1 text-xs sm:text-sm"
                              >
                                Без ставки
                              </Button>
                              <Button
                                type="button"
                                variant={betType === 'fixed' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBetType('fixed')}
                                className="flex-1 text-xs sm:text-sm"
                              >
                                Фикс.
                              </Button>
                              <Button
                                type="button"
                                variant={betType === 'custom' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBetType('custom')}
                                className="flex-1 text-xs sm:text-sm"
                              >
                                Своя
                              </Button>
                            </div>
                            
                            {/* Fixed bet amounts */}
                            {betType === 'fixed' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-4 gap-2"
                              >
                                {[10, 50, 100, 500].map((amount) => (
                                  <Button
                                    key={amount}
                                    type="button"
                                    variant={betAmount === amount ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setBetAmount(amount)}
                                    disabled={userCoins < amount}
                                    className="text-xs sm:text-sm font-bold"
                                  >
                                    {amount}
                                  </Button>
                                ))}
                              </motion.div>
                            )}
                            
                            {/* Custom bet input */}
                            {betType === 'custom' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                              >
                                <Input
                                  type="number"
                                  min="1"
                                  max={Math.min(userCoins, 10000)}
                                  value={betAmount || ''}
                                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                                  placeholder="Введите сумму"
                                  className="text-center font-bold"
                                />
                                <p className="text-xs text-muted-foreground text-center">
                                  Макс: {Math.min(userCoins, 10000)} монет
                                </p>
                              </motion.div>
                            )}
                            
                            {/* Bet info */}
                            {betAmount > 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50"
                              >
                                <div className="flex items-start gap-2 text-xs">
                                  <DollarSign className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="font-semibold text-foreground">
                                      Банк: <span className="text-amber-600 dark:text-amber-400">{betAmount * 2}</span> монет
                                    </p>
                    <p className="text-muted-foreground">
                                      Победитель: <span className="text-green-600 dark:text-green-400 font-bold">{Math.floor(betAmount * 2 * 0.9)}</span> (комиссия 10%)
                                    </p>
                                    <p className="text-muted-foreground">
                                      При ничьей: ставки переносятся на реванш
                    </p>
              </div>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                          
                          {/* Create button */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="w-full"
                          >
            <Button
              size="lg"
                              onClick={() => handleActionClick(() => handleInlineCreate())}
                              disabled={isCreating || (betType !== 'none' && betAmount <= 0) || (betAmount > userCoins)}
                              className="w-full h-12 text-sm sm:text-base font-black rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 touch-manipulation relative overflow-hidden group"
                            >
                              {/* Shine effect on hover */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              
                              {isCreating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                                  <span className="hidden sm:inline relative z-10">Создание...</span>
                                  <span className="sm:hidden relative z-10">Создание</span>
                                </>
                              ) : (
                                <>
                                  <Swords className="mr-2 h-4 w-4 relative z-10" />
                                  <span className="hidden sm:inline relative z-10">
                                    {betAmount > 0 ? `Создать за ${betAmount} монет` : 'Создать дуэль'}
                                  </span>
                                  <span className="sm:hidden relative z-10">
                                    {betAmount > 0 ? `За ${betAmount}` : 'Создать'}
                                  </span>
                                </>
                              )}
                    </Button>
                          </motion.div>
                  </div>
                      </>
                    ) : (
                      <>
                        {/* Lobby State - Integrated */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, type: "spring" }}
                          className="space-y-5 sm:space-y-6"
                        >
                          {/* Back Button - Premium */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-start mb-2"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCreatedCode(null);
                                setDuelId(null);
                                setDuelCode(null);
                                setWaitTime(0);
                                setConnectionStatus('checking');
                              }}
                              className="text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent rounded-xl px-4 py-2 transition-all duration-200 group/back"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2 group-hover/back:-translate-x-1 transition-transform duration-200" />
                              <span className="text-sm font-semibold">Назад</span>
                            </Button>
            </motion.div>

                          {/* Connection status */}
            <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-2 text-sm"
            >
                            <motion.div
                              className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}
                              animate={connectionStatus === 'connected' ? {} : { scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                              {connectionStatus === 'connected' ? 'Подключено к серверу' : 'Подключение...'}
                            </span>
                          </motion.div>

                          {/* Header */}
                          <div className="text-center space-y-4 sm:space-y-5">
                            <motion.div
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/50 ring-4 ring-emerald-500/20 relative"
                            >
                              {/* Pulse effect */}
                              <div className="absolute inset-0 rounded-3xl bg-emerald-500/30 animate-ping" />
                              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-white relative z-10" />
                            </motion.div>
                            <div className="space-y-2">
                              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                Ожидание соперника
                              </h3>
                              <p className="text-base sm:text-lg text-muted-foreground/80 font-medium">Поделитесь кодом с другом</p>
                    </div>
                          </div>

                          {/* Code Display - Enhanced Premium */}
                    <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="relative"
                          >
                            {/* Enhanced glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-cyan-500/40 blur-3xl opacity-70 rounded-3xl animate-pulse" />
                            <motion.div
                              animate={{
                                boxShadow: [
                                  '0 0 30px rgba(16, 185, 129, 0.4)',
                                  '0 0 60px rgba(20, 184, 166, 0.5)',
                                  '0 0 30px rgba(16, 185, 129, 0.4)',
                                ],
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="relative bg-gradient-to-br from-white/95 via-emerald-50/90 to-teal-50/90 dark:from-emerald-950/50 dark:via-emerald-950/40 dark:to-teal-950/40 backdrop-blur-xl p-10 sm:p-12 rounded-3xl border-2 border-emerald-500/50 ring-4 ring-emerald-500/10"
                    >
                              <motion.div
                                key={createdCode}
                                initial={{ scale: 1.2, opacity: 0, rotateY: 180 }}
                                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.6, type: "spring" }}
                                className="text-6xl sm:text-7xl md:text-8xl font-black tracking-[0.25em] mb-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent text-center drop-shadow-lg"
                              >
                                {createdCode}
                              </motion.div>
                              <div className="flex items-center justify-center gap-3 text-sm sm:text-base text-muted-foreground font-bold uppercase tracking-widest">
                                <motion.div
                                  animate={{ rotate: [0, 360] }}
                                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                >
                                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                                </motion.div>
                                Код дуэли
                                <motion.div
                                  animate={{ rotate: [360, 0] }}
                                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                >
                                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                    </motion.div>
                </div>
                            </motion.div>
                          </motion.div>

                          {/* Action Buttons - Premium */}
                          <div className="flex flex-col sm:flex-row gap-3 justify-center px-2">
                            <motion.div
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 max-w-xs mx-auto sm:mx-0"
                            >
            <Button
                                onClick={handleCopyCode}
                      variant="outline"
                                size="lg"
                                className="w-full h-12 sm:h-14 text-sm sm:text-base font-black border-2 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-xl"
                    >
                                <Copy className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                                Копировать код
                    </Button>
                            </motion.div>
                            {isTelegramUser && (
                              <motion.div
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 max-w-xs mx-auto sm:mx-0"
                              >
                                <Button
                                  onClick={handleShare}
                                  size="lg"
                                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-black bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                  <Share2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 relative z-10" />
                                  <span className="relative z-10">Поделиться</span>
                                </Button>
                              </motion.div>
                            )}
                </div>

                          {/* Cancel Button */}
                          {!duelState.opponentJoined && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="flex justify-center"
                            >
                              <Button
                                onClick={handleCancelDuel}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Отменить дуэль
                              </Button>
                            </motion.div>
                          )}

                          {/* Stats - Premium */}
                          <div className="flex items-center justify-center gap-4 sm:gap-6 text-base pt-4">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                              className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 dark:from-emerald-500/15 dark:to-teal-500/15 px-5 sm:px-7 py-3 sm:py-4 rounded-2xl border-2 border-emerald-500/40 shadow-lg backdrop-blur-sm"
                            >
                              <div className="p-2 rounded-xl bg-emerald-500/20">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-xl sm:text-2xl text-emerald-700 dark:text-emerald-300">{duelState.opponentJoined ? '2' : '1'}</span>
                                <span className="text-muted-foreground/60 text-lg">/</span>
                                <span className="font-black text-xl sm:text-2xl text-emerald-700 dark:text-emerald-300">2</span>
                              </div>
                              <span className="text-muted-foreground text-xs sm:text-sm font-medium">игроков</span>
                            </motion.div>
                            <motion.div
                              initial={{ scale: 0, rotate: 180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                              className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-500/25 to-cyan-500/25 dark:from-blue-500/15 dark:to-cyan-500/15 px-5 sm:px-7 py-3 sm:py-4 rounded-2xl border-2 border-blue-500/40 shadow-lg backdrop-blur-sm"
                            >
                              <div className="p-2 rounded-xl bg-blue-500/20">
                                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-mono font-black text-xl sm:text-2xl text-blue-700 dark:text-blue-300">
                                {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
                              </span>
            </motion.div>
          </div>

                          {/* Opponent Joined Animation - Premium */}
                          <AnimatePresence>
                            {duelState.opponentJoined && (
          <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="relative bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-500/30 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-green-500/20 border-2 border-green-500/60 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-green-500/30 overflow-hidden"
                              >
                                {/* Animated background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-green-400/20 animate-pulse" />
                                
                                <motion.div
                                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="flex items-center justify-center gap-4 mb-4 relative z-10"
                                >
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
                                  </motion.div>
                                  <p className="text-green-700 dark:text-green-300 font-black text-2xl sm:text-3xl">
                                    Соперник найден!
                                  </p>
                                  <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
                                  </motion.div>
                                </motion.div>
                                <motion.p
                                  initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="text-foreground/90 font-bold text-base sm:text-lg text-center relative z-10"
                                >
                                  Приготовьтесь к битве! Битва начнется через 3 секунды... ⚔️
                                </motion.p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Loading Animation when waiting - Premium */}
                          {!duelState.opponentJoined && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col items-center justify-center gap-3 py-4"
                            >
                              <motion.div
                                animate={{ 
                                  rotate: 360,
                                  scale: [1, 1.2, 1]
                                }}
                                transition={{ 
                                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                                }}
                                className="p-3 rounded-full bg-emerald-500/10"
                              >
                                <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500" />
                              </motion.div>
                              <div className="flex items-center gap-2">
                                <motion.span
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="text-sm sm:text-base font-semibold text-muted-foreground"
                                >
                                  Ожидание соперника
                                </motion.span>
                                <motion.span
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                                >
                                  ...
                                </motion.span>
                </div>
                            </motion.div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>

                {/* Join Duel Section - Premium (Hidden when duel is created) */}
                {!createdCode && (
                <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-yellow-950/20 overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(251,191,36)_1px,transparent_0)] [background-size:24px_24px]" />
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl -z-10" />
                  
                  <div className="relative space-y-5 sm:space-y-6">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/40 flex-shrink-0 ring-4 ring-amber-500/20"
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                        <LogIn className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10 drop-shadow-md" />
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-1.5 bg-gradient-to-r from-amber-700 to-orange-700 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                          Присоединиться
            </h3>
                        <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                          Введите код дуэли от друга и начните битву
                        </p>
                  </div>
                  </div>

                    <div className="space-y-4 sm:space-y-5">
                      <div className="space-y-3">
                        <Label htmlFor="join-code" className="text-sm sm:text-base font-bold text-foreground/90">
                          Код дуэли
                        </Label>
                        <div className="relative">
                          {/* Premium input container */}
                          <div className="relative group">
                            <Input
                              id="join-code"
                              placeholder="AB12"
                              value={joinCode}
                              onChange={(e) => {
                                const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                                setJoinCode(newCode);
                                hasAutoJoinedRef.current = false;
                              }}
                              maxLength={4}
                              disabled={isJoining || (!isAuthenticated && !isTelegramUser)}
                              className="text-center text-2xl sm:text-3xl md:text-4xl tracking-[0.25em] sm:tracking-[0.3em] font-black h-14 sm:h-16 bg-white/90 dark:bg-amber-950/30 backdrop-blur-sm border-2 border-amber-300/50 dark:border-amber-700/50 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl disabled:opacity-50 touch-manipulation shadow-xl shadow-amber-500/10 transition-all duration-300 placeholder:text-amber-300/50 dark:placeholder:text-amber-700/50"
                              autoFocus={false}
                            />
                            {/* Glow effect on focus */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
                            
                            {isJoining && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2"
                              >
                                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-amber-600 dark:text-amber-400" />
                              </motion.div>
                            )}
                </div>
                          
                          {/* Premium indicators */}
                          <div className="flex justify-center gap-2 sm:gap-2.5 pt-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.1, type: "spring" }}
                                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                                  i < joinCode.length
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 w-8 sm:w-10 shadow-lg shadow-amber-500/50'
                                    : 'bg-amber-200/50 dark:bg-amber-900/30 w-2 sm:w-2.5'
                                }`}
                              />
                            ))}
              </div>
                          
                          <motion.p 
                            animate={{ opacity: joinCode.length === 4 ? 1 : 0.6 }}
                            className="text-xs sm:text-sm text-center text-muted-foreground/80 pt-2 px-2 font-medium"
                          >
                            {joinCode.length < 4 ? 'Введите 4 символа' : joinCode.length === 4 ? '✨ Автоприсоединение...' : ''}
                          </motion.p>
                  </div>
                </div>

                      {/* Bet Warning / Preview */}
                      <AnimatePresence>
                        {duelPreview && duelPreview.bet_amount > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`p-4 sm:p-5 rounded-2xl border-2 ${
                              userCoins >= duelPreview.bet_amount
                                ? 'bg-gradient-to-br from-amber-100/60 via-orange-100/40 to-yellow-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 border-amber-500/40'
                                : 'bg-gradient-to-br from-red-100/60 via-red-50/40 to-red-100/60 dark:from-red-950/30 dark:via-red-950/20 dark:to-red-950/30 border-red-500/40'
                            } backdrop-blur-sm shadow-lg`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ${
                                userCoins >= duelPreview.bet_amount
                                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 ring-amber-500/20'
                                  : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30 ring-red-500/20'
                              }`}>
                                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm sm:text-base font-bold text-foreground">
                                  {userCoins >= duelPreview.bet_amount ? '💰 Дуэль со ставкой!' : '⚠️ Недостаточно монет!'}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Ставка: <span className="font-bold text-foreground">{duelPreview.bet_amount}</span> монет
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  У вас: <span className={`font-bold ${userCoins >= duelPreview.bet_amount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {userCoins}
                                  </span> монет
                                </p>
                                {userCoins < duelPreview.bet_amount && (
                                  <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                                    Нужно ещё {duelPreview.bet_amount - userCoins} монет
                                  </p>
                                )}
                  </div>
                </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Hint Box - shown when no preview */}
                      {!duelPreview && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-100/60 via-orange-100/40 to-yellow-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 border border-amber-300/50 dark:border-amber-800/50 backdrop-blur-sm shadow-lg"
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20">
                              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed font-medium">
                                Попросите друга поделиться кодом из экрана ожидания дуэли
                              </p>
                </div>
              </div>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Button
                          size="lg"
                          onClick={() => {
                            if (joinCode.length === 4) {
                              handleInlineJoin(joinCode);
                            }
                          }}
                          disabled={joinCode.length !== 4 || isJoining || (!isAuthenticated && !isTelegramUser) || (duelPreview && duelPreview.bet_amount > userCoins)}
                          className="w-full h-12 sm:h-12 text-sm sm:text-base font-black rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 text-white shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation relative overflow-hidden group"
                        >
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          
                          {isJoining ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin relative z-10" />
                              <span className="hidden sm:inline relative z-10">Присоединение...</span>
                              <span className="sm:hidden relative z-10">Присоединение</span>
                            </>
                          ) : duelPreview && duelPreview.bet_amount > 0 ? (
                            <>
                              <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5 relative z-10" />
                              <span className="hidden sm:inline relative z-10">Присоединиться за {duelPreview.bet_amount} монет</span>
                              <span className="sm:hidden relative z-10">За {duelPreview.bet_amount}</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5 relative z-10" />
                              <span className="relative z-10">Присоединиться</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
                )}
                </div>
              </Card>
            </motion.div>

          {/* How to Play Section - Premium */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="p-6 sm:p-8 md:p-10 bg-gradient-to-br from-card/95 via-card/90 to-primary/10 border border-primary/30 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden group">
              {/* Animated background glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 via-blue-500/10 to-cyan-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 -z-10" />
              
              <h3 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary via-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40 ring-4 ring-primary/20">
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10" />
                </div>
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Как играть
                </span>
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { icon: Swords, title: 'Создайте или присоединитесь', desc: 'Пригласите друга или введите код дуэли', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { icon: Zap, title: 'Отвечайте быстрее', desc: 'Бонус за скорость до +40%', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { icon: Target, title: 'Собирайте комбо', desc: 'До +20% за серию правильных ответов', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                  { icon: Trophy, title: 'Побеждайте!', desc: 'Получайте награды и поднимайтесь в рейтинге', gradient: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className={`flex items-start gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl ${item.bg} border-2 ${item.border} hover:border-opacity-40 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl group/item relative overflow-hidden`}
                    >
                      {/* Hover glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover/item:opacity-10 transition-opacity duration-300 -z-10`} />
                      
                      <div className={`relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl ring-4 ring-opacity-20 group-hover/item:scale-110 transition-transform duration-300`}>
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="font-black text-base sm:text-lg mb-1.5 text-foreground">{item.title}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">{item.desc}</div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </Card>
          </motion.div>
        </div>
      )}

      {!isLoadingProfile && mode === 'create' && (
        <DuelLobby
          duelId={duelId}
          duelCode={duelCode}
          onDuelCreated={handleDuelCreated}
          onDuelStarted={handleDuelStarted}
          onCancel={handleBackToMenu}
        />
      )}

      {mode === 'result' && duelId && (
        <DuelResult
          duelId={duelId}
          onRematch={() => setMode('create')}
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      {/* Debug: показываем состояние для отладки */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded z-50">
          Mode: {mode} | DuelId: {duelId ? '✅' : '❌'}
        </div>
      )}
      
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Modals */}
      <DuelCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onDuelCreated={handleDuelCreated}
      />

      <DuelJoinModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onDuelJoined={handleDuelJoined}
      />
      <BoostShopModal open={showShop} onOpenChange={setShowShop} />
      </div>
    </Layout>
  );
}
