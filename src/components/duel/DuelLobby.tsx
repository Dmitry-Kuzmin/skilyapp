import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X, Sparkles, Zap, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { generateTelegramShareUrl } from '@/utils/duelShare';
import { motion, AnimatePresence } from 'framer-motion';

interface DuelLobbyProps {
  duelId: string | null;
  duelCode: string | null;
  onDuelCreated: (id: string, code: string) => void;
  onDuelStarted: () => void;
  onCancel: () => void;
}

export function DuelLobby({ duelId, duelCode, onDuelCreated, onDuelStarted, onCancel }: DuelLobbyProps) {
  const { profileId, platform } = useUserContext();
  const [waitTime, setWaitTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');
  const [copied, setCopied] = useState(false);
  const { state } = useDuelRealtime(duelId);

  // Проверяем статус дуэли один раз при монтировании (fallback)
  useEffect(() => {
    if (!duelId) return;

    let mounted = true;
    
    const checkInitialStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'check_status',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (!mounted) return;

        if (error) {
          console.error('[DuelLobby] Error checking initial status:', error);
          setConnectionStatus('connected');
          return;
        }

        if (data?.status === 'active') {
          console.log('[DuelLobby] ✅ Duel already active! Starting battle...');
          setConnectionStatus('connected');
          onDuelStarted();
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('[DuelLobby] Exception checking initial status:', err);
        if (mounted) {
          setConnectionStatus('connected');
        }
      }
    };

    checkInitialStatus();
    
    return () => {
      mounted = false;
    };
  }, [duelId, profileId, onDuelStarted]);

  // Handle timer - оптимизировано с useMemo
  useEffect(() => {
    if (!duelCode) return;

    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [duelCode]);

  // Handle opponent joined - убрано toast, только логирование
  useEffect(() => {
    if (state.opponentJoined) {
      console.log('[DuelLobby] Opponent joined!');
    }
  }, [state.opponentJoined]);

  // Handle duel started from realtime - сразу переходим к битве
  useEffect(() => {
    if (state.duelStarted) {
      console.log('[DuelLobby] ✅ Duel started signal from realtime! Starting battle immediately...');
      onDuelStarted();
    }
  }, [state.duelStarted, onDuelStarted]);

  const handleStartDuel = async () => {
    if (!duelId) return;
    
    try {
      const { error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'start_duel',
          profile_id: profileId,
          duel_id: duelId,
        },
      });

      if (error) throw error;

      toast.success('Дуэль началась!');
      onDuelStarted();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка старта дуэли');
    }
  };

  const handleCopyCode = async () => {
    if (!duelCode) return;
    
    try {
      await navigator.clipboard.writeText(duelCode);
      setCopied(true);
      toast.success('Код скопирован!');
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('[DuelLobby] Error copying code:', error);
      toast.error('Не удалось скопировать код');
    }
  };

  const handleShare = async () => {
    if (!duelCode || !window.Telegram?.WebApp) return;

    try {
      // Загружаем информацию о ставке для красивого сообщения
      let betAmount: number | undefined;
      if (duelId) {
        const { data } = await supabase
          .from('duels')
          .select('bet_amount')
          .eq('id', duelId)
          .single();
        
        betAmount = data?.bet_amount || undefined;
      }

      // Генерируем красивое сообщение с эмодзи и прямой ссылкой
      const shareUrl = generateTelegramShareUrl(duelCode, betAmount);
      
      // Открываем шаринг в Telegram
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    } catch (error) {
      console.error('[DuelLobby] Error sharing duel:', error);
      toast.error('Ошибка при шаринге дуэли');
    }
  };

  // Форматируем время один раз через useMemo
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(waitTime / 60);
    const seconds = waitTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [waitTime]);

  if (duelCode) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 md:p-8 text-center space-y-6 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 shadow-xl relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-indigo-500/5 opacity-50 animate-pulse" />
            
            {/* Connection status indicator - улучшенный */}
            <div className="flex items-center justify-center gap-2 text-sm mb-2 relative z-10">
              <motion.div
                animate={{
                  scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-yellow-500'}`}
              />
              <span className="text-muted-foreground text-xs font-medium">
                {connectionStatus === 'connected' ? 'Подключено' : 'Подключение...'}
              </span>
            </div>

            {/* Header - улучшенный */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-3 relative z-10"
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="w-14 h-14 mx-auto bg-gradient-to-br from-primary via-blue-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Users className="h-7 w-7 text-white" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary via-blue-500 to-pink-500 bg-clip-text text-transparent">
                Ожидание соперника
              </h2>
              <p className="text-muted-foreground text-sm">Поделитесь кодом с другом</p>
            </motion.div>

          {/* Code Display - Compact */}
          <div className="py-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative bg-gradient-to-br from-white/95 via-violet-50/90 to-purple-50/90 dark:from-violet-950/50 dark:via-violet-950/40 dark:to-purple-950/40 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border-2 border-violet-500/50 ring-2 ring-violet-500/10 cursor-pointer group hover:border-violet-500/70 hover:ring-violet-500/20 transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={handleCopyCode}
              style={{
                boxShadow: copied 
                  ? 'rgba(139, 92, 246, 0.35) 0px 0px 30px' 
                  : 'rgba(139, 92, 246, 0.08) 0px 0px 15px'
              }}
            >
              {/* Dot pattern background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(139,92,246)_1px,transparent_0)] [background-size:20px_20px] opacity-8 rounded-2xl" />
              
              {/* Code */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.2em] mb-3 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent text-center select-all relative z-10"
              >
                {duelCode}
              </motion.div>
              
              {/* Label with copy indicator */}
              <div className="flex items-center justify-center gap-1.5 relative z-10">
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="copied"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Скопировано!</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-xs text-muted-foreground font-medium uppercase tracking-wide"
                    >
                      <Sparkles className="h-3 w-3 group-hover:text-violet-500 transition-colors" />
                      <span className="group-hover:text-violet-500 transition-colors">Код дуэли</span>
                      <Copy className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Hint text */}
              <AnimatePresence>
                {!copied && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground/70 text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Нажмите, чтобы скопировать
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Stats & Actions - Compact */}
          <div className="space-y-3 relative z-10">
            {/* Stats */}
            <div className="flex items-center justify-center gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 dark:from-violet-500/10 dark:to-purple-500/10 px-4 py-2 rounded-xl border border-violet-500/30 backdrop-blur-sm"
              >
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">{state.opponentJoined ? '2' : '1'}</span>
                  <span className="text-muted-foreground/50 text-sm">/</span>
                  <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">2</span>
                  <span className="text-xs text-muted-foreground ml-1">игроков</span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 dark:from-blue-500/10 dark:to-indigo-500/10 px-4 py-2 rounded-xl border border-blue-500/30 backdrop-blur-sm"
              >
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-300">{formattedTime}</span>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {platform === 'telegram' && (
                <Button
                  onClick={handleShare}
                  size="default"
                  className="flex-1 h-10 text-sm font-semibold bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Поделиться
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={onCancel}
                size="default"
                className="flex-1 h-10 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
              >
                <X className="mr-2 h-4 w-4" />
                Отменить
              </Button>
            </div>
          </div>

          {/* Opponent Joined - Compact */}
          <AnimatePresence>
            {state.opponentJoined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-gradient-to-r from-green-500/25 via-emerald-500/25 to-green-500/25 dark:from-green-500/15 dark:via-emerald-500/15 dark:to-green-500/15 border-2 border-green-500/50 rounded-xl p-4 shadow-lg shadow-green-500/20"
              >
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-4 w-4 text-green-500" />
                  </motion.div>
                  <p className="text-green-700 dark:text-green-300 font-black text-lg">Соперник найден!</p>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-4 w-4 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading when waiting - Compact */}
          {!state.opponentJoined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 text-muted-foreground"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-3.5 w-3.5 text-violet-500" />
              </motion.div>
              <span className="text-xs font-medium">Ожидание соперника...</span>
            </motion.div>
          )}
        </Card>
        </motion.div>
      </div>
    );
  }

  return null;
}
