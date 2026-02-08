import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Swords, X, Loader2, CheckCircle2, Hash, Zap, Sparkles,
  Copy, Check, Users, Search, Coins, Minus, Plus, Share2,
  ArrowRight, Shield, Activity, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { extractErrorFromResponse } from '@/utils/errorMessages';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { LoadoutSelector } from '@/components/duel/LoadoutSelector';
import { cn } from '@/lib/utils';
import { isTelegramMiniApp, getTelegramWebApp } from '@/lib/telegram';

interface DuelCreateModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'random' | 'friend';
  onDuelCreated: (id: string, code: string) => void;
}

export function DuelCreateModal({ open, onClose, initialTab = 'random', onDuelCreated }: DuelCreateModalProps) {
  const { profileId } = useUserContext();
  const [activeTab, setActiveTab] = useState<'random' | 'friend'>(initialTab);
  const [step, setStep] = useState<'config' | 'searching' | 'success'>('config');

  const [isProcessing, setIsProcessing] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [betAmount, setBetAmount] = useState(20);
  const [userCoins, setUserCoins] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [createdDuelCode, setCreatedDuelCode] = useState<string | null>(null);
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [licenseCategory, setLicenseCategory] = useState<'A_B' | 'C_D'>('A_B'); // New State

  const joinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setStep('config');
      setJoinCode('');
      setBetAmount(20);

      const loadCoins = async () => {
        if (!profileId) return;
        const { data } = await supabase.from('profiles').select('coins').eq('id', profileId).single();
        if (data) setUserCoins(data.coins || 0);
      };
      loadCoins();

      if (initialTab === 'friend') {
        setTimeout(() => joinInputRef.current?.focus(), 600);
      }
    }
  }, [open, initialTab, profileId]);

  const handleAction = async (action: 'find_match' | 'create_duel') => {
    if (!profileId) return;
    if (betAmount > userCoins) {
      toast.error(`Недостаточно монет! Баланс: ${userCoins} `);
      return;
    }

    setIsProcessing(true);
    if (action === 'find_match') setStep('searching');

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action,
          profile_id: profileId,
          num_questions: numQuestions,
          difficulty: 'mix',
          bet_amount: betAmount,
          bet_type: betAmount > 0 ? 'fixed' : 'none',
          license_category: licenseCategory, // Pass new param
        },
      });

      if (error) throw error;

      if (action === 'find_match') {
        setTimeout(() => onDuelCreated(data.duel.id, data.duel.code), 1800);
      } else {
        setCreatedDuelCode(data.duel.code);
        setCreatedDuelId(data.duel.id);
        setStep('success');
        // Автоматическое копирование убрано - копирование теперь только по клику пользователя (строки 497-502)
      }
    } catch (error: any) {
      toast.error(extractErrorFromResponse(error) || 'Ошибка');
      setStep('config');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!profileId || joinCode.length < 4) return;
    setIsJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'join_duel', profile_id: profileId, code: joinCode.toUpperCase() },
      });
      if (error) throw error;
      onDuelCreated(data.duel.id, data.duel.code);
    } catch (error: any) {
      toast.error(extractErrorFromResponse(error) || 'Код не найден');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      hideCloseButton
      className="p-0 border-none sm:max-w-[500px] overflow-visible"
    >
      <div className="relative bg-background sm:rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col min-h-[580px]">
        {/* Background Visuals */}
        <div className="absolute top-0 inset-x-0 h-[280px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-60 -left-20 w-48 h-48 bg-violet-500/5 rounded-full blur-[60px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Swords className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground leading-none uppercase">БИТВА ЗНАНИЙ</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Арена активна</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-all active:scale-90 hover:rotate-90"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 relative z-20 px-8 pb-8 flex flex-col overflow-y-auto scrollbar-none">
          <AnimatePresence mode="wait">
            {step === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-6 pt-4"
              >
                {/* Modern Segmented Control */}
                <div className="flex p-1.5 bg-secondary/40 rounded-2xl backdrop-blur-md border border-white/10 dark:border-white/5 relative">
                  <motion.div
                    className="absolute inset-y-1.5 rounded-xl bg-background shadow-lg border border-black/5"
                    animate={{
                      x: activeTab === 'random' ? '0%' : '100%',
                      width: 'calc(50% - 6px)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <button
                    onClick={() => setActiveTab('random')}
                    className={cn(
                      "flex-1 relative z-10 py-3 text-sm font-black transition-all flex items-center justify-center gap-2",
                      activeTab === 'random' ? "text-primary" : "text-muted-foreground opacity-70 hover:opacity-100"
                    )}
                  >
                    <Zap className={cn("w-4 h-4", activeTab === 'random' && "fill-primary/20")} />
                    СЛУЧАЙНЫЙ
                  </button>
                  <button
                    onClick={() => setActiveTab('friend')}
                    className={cn(
                      "flex-1 relative z-10 py-3 text-sm font-black transition-all flex items-center justify-center gap-2",
                      activeTab === 'friend' ? "text-primary" : "text-muted-foreground opacity-70 hover:opacity-100"
                    )}
                  >
                    <Users className={cn("w-4 h-4", activeTab === 'friend' && "fill-primary/20")} />
                    С ДРУГОМ
                  </button>
                </div>

                {activeTab === 'random' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* UI Corrected Betting Block (Reactive Card) */}
                    <div
                      className={cn(
                        "relative rounded-[2rem] p-5 border-2 transition-all duration-300",
                        betAmount > 0
                          ? "bg-orange-500/10 border-orange-500 shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)]" // Active State: Aggressive Orange Glow
                          : "bg-secondary/30 border-transparent" // Training Mode: Passive Neutral
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                          betAmount > 0 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "text-muted-foreground/60"
                        )}>
                          {betAmount > 0 ? <Zap size={14} className="fill-current" /> : <Shield size={14} />}
                          {betAmount > 0 ? 'СТАВКА СДЕЛАНА' : 'РЕЖИМ ТРЕНИРОВКИ'}
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/40 text-[10px] font-black text-muted-foreground whitespace-nowrap">
                          <Coins className="w-3 h-3" />
                          {userCoins.toLocaleString()}
                        </div>
                      </div>

                      {/* Main Controller */}
                      <div className="flex items-center justify-between gap-4 mb-6">
                        {/* MINUS Button */}
                        <button
                          onClick={() => setBetAmount(Math.max(0, betAmount - 10))}
                          className="w-14 h-14 rounded-2xl bg-background shadow-sm border border-secondary flex items-center justify-center active:scale-95 transition-all hover:bg-secondary/40 disabled:opacity-30"
                          disabled={betAmount === 0}
                        >
                          <Minus size={24} className="text-muted-foreground" />
                        </button>

                        {/* CENTER DISPLAY */}
                        <div className="flex-1 flex flex-col items-center justify-center h-14">
                          <AnimatePresence mode="wait">
                            {betAmount === 0 ? (
                              <motion.span
                                key="free"
                                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, y: -5 }}
                                className="text-lg font-black text-muted-foreground tracking-widest uppercase"
                              >
                                БЕСПЛАТНО
                              </motion.span>
                            ) : (
                              <motion.div
                                key="amount"
                                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, y: -5 }}
                                className="flex items-center gap-2"
                              >
                                <span className="text-5xl font-black text-orange-500 tabular-nums tracking-tighter drop-shadow-[0_2px_15px_rgba(249,115,22,0.4)]">
                                  {betAmount}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/20 animate-pulse">
                                  <Coins className="w-5 h-5 text-orange-500" />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1 h-3">
                            {betAmount === 0 ? 'Без риска' : 'Победа удвоит сумму'}
                          </div>
                        </div>

                        {/* PLUS Button - High Call to Action */}
                        <button
                          onClick={() => setBetAmount(prev => Math.min(Math.floor(userCoins / 10) * 10, prev + 10))}
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all",
                            betAmount > 0
                              ? "bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600 hover:shadow-orange-500/50 hover:scale-105" // Aggressive State
                              : "bg-white text-black hover:bg-gray-100" // Neutral State
                          )}
                        >
                          <Plus size={24} />
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setBetAmount(0)}
                          className={cn(
                            "py-2.5 rounded-xl text-[11px] font-black transition-all border",
                            betAmount === 0
                              ? "bg-secondary border-secondary-foreground/10 text-foreground"
                              : "bg-secondary/30 border-transparent text-muted-foreground/60 hover:text-foreground"
                          )}
                        >
                          0
                        </button>

                        {[20, 50].map((val) => (
                          <button
                            key={val}
                            onClick={() => setBetAmount(val)}
                            disabled={val > userCoins}
                            className={cn(
                              "py-2.5 rounded-xl text-[11px] font-black transition-all border disabled:opacity-20 disabled:grayscale",
                              betAmount === val
                                ? "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20"
                                : "bg-secondary/30 border-transparent text-muted-foreground/60 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/20"
                            )}
                          >
                            {val}
                          </button>
                        ))}

                        <button
                          onClick={() => setBetAmount(Math.floor(userCoins / 10) * 10)}
                          className={cn(
                            "py-2.5 rounded-xl text-[11px] font-black transition-all border",
                            betAmount === Math.floor(userCoins / 10) * 10 && userCoins >= 10
                              ? "bg-orange-500 border-orange-600 text-white"
                              : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                          )}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* License Category Selector (Russia Only for now, but UI shows it regardless?) 
                        Actually, should check if user country is Russia? 
                        User explicitly asked for it. I'll add it. */}
                    <div className="bg-secondary/20 p-4 rounded-[1.5rem] border border-secondary/50 flex items-center justify-between">
                      <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-2">Категория прав</span>
                      <div className="flex bg-background rounded-xl p-1 shadow-sm border border-secondary">
                        <button
                          onClick={() => setLicenseCategory('A_B')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all",
                            licenseCategory === 'A_B' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          A / B
                        </button>
                        <button
                          onClick={() => setLicenseCategory('C_D')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all",
                            licenseCategory === 'C_D' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          C / D
                        </button>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-secondary/20 border border-secondary/50 space-y-4 relative overflow-hidden group">
                      <Activity className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 group-hover:scale-110 transition-transform" />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-none">Количество вопросов</span>
                        <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(79,70,229,0.2)]">{numQuestions}</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-5">
                        <Button variant="outline" size="icon" onClick={() => setNumQuestions(prev => Math.max(5, prev - 5))} className="rounded-xl h-11 w-11 border-none bg-background shadow-sm active:scale-90 transition-all">
                          <Minus className="w-5 h-5 text-primary" />
                        </Button>
                        <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" animate={{ width: `${(numQuestions / 30) * 100}% ` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setNumQuestions(prev => Math.min(30, prev + 5))} className="rounded-xl h-11 w-11 border-none bg-background shadow-sm active:scale-90 transition-all">
                          <Plus className="w-5 h-5 text-primary" />
                        </Button>
                      </div>
                    </div>

                    <div className="relative pt-2">
                      <LoadoutSelector />
                    </div>

                    <Button
                      onClick={() => handleAction('find_match')}
                      disabled={isProcessing}
                      className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white font-black text-xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all group overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {isProcessing ? (
                          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>ЗАВИСАНИЕ...</span>
                          </motion.div>
                        ) : (
                          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                            <Search className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            <span>НАЧАТЬ ПОИСК</span>
                            <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}><ArrowRight className="w-5 h-5" /></motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </div>
                )}

                {activeTab === 'friend' && (
                  <div className="space-y-8 pt-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pl-1">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-primary" /></div>
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Присоединиться к битве</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-center gap-4">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={cn(
                              "w-16 h-20 rounded-[1.25rem] bg-secondary/30 border-2 flex items-center justify-center text-4xl font-black transition-all relative overflow-hidden",
                              joinCode.length === i ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(79,70,229,0.1)] scale-110" : "border-secondary/50",
                              joinCode[i] ? "border-primary/50 text-foreground" : "text-muted-foreground/30"
                            )}>
                              {joinCode[i] || "•"}
                              {joinCode.length === i && (
                                <motion.div
                                  className="absolute bottom-4 inset-x-4 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(79,70,229,1)]"
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <Input
                          ref={joinInputRef}
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                          className="absolute inset-0 opacity-0 cursor-default"
                          maxLength={4}
                        />
                      </div>
                      <AnimatePresence>
                        {joinCode.length === 4 && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Button
                              onClick={handleJoinByCode}
                              disabled={isJoining}
                              className="w-full h-16 rounded-[1.5rem] bg-indigo-500 text-white font-black text-base shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all"
                            >
                              {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="flex items-center gap-2"><span>ПОДКЛЮЧИТЬСЯ К СЕССИИ</span><ArrowRight className="w-5 h-5" /></div>}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative py-2 mt-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-secondary/50" /></div>
                      <div className="relative flex justify-center"><span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic">ИЛИ ПРОВЕСТИ СВОЮ</span></div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-secondary/10 border border-secondary/50 text-center space-y-5 relative overflow-hidden group">
                      <Globe className="absolute -right-6 -bottom-6 w-32 h-32 text-indigo-500/5 group-hover:rotate-12 transition-transform duration-1000" />
                      <h4 className="font-black text-xs uppercase tracking-widest text-foreground relative z-10">Создать защищенную комнату</h4>
                      <p className="text-xs text-muted-foreground font-medium max-w-[200px] mx-auto relative z-10">Сгенерируй код и отправь его другу для мгновенного начала</p>
                      <Button
                        variant="outline"
                        onClick={() => handleAction('create_duel')}
                        disabled={isProcessing}
                        className="w-full h-14 rounded-2xl border-2 border-indigo-500/20 hover:bg-indigo-500/5 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black transition-all relative z-10 shadow-sm"
                      >
                        {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <div className="flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" /><span>СГЕНЕРИРОВАТЬ КЛЮЧ</span></div>}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'searching' && (
              <motion.div
                key="searching"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="relative w-48 h-48 mb-12">
                  {/* Animated Pulse Rings */}
                  <motion.div animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} className="absolute inset-0 bg-primary/20 rounded-full" />
                  <motion.div animate={{ scale: [1, 2.2], opacity: [0.3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeOut" }} className="absolute inset-0 bg-primary/10 rounded-full" />

                  {/* Rotating Scanner Circle */}
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-2 border-2 border-dashed border-primary/40 rounded-full" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute inset-6 border border-primary/20 rounded-full" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 rounded-[2rem] bg-primary shadow-[0_20px_50px_rgba(79,70,229,0.5)] flex items-center justify-center"
                    >
                      <Search className="w-10 h-10 text-white" />
                    </motion.div>
                  </div>
                </div>
                <h3 className="text-4xl font-black uppercase tracking-tight text-foreground">СКАНЕР...</h3>
                <p className="text-xs font-black text-primary animate-pulse tracking-[0.4em] uppercase mt-3">ПОДБОР РАВНОГО ПРОТИВНИКА</p>
                <Button onClick={() => setStep('config')} variant="ghost" className="mt-14 text-muted-foreground hover:text-destructive font-black opacity-60 hover:opacity-100 transition-all uppercase tracking-widest text-[10px]">Прервать соединение</Button>
              </motion.div>
            )}

            {step === 'success' && createdDuelCode && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 py-10 text-center"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl" />
                  <div className="relative z-10 w-full h-full rounded-3xl bg-emerald-500 flex items-center justify-center shadow-[0_20px_40px_rgba(16,185,129,0.4)]">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-foreground leading-none uppercase tracking-tight">ДОСТУП ОТКРЫТ</h2>
                  <p className="text-sm text-muted-foreground font-medium mt-3 italic opacity-80">Передай этот код оппоненту для входа</p>
                </div>

                <div
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(createdDuelCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast.success('Скопировано');
                    } catch (error) {
                      // Fallback для devices где clipboard API заблокирован
                      console.log('Clipboard API blocked:', error);
                      toast.error('Не удалось скопировать. Скопируйте код вручную: ' + createdDuelCode);
                    }
                  }}
                  className="group relative p-12 rounded-[3.5rem] bg-secondary/10 border-4 border-secondary border-dashed cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center"
                >
                  <span className="text-7xl font-black tracking-[0.1em] text-emerald-500 font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    {createdDuelCode}
                  </span>
                  <div className={cn(
                    "absolute top-6 right-6 p-2.5 rounded-xl transition-all",
                    copied ? "bg-emerald-500 text-white" : "bg-white/80 dark:bg-zinc-800 text-emerald-500 border border-secondary shadow-sm"
                  )}>
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </div>
                  {copied && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">Код успешно скопирован</motion.div>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={() => onDuelCreated(createdDuelId!, createdDuelCode!)}
                    className="flex-1 h-18 rounded-[1.75rem] bg-foreground text-background font-black text-xl hover:scale-[1.05] transition-all shadow-2xl"
                  >
                    ВОЙТИ В ЛОББИ
                  </Button>
                  {isTelegramMiniApp() && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/games/duel?join=' + createdDuelCode)}&text=${encodeURIComponent(`Сразись со мной в дуэли! Код: ${createdDuelCode}`)}`;
                        (window as any).Telegram?.WebApp?.openTelegramLink?.(shareUrl);
                      }}
                      className="h-18 w-18 rounded-[1.75rem] border-2 flex-shrink-0 hover:bg-primary/5 hover:border-primary transition-all group"
                    >
                      <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </Button >
                  )}
                </div >
              </motion.div >
            )}
          </AnimatePresence >
        </div >
      </div >
    </ResponsiveModal >
  );
}
