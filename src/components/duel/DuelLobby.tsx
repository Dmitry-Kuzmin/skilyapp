import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');
  const { state } = useDuelRealtime(duelId);

  // Check duel status immediately on mount and continuously
  useEffect(() => {
    if (!duelId) return;

    let isActive = true;
    let checkCount = 0;
    const MAX_CHECKS = 60; // 60 seconds max

    console.log('[DuelLobby] Initializing status check for:', duelId);
    
    const checkStatus = async () => {
      if (!isActive) return;
      
      checkCount++;
      console.log(`[DuelLobby] Status check #${checkCount} for duel:`, duelId);
      
      try {
        // Use edge function to check status (bypasses RLS issues)
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'check_status',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (error) {
          console.error('[DuelLobby] Error checking duel status:', error);
          return;
        }

        if (!data || data.error) {
          console.warn('[DuelLobby] Duel not found or no access:', data?.error);
          return;
        }

        console.log('[DuelLobby] Duel status:', data.status);
        
        if (data.status === 'active') {
          console.log('[DuelLobby] ✅ DUEL IS ACTIVE! Starting countdown...');
          setConnectionStatus('connected');
          startCountdown();
          isActive = false; // Stop checking
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('[DuelLobby] Exception checking status:', err);
      }
    };

    // Immediate check
    checkStatus();

    // Then check every 500ms for reliability in Telegram
    const interval = setInterval(() => {
      if (checkCount >= MAX_CHECKS) {
        clearInterval(interval);
        console.log('[DuelLobby] Max checks reached, stopping polling');
        return;
      }
      checkStatus();
    }, 500);

    return () => {
      isActive = false;
      clearInterval(interval);
      console.log('[DuelLobby] Cleanup: stopped status polling');
    };
  }, [duelId]);

  // Handle timer
  useEffect(() => {
    if (!duelCode) return;

    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [duelCode]);

  // Countdown animation
  const startCountdown = () => {
    console.log('[DuelLobby] Starting countdown...');
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      console.log('[DuelLobby] Countdown finished, starting battle!');
      onDuelStarted();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onDuelStarted]);

  // Handle opponent joined
  useEffect(() => {
    if (state.opponentJoined) {
      console.log('[DuelLobby] Opponent joined!');
      toast.success('Противник найден! Дуэль начинается через 3 секунды...');
    }
  }, [state.opponentJoined]);

  // Handle duel started from realtime
  useEffect(() => {
    if (state.duelStarted && countdown === null) {
      console.log('[DuelLobby] ✅ Duel started signal from realtime!');
      startCountdown();
    }
  }, [state.duelStarted, countdown]);

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

  const handleCopyCode = () => {
    if (duelCode) {
      navigator.clipboard.writeText(duelCode);
      toast.success('Код скопирован!');
    }
  };

  const handleShare = () => {
    if (duelCode && window.Telegram?.WebApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(`Присоединяйся к дуэли! Код: ${duelCode}`)}`;
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    }
  };

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-8">
          {countdown > 0 ? (
            <>
              <div 
                key={countdown}
                className="text-9xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse"
              >
                {countdown}
              </div>
              <div className="text-2xl text-muted-foreground">Приготовьтесь...</div>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="text-8xl animate-bounce">⚔️</div>
              <div className="text-6xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                START!
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (duelCode) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 md:p-12 text-center space-y-8 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 shadow-2xl">
            {/* Connection status indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 text-sm mb-4"
            >
              <motion.div
                className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}
                animate={connectionStatus === 'connected' ? {} : { scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-muted-foreground font-medium">
                {connectionStatus === 'connected' ? 'Подключено к серверу' : 'Подключение...'}
              </span>
            </motion.div>

            {/* Header */}
            <div className="space-y-4">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Users className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Ожидание соперника
              </h2>
              <p className="text-muted-foreground text-lg">Поделитесь кодом с другом</p>
            </div>

            {/* Code Display - Enhanced */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30 blur-2xl opacity-60 rounded-3xl" />
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(59, 130, 246, 0.3)',
                    '0 0 40px rgba(147, 51, 234, 0.4)',
                    '0 0 20px rgba(59, 130, 246, 0.3)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="relative bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl p-12 rounded-3xl border-2 border-primary/40"
              >
                <motion.div
                  key={duelCode}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl md:text-7xl font-black tracking-[0.2em] mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent"
                >
                  {duelCode}
                </motion.div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  Код дуэли
                  <Sparkles className="h-4 w-4" />
                </div>
              </motion.div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 max-w-xs mx-auto sm:mx-0"
              >
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-base font-bold border-2 hover:bg-primary/10"
                >
                  <Copy className="mr-2 h-5 w-5" />
                  Копировать код
                </Button>
              </motion.div>
              {platform === 'telegram' && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 max-w-xs mx-auto sm:mx-0"
                >
                  <Button
                    onClick={handleShare}
                    size="lg"
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                  >
                    <Share2 className="mr-2 h-5 w-5" />
                    Поделиться
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 text-base pt-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-purple-500/20 px-6 py-3 rounded-full border border-primary/30"
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="font-black text-lg">{state.opponentJoined ? '2/2' : '1/2'}</span>
                <span className="text-muted-foreground text-sm">игроков</span>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-6 py-3 rounded-full border border-blue-500/30"
              >
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-mono font-black text-lg">
                  {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
                </span>
              </motion.div>
            </div>

            {/* Opponent Joined Animation */}
            <AnimatePresence>
              {state.opponentJoined && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 border-2 border-green-500/40 rounded-2xl p-8 shadow-lg shadow-green-500/20"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center justify-center gap-3 mb-3"
                  >
                    <Sparkles className="h-6 w-6 text-green-500" />
                    <p className="text-green-500 dark:text-green-400 font-black text-2xl">
                      Соперник найден!
                    </p>
                    <Sparkles className="h-6 w-6 text-green-500" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground font-semibold text-lg"
                  >
                    Приготовьтесь к битве! Битва начнется через 3 секунды...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Animation when waiting */}
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
                  <Zap className="h-5 w-5" />
                </motion.div>
                <span className="text-sm font-medium">Ожидание соперника...</span>
              </motion.div>
            )}

            <Button
              variant="ghost"
              onClick={onCancel}
              size="lg"
              className="w-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="mr-2 h-5 w-5" />
              Отменить дуэль
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // This component is now only used for waiting lobby (when duelCode exists)
  // Creation is handled by DuelCreateModal
  return null;
}
