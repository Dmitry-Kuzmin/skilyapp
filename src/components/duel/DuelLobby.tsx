import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { generateTelegramShareUrl } from '@/utils/duelShare';

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

  const handleCopyCode = () => {
    if (duelCode) {
      navigator.clipboard.writeText(duelCode);
      toast.success('Код скопирован!');
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
        <Card className="p-6 md:p-8 text-center space-y-6 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 shadow-xl">
          {/* Connection status indicator - упрощено, без анимаций */}
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-muted-foreground text-xs">
              {connectionStatus === 'connected' ? 'Подключено' : 'Подключение...'}
            </span>
          </div>

          {/* Header - упрощено */}
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ожидание соперника
            </h2>
            <p className="text-muted-foreground text-xs">Поделитесь кодом с другом</p>
          </div>

          {/* Code Display - упрощено, без лишних обёрток */}
          <div className="py-4">
            <div className="bg-card p-6 rounded-xl border-2 border-primary/30">
              <div className="text-4xl font-black tracking-[0.2em] mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {duelCode}
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-semibold uppercase">
                <Sparkles className="h-3 w-3" />
                Код дуэли
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Action Buttons - упрощено */}
          <div className="flex flex-col gap-2 px-2">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              size="lg"
              className="w-full h-11 text-sm font-semibold border-2"
            >
              <Copy className="mr-2 h-4 w-4" />
              Копировать код
            </Button>
            {platform === 'telegram' && (
              <Button
                onClick={handleShare}
                size="lg"
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-purple-500"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Поделиться
              </Button>
            )}
          </div>

          {/* Stats - упрощено */}
          <div className="flex items-center justify-center gap-3 text-sm pt-2">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-xs">{state.opponentJoined ? '2/2' : '1/2'}</span>
              <span className="text-muted-foreground text-xs">игроков</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-mono font-bold text-xs">{formattedTime}</span>
            </div>
          </div>

          {/* Opponent Joined - упрощено */}
          {state.opponentJoined && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-xl p-3">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <p className="text-green-500 font-bold text-base">Соперник найден!</p>
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
            </div>
          )}

          {/* Loading when waiting - упрощено */}
          {!state.opponentJoined && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 opacity-70" />
              <span className="text-xs">Ожидание соперника...</span>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={onCancel}
            size="lg"
            className="w-full h-11 hover:bg-destructive/10 hover:text-destructive text-sm"
          >
            <X className="mr-2 h-4 w-4" />
            Отменить дуэль
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}

export default DuelLobby;
