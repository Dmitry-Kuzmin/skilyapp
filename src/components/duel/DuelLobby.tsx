import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Share2, Users, Clock, X, Sparkles, Zap, Check, Trophy, Swords, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { generateTelegramShareUrl } from '@/utils/duelShare';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useLanguage } from '@/contexts/LanguageContext';

interface DuelLobbyProps {
  duelId: string | null;
  duelCode: string | null;
  onDuelCreated: (id: string, code: string) => void;
  onDuelStarted: () => void;
  onCancel: () => void;
}

export function DuelLobby({ duelId, duelCode, onDuelCreated, onDuelStarted, onCancel }: DuelLobbyProps) {
  const { t } = useLanguage();
  const { profileId, platform } = useUserContext();
  const [waitTime, setWaitTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');
  const [copied, setCopied] = useState(false);
  const [finishedOpponent, setFinishedOpponent] = useState<any>(null);
  const { state } = useDuelRealtime(duelId);

  useEffect(() => {
    if (!duelId) return;
    let mounted = true;
    const checkInitialStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: { action: 'get_players', duel_id: duelId, profile_id: profileId }
        });
        if (!mounted) return;
        if (error) {
          setConnectionStatus('connected');
          return;
        }
        const players = data?.players || [];
        const finished = players.find((p: any) => p.user_id !== profileId && p.is_finished);
        if (finished) setFinishedOpponent(finished);
        setConnectionStatus('connected');
      } catch (err) {
        if (mounted) setConnectionStatus('connected');
      }
    };
    checkInitialStatus();
    return () => { mounted = false; };
  }, [duelId, profileId]);

  useEffect(() => {
    if (!duelCode) return;
    const timer = setInterval(() => { setWaitTime(prev => prev + 1); }, 1000);
    return () => clearInterval(timer);
  }, [duelCode]);

  useEffect(() => {
    if (state.opponentJoined && duelId && profileId) {
      const checkStatusAndStart = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: { action: 'check_status', duel_id: duelId, profile_id: profileId }
          });
          if (error) {
            const { data: duelData } = await supabase.from('duels').select('status').eq('id', duelId).maybeSingle() as { data: { status: string } | null };
            if (duelData?.status === 'active') onDuelStarted();
            return;
          }
          if (data?.status === 'active') onDuelStarted();
          else if (data?.status === 'finished') toast.error(t('duelLobby.toasts.finished'));
        } catch (err) {}
      };
      checkStatusAndStart();
    }
  }, [state.opponentJoined, duelId, profileId, onDuelStarted, t]);

  useEffect(() => {
    if (state.duelStarted) onDuelStarted();
  }, [state.duelStarted, onDuelStarted]);

  const handleStartDuel = async () => {
    if (!duelId) return;
    try {
      const { error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'start_duel', profile_id: profileId, duel_id: duelId }
      });
      if (error) throw error;
      toast.success(t('duelLobby.toasts.started'));
      onDuelStarted();
    } catch (error: any) {
      toast.error(error.message || t('duelLobby.toasts.startError'));
    }
  };

  const handleStartAlone = async () => {
    if (!duelId) return;
    try {
      const { error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'start_duel_now', profile_id: profileId, duel_id: duelId }
      });
      if (error) throw error;
      toast.success(t('duelLobby.toasts.battleStarts'));
      onDuelStarted();
    } catch (error: any) {
      toast.error(error.message || t('duelLobby.toasts.battleStartError'));
    }
  };

  const handleCopyCode = async () => {
    if (!duelCode) return;
    try {
      await navigator.clipboard.writeText(duelCode);
      setCopied(true);
      toast.success(t('duelLobby.toasts.codeCopied'), { description: t('duelLobby.toasts.codeCopiedDesc'), duration: 3000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t('duelLobby.toasts.copyError', { code: duelCode }));
    }
  };

  const handleShare = async () => {
    if (!duelCode || !window.Telegram?.WebApp) return;
    try {
      let betAmount: number | undefined;
      if (duelId) {
        const { data } = await supabase.from('duels').select('bet_amount').eq('id', duelId).single() as { data: { bet_amount: number } | null };
        betAmount = data?.bet_amount || undefined;
      }
      const shareTranslations = t('duelLobby.share', undefined, { returnObjects: true }) as any;
      const shareUrl = generateTelegramShareUrl(duelCode, betAmount, {
        title: shareTranslations.title,
        bet: shareTranslations.bet,
        code: shareTranslations.code,
        description: shareTranslations.description,
        cta: shareTranslations.cta
      });
      (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
    } catch (error) {
      toast.error('Error sharing duel');
    }
  };

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(waitTime / 60);
    const seconds = waitTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [waitTime]);

  if (duelCode) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 pt-2 md:pt-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
          {finishedOpponent ? (
            <Card className="p-6 text-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-none shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
              <div className="relative z-10 space-y-6">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-1">
                  <Swords className="h-5 w-5 text-purple-400" />
                  <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest">{t('duelLobby.versus.title')}</h2>
                </motion.div>
                <div className="flex items-center justify-center gap-4">
                  <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg border-2 border-emerald-400/50">
                        <span className="text-3xl font-black text-white">{finishedOpponent.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-2 border-slate-900 shadow-lg"><Check className="h-3 w-3 text-white" /></motion.div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm truncate max-w-[80px]">{finishedOpponent.name}</p>
                      <p className="text-emerald-400 text-xs font-medium">{t('duelLobby.versus.opponentFinished')}</p>
                    </div>
                    <div className="bg-emerald-500/20 px-4 py-2 rounded-xl border border-emerald-500/30">
                      <p className="text-2xl font-black text-white">{finishedOpponent.score}</p>
                      <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">{t('duelLobby.versus.points')}</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg border-2 border-yellow-300/50"><span className="text-white font-black text-lg">VS</span></div>
                    <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md opacity-50 animate-pulse" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border-2 border-indigo-400/50"><User className="h-10 w-10 text-white/80" /></div>
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1.5 border-2 border-slate-900 shadow-lg"><Zap className="h-3 w-3 text-white" /></motion.div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{t('duelResult.you')}</p>
                      <p className="text-yellow-400 text-xs font-medium">{t('duelLobby.versus.youReady')}</p>
                    </div>
                    <div className="bg-indigo-500/20 px-4 py-2 rounded-xl border border-indigo-500/30">
                      <p className="text-2xl font-black text-white">?</p>
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">{t('duelLobby.versus.target', { score: finishedOpponent.score + 1 })}</p>
                    </div>
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-white/90 text-sm font-medium" dangerouslySetInnerHTML={{ __html: t('duelLobby.versus.motivation', { correct: finishedOpponent.correct_count, target: finishedOpponent.score + 1 }) }} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                  <Button onClick={handleStartAlone} className="w-full h-14 text-lg font-black bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-xl rounded-xl transition-all group">
                    <Swords className="mr-2 h-6 w-6 group-hover:rotate-12 transition-transform" />
                    {t('duelLobby.versus.acceptChallenge')}
                  </Button>
                </motion.div>
                <Button variant="ghost" onClick={onCancel} className="text-white/40 hover:text-white/70 text-sm">{t('duelLobby.versus.cancel')}</Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 md:p-8 text-center space-y-6 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 shadow-xl relative overflow-hidden">
               <div className="flex items-center justify-end mb-3 relative z-10">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
                  <motion.div animate={{ scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }} className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-muted-foreground text-xs">{connectionStatus === 'connected' ? t('duelLobby.status.connected') : t('duelLobby.status.connecting')}</span>
                </motion.div>
              </div>
              <div className="text-center space-y-2 relative z-10">
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }} className="w-14 h-14 mx-auto bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg relative">
                  {!state.opponentJoined && <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-2xl bg-emerald-500/30" />}
                  <Users className="h-7 w-7 text-white relative z-10" />
                </motion.div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">{t('duelLobby.waiting.title')}</h2>
                    {!state.opponentJoined && <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex gap-0.5"><span className="text-emerald-600">.</span><span>.</span><span>.</span></motion.div>}
                  </div>
                  <p className="text-muted-foreground text-xs">{t('duelLobby.waiting.subtitle')}</p>
                </div>
              </div>
              <div className="py-3">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white/95 dark:bg-emerald-950/50 p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/50 cursor-pointer hover:border-emerald-500/70 transition-all shadow-md hover:shadow-lg" onClick={handleCopyCode}>
                  <div className="flex items-center justify-center gap-3 mb-3 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.2em] bg-gradient-to-r from-emerald-700 to-cyan-700 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent select-all">{duelCode}</motion.div>
                    <motion.div animate={{ scale: copied ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>{copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-muted-foreground" />}</motion.div>
                  </div>
                  <div className="relative z-10">
                    <div className="absolute inset-x-0 -bottom-2 flex items-center justify-center">
                      <div className="bg-card px-3 rounded-full border border-emerald-500/20 py-0.5">
                        <AnimatePresence mode="wait">
                          {copied ? (
                            <motion.span key="copied" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{t('duelLobby.waiting.copied')}</motion.span>
                          ) : (
                            <motion.span key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{t('duelLobby.waiting.codeLabel')}</motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-center gap-3">
                  <motion.div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-2 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">{state.opponentJoined ? '2' : '1'}</span>
                      <span className="text-muted-foreground/50 text-sm">/</span>
                      <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">2</span>
                      <span className="text-xs text-muted-foreground ml-1">{t('duelLobby.waiting.playersCount')}</span>
                    </div>
                  </motion.div>
                  <motion.div className="flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-300">{formattedTime}</span>
                  </motion.div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {platform === 'telegram' && (
                    <div className="flex flex-col flex-1 gap-2">
                      <Button onClick={handleShare} className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-md transition-all">
                        <Share2 className="mr-2 h-4 w-4" />
                        {t('duelLobby.actions.share')}
                      </Button>
                      {!state.opponentJoined && (
                        <Button onClick={handleStartAlone} variant="outline" className="w-full h-10 text-sm font-bold border-2 border-emerald-500/50 text-emerald-600 shadow-sm">
                          <Zap className="mr-2 h-4 w-4 fill-current" />
                          {t('duelLobby.actions.startAlone')}
                        </Button>
                      )}
                    </div>
                  )}
                  <Button variant="ghost" onClick={onCancel} className="flex-1 h-10 text-sm font-medium text-red-600">{t('duelLobby.actions.cancel')}</Button>
                </div>
              </div>
              <AnimatePresence>
                {state.opponentJoined && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkles className="h-4 w-4 text-green-500" /></motion.div>
                      <p className="text-green-700 dark:text-green-300 font-black text-lg">{t('duelLobby.opponentFound.title')}</p>
                      <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkles className="h-4 w-4 text-green-500" /></motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}
        </motion.div>
      </div>
    );
  }
  return null;
}
