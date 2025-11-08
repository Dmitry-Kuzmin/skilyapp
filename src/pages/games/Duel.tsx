import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Swords, Trophy, LogIn, Sparkles, Zap, Target, TrendingUp, Loader2, Copy, Check, Hash, Minus, Plus } from 'lucide-react';
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
import { motion } from 'framer-motion';

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
  
  // Inline create state
  const [numQuestions, setNumQuestions] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Initialize notifications for duel page
  useNotifications({ showToasts: true, playSounds: true });
  
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
    setMode('result');
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
    if (!code || code.length < 4 || code.length > 6) {
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
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'join_duel',
          profile_id: profileId,
          code: code.toUpperCase(),
        },
      });

      if (error) throw error;

      if (data.auto_started) {
        toast.success('Дуэль начинается! 🎮');
      } else {
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

  // Auto-join when code is 4-6 characters (auto-join after 4, but allow up to 6)
  useEffect(() => {
    if (joinCode.length >= 4 && joinCode.length <= 6 && !isJoining && profileId && !hasAutoJoinedRef.current && (isAuthenticated || isTelegramUser)) {
      const timer = setTimeout(() => {
        if (joinCode.length >= 4 && joinCode.length <= 6 && !hasAutoJoinedRef.current) {
          handleInlineJoin(joinCode);
        }
      }, joinCode.length === 4 ? 500 : 300); // Faster for longer codes
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode, isJoining, profileId, isAuthenticated, isTelegramUser]);

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
        },
      });

      if (error) throw error;

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

  const handleGoToLobbyFromInline = () => {
    // Use stored duelId and duelCode if available, otherwise find by code
    if (duelId && duelCode) {
      handleDuelCreated(duelId, duelCode);
      setCreatedCode(null);
      return;
    }

    if (!createdCode) {
      toast.error('Код дуэли не найден');
      return;
    }

    // Find duel by code as fallback
    (async () => {
      try {
        const { data, error } = await supabase
          .from('duels')
          .select('id, code')
          .eq('code', createdCode)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          handleDuelCreated(data.id, data.code);
          setCreatedCode(null);
        } else {
          toast.error('Дуэль не найдена. Попробуйте создать новую.');
        }
      } catch (error: any) {
        const extractedError = extractErrorFromResponse(error);
        const humanError = getHumanReadableError(extractedError, 'create');
        toast.error(humanError);
      }
    })();
  };

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
      
      <div className="container mx-auto px-4 py-6">
      {isLoadingProfile && (
        <Card className="max-w-2xl mx-auto p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Swords className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Загрузка профиля...</h2>
            <p className="text-muted-foreground">Пожалуйста, подождите</p>
          </div>
        </Card>
      )}

      {!isLoadingProfile && !isAuthenticated && !isTelegramUser && (
        <Card className="max-w-2xl mx-auto p-12 text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Войдите, чтобы играть
            </h2>
            <p className="text-muted-foreground text-lg">
              Для участия в дуэлях необходимо авторизоваться
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="px-8">
            <LogIn className="mr-2 h-5 w-5" />
            Войти
          </Button>
        </Card>
      )}

      {!isLoadingProfile && (isAuthenticated || isTelegramUser) && mode === 'menu' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 pb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-primary via-blue-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30"
            >
              <Swords className="h-12 w-12 text-white" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Дуэль знаний
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Сразись с друзьями в битве за знания ПДД. Победи скорость и точность!
            </p>
          </motion.div>

          {/* Unified Action Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-0 border-2 border-border/50 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                {/* Create Duel Section */}
                <div className="p-8 md:p-10 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/50 dark:from-emerald-950/10 dark:via-teal-950/5 dark:to-cyan-950/10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Swords className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-foreground">Создать дуэль</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Создайте дуэль и пригласите друга на битву знаний
                        </p>
                      </div>
                    </div>

                    {!createdCode ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                            <button
                              onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                              disabled={isCreating || numQuestions <= 5}
                              className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </button>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 min-w-[2rem] text-center">
                              {numQuestions}
                            </span>
                            <button
                              onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                              disabled={isCreating || numQuestions >= 30}
                              className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </button>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => handleActionClick(() => handleInlineCreate())}
                            disabled={isCreating}
                            className="flex-1 h-10 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50"
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Создание...
                              </>
                            ) : (
                              <>
                                <Swords className="mr-2 h-4 w-4" />
                                Создать дуэль
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Created State */}
                        <div className="space-y-4">
                          <div className="text-center space-y-3">
                            <p className="text-sm font-semibold text-muted-foreground">Код дуэли</p>
                            <button
                              onClick={handleCopyCode}
                              className="group relative inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                            >
                              <span className="font-mono text-4xl font-black tracking-wider text-emerald-600 dark:text-emerald-400 select-all">
                                {createdCode}
                              </span>
                              <div className="flex-shrink-0">
                                {copied ? (
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                                    <Copy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                )}
                              </div>
                              {copied && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md whitespace-nowrap">
                                  Скопировано!
                                </div>
                              )}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {copied ? 'Код скопирован в буфер обмена' : 'Нажмите на код, чтобы скопировать'}
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground mb-1">Ожидание соперника</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Поделитесь кодом с другом. Дуэль начнется автоматически, когда он присоединится.
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="lg"
                            onClick={handleGoToLobbyFromInline}
                            className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          >
                            Перейти в лобби
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Join Duel Section */}
                <div className="p-8 md:p-10 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-yellow-50/50 dark:from-amber-950/10 dark:via-orange-950/5 dark:to-yellow-950/10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <LogIn className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-foreground">Присоединиться</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Введите код дуэли от друга и начните битву
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="join-code" className="text-sm font-semibold text-foreground">
                          Код дуэли
                        </Label>
                        <div className="relative">
                          <Input
                            id="join-code"
                            placeholder="AB12 или ABC123"
                            value={joinCode}
                            onChange={(e) => {
                              const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                              setJoinCode(newCode);
                              hasAutoJoinedRef.current = false;
                            }}
                            maxLength={6}
                            disabled={isJoining || (!isAuthenticated && !isTelegramUser)}
                            className="text-center text-2xl tracking-[0.2em] font-bold h-14 bg-background border-2 focus:border-amber-500 rounded-xl disabled:opacity-50"
                            autoFocus={false}
                          />
                          {isJoining && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex justify-center gap-1.5 pt-1">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                i < joinCode.length
                                  ? 'bg-amber-500 w-6'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-center text-muted-foreground pt-1">
                          {joinCode.length < 4 ? 'Введите 4-6 символов' : joinCode.length === 4 ? 'Автоприсоединение...' : 'Введите полный код'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Попросите друга поделиться кодом из экрана ожидания дуэли
                          </p>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        onClick={() => {
                          if (joinCode.length >= 4 && joinCode.length <= 6) {
                            handleInlineJoin(joinCode);
                          }
                        }}
                        disabled={(joinCode.length < 4 || joinCode.length > 6) || isJoining || (!isAuthenticated && !isTelegramUser)}
                        className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Присоединение...
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-5 w-5" />
                            Присоединиться
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* How to Play Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-8 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              Как играть
            </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Swords className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Создайте или присоединитесь</div>
                    <div className="text-sm text-muted-foreground">Пригласите друга или введите код дуэли</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Отвечайте быстрее</div>
                    <div className="text-sm text-muted-foreground">Бонус за скорость до +40%</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Собирайте комбо</div>
                    <div className="text-sm text-muted-foreground">До +20% за серию правильных ответов</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:border-yellow-500/20 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Побеждайте!</div>
                    <div className="text-sm text-muted-foreground">Получайте награды и поднимайтесь в рейтинге</div>
                  </div>
                </div>
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
      </div>
    </Layout>
  );
}
