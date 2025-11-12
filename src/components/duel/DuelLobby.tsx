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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');
  const { state } = useDuelRealtime(duelId);

  // Проверяем статус дуэли один раз при монтировании (fallback)
  // Основная логика через useDuelRealtime - он подписывается на изменения через Realtime
  useEffect(() => {
    if (!duelId) return;

    console.log('[DuelLobby] Initializing - checking initial status for:', duelId);
    
    const checkInitialStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'check_status',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (error) {
          console.error('[DuelLobby] Error checking initial status:', error);
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
        setConnectionStatus('connected'); // Set connected anyway
      }
    };

    // Проверяем один раз при монтировании
    checkInitialStatus();
    
    // УБРАНО: setInterval для периодической проверки
    // useDuelRealtime уже подписывается на изменения через Realtime и обновляет state.duelStarted
    // Это избыточно и создает лишнюю нагрузку
  }, [duelId, profileId, onDuelStarted]);

  // Handle timer
  useEffect(() => {
    if (!duelCode) return;

    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [duelCode]);

  // УБРАНО: Countdown - дуэль начинается сразу когда стартовала
  // Handle opponent joined
  useEffect(() => {
    if (state.opponentJoined) {
      console.log('[DuelLobby] Opponent joined!');
      toast.success('Противник найден!');
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

  // УБРАНО: Countdown экран - дуэль начинается сразу без задержки

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
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Ожидание соперника
              </h2>
              <p className="text-muted-foreground text-sm">Поделитесь кодом с другом</p>
            </div>

            {/* Code Display - Simplified */}
            <div className="relative py-6">
              <div className="relative bg-gradient-to-br from-card via-card to-card/90 p-8 rounded-2xl border-2 border-primary/30 shadow-lg">
                <div className="text-5xl font-black tracking-[0.2em] mb-3 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {duelCode}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                  <Sparkles className="h-3 w-3" />
                  Код дуэли
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>
            </div>

            {/* Action Buttons - Simplified */}
            <div className="flex flex-col gap-2 justify-center px-4">
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  size="lg"
                className="w-full h-12 text-sm font-bold border-2 hover:bg-primary/10"
                >
                <Copy className="mr-2 h-4 w-4" />
                  Копировать код
                </Button>
              {platform === 'telegram' && (
                  <Button
                    onClick={handleShare}
                    size="lg"
                  className="w-full h-12 text-sm font-bold bg-gradient-to-r from-primary to-purple-500"
                  >
                  <Share2 className="mr-2 h-4 w-4" />
                    Поделиться
                  </Button>
              )}
            </div>

            {/* Stats - Simplified */}
            <div className="flex items-center justify-center gap-4 text-sm pt-3">
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-bold">{state.opponentJoined ? '2/2' : '1/2'}</span>
                <span className="text-muted-foreground text-xs">игроков</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-mono font-bold">
                  {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Opponent Joined - Simplified */}
              {state.opponentJoined && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-green-500" />
                  <p className="text-green-500 font-bold text-lg">
                      Соперник найден!
                    </p>
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-muted-foreground text-sm text-center">
                  Начинаем битву...
                </p>
              </div>
              )}

            {/* Loading Animation when waiting - Simplified */}
            {!state.opponentJoined && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">Ожидание соперника...</span>
              </div>
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
