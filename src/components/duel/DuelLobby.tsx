import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';

interface DuelLobbyProps {
  duelId: string | null;
  duelCode: string | null;
  onDuelCreated: (id: string, code: string) => void;
  onDuelStarted: () => void;
  onCancel: () => void;
}

export function DuelLobby({ duelId, duelCode, onDuelCreated, onDuelStarted, onCancel }: DuelLobbyProps) {
  const { profileId, platform } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('mix');
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

  // REMOVED OLD POLLING - now using consolidated check at mount
  // Old polling logic removed - simplified approach in initial mount effect

  const handleCreateDuel = async () => {
    if (!profileId) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'create_duel',
          profile_id: profileId,
          num_questions: numQuestions,
          categories: null,
          difficulty,
        },
      });

      if (error) throw error;

      toast.success('Дуэль создана!');
      onDuelCreated(data.duel.id, data.code);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания дуэли');
    } finally {
      setIsCreating(false);
    }
  };

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
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card className="p-10 text-center space-y-8 bg-gradient-to-br from-card to-primary/5 border-primary/20">
          {/* Connection status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-muted-foreground">
              {connectionStatus === 'connected' ? 'Подключено к серверу' : 'Подключение...'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Ожидание соперника
            </h2>
            <p className="text-muted-foreground text-lg">Поделитесь кодом с другом</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl opacity-50 rounded-2xl" />
            <div className="relative bg-card/50 backdrop-blur-sm p-10 rounded-2xl border-2 border-primary/30">
              <div className="text-5xl font-black tracking-wider mb-3 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {duelCode}
              </div>
              <div className="text-sm text-muted-foreground font-semibold">КОД ДУЭЛИ</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
            <Button onClick={handleCopyCode} variant="outline" size="lg" className="w-full sm:flex-1 sm:max-w-xs">
              <Copy className="mr-2 h-5 w-5" />
              Копировать
            </Button>
            {platform === 'telegram' && (
              <Button onClick={handleShare} size="lg" className="w-full sm:flex-1 sm:max-w-xs">
                <Share2 className="mr-2 h-5 w-5" />
                Поделиться
              </Button>
            )}
          </div>

          <div className="flex items-center justify-center gap-8 text-base">
            <div className="flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-bold">{state.opponentJoined ? '2/2' : '1/2'}</span>
            </div>
            <div className="flex items-center gap-3 bg-blue-500/10 px-6 py-3 rounded-full">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="font-mono font-bold">
                {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {state.opponentJoined && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-xl p-6 animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl animate-bounce">🎉</span>
                <p className="text-green-500 dark:text-green-400 font-bold text-xl">Соперник найден!</p>
                <span className="text-3xl animate-bounce">🎉</span>
              </div>
              <p className="text-muted-foreground font-semibold">Приготовьтесь к битве!</p>
            </div>
          )}

          <Button variant="ghost" onClick={onCancel} size="lg" className="w-full">
            <X className="mr-2 h-5 w-5" />
            Отменить
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="p-8 space-y-8 bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-4">
            <Swords className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Создать дуэль
          </h2>
          <p className="text-muted-foreground text-lg">Настройте параметры игры</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Количество вопросов</Label>
            <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
              <SelectTrigger className="h-14 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">⚡ 5 вопросов (быстрая)</SelectItem>
                <SelectItem value="10">🎯 10 вопросов</SelectItem>
                <SelectItem value="15">🔥 15 вопросов</SelectItem>
                <SelectItem value="20">💪 20 вопросов</SelectItem>
                <SelectItem value="30">🏆 30 вопросов (марафон)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Сложность</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-14 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mix">🎲 Микс (все уровни)</SelectItem>
                <SelectItem value="easy">🟢 Легкий</SelectItem>
                <SelectItem value="medium">🟡 Средний</SelectItem>
                <SelectItem value="hard">🔴 Сложный</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleCreateDuel} 
            disabled={isCreating} 
            size="lg"
            className="w-full sm:flex-1 h-14 text-lg"
          >
            <Swords className="mr-2 h-5 w-5" />
            Создать дуэль
          </Button>
          <Button variant="outline" onClick={onCancel} size="lg" className="w-full sm:w-auto h-14 px-6">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
