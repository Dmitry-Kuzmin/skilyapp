// =====================================================================
// LevelUpCelebrationModal — Duolingo-style level-up popup
//
// Mobile: full-screen festival overlay
// Desktop: large centered modal with backdrop
//
// Features:
//   - Confetti burst (premium-tier feel)
//   - Animated level number (pop + glow)
//   - Reward card with rarity coloring
//   - One-tap CLAIM button → calls duel-pass-claim Edge Function
//   - Free + Premium rewards shown side-by-side
//   - Haptic feedback (Telegram)
//   - Sound (if enabled)
//   - Locks scroll, dismisses on backdrop tap
// =====================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import {
  Trophy, Sparkles, Coins, Zap, Crown, Star, Gift, Lock,
  CheckCircle2, X, Loader2,
} from 'lucide-react';
import { useLevelUpStore } from '@/store/levelUpStore';
import { useUserContext } from '@/contexts/UserContext';
import { getSupabaseClient } from '@/integrations/supabase/lazyClient';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RewardData {
  type: string;
  amount?: number;
  name?: string;
  description?: string;
  rarity?: string;
  icon?: string;
}

interface LevelRewards {
  free?: RewardData | null;
  premium?: RewardData | null;
}

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common:    { bg: 'from-slate-500/15 to-slate-600/10',     border: 'border-slate-400/30',  text: 'text-slate-200',   glow: 'rgba(148,163,184,0.4)' },
  rare:      { bg: 'from-blue-500/20 to-indigo-500/15',     border: 'border-blue-400/40',   text: 'text-blue-200',    glow: 'rgba(96,165,250,0.5)'  },
  epic:      { bg: 'from-purple-500/25 to-fuchsia-500/15',  border: 'border-purple-400/50', text: 'text-purple-200',  glow: 'rgba(192,132,252,0.6)' },
  legendary: { bg: 'from-amber-500/25 to-orange-500/20',    border: 'border-amber-400/60', text: 'text-amber-200',   glow: 'rgba(251,191,36,0.7)'  },
};

function rewardIcon(type: string) {
  switch (type) {
    case 'coins':         return Coins;
    case 'boost':         return Zap;
    case 'skin':          return Sparkles;
    case 'badge':         return Star;
    case 'sticker':       return Gift;
    case 'premium_pass':  return Crown;
    default:              return Gift;
  }
}

function rewardLabel(r: RewardData): string {
  if (r.name) return r.name;
  if (r.type === 'coins')  return `${r.amount ?? 0} монет`;
  if (r.type === 'boost')  return r.description || 'Boost';
  return r.type.replace('_', ' ');
}

export const LevelUpCelebrationModal: React.FC = () => {
  const pending = useLevelUpStore((s) => s.pending);
  const dismiss = useLevelUpStore((s) => s.dismiss);
  const { profileId, isPremium } = useUserContext();
  const queryClient = useQueryClient();

  const [rewards, setRewards] = useState<LevelRewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 360, height: 800 });

  // ── Размеры окна для confetti ─────────────────────────────────────────
  useEffect(() => {
    const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Загрузка наград для уровня ────────────────────────────────────────
  useEffect(() => {
    if (!pending) {
      setRewards(null);
      setClaimed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = await getSupabaseClient();
        // Активный сезон
        const { data: seasons } = await supabase.rpc('get_active_season');
        const seasonId = seasons?.[0]?.id;
        if (!seasonId) { setRewards({}); return; }

        const { data } = await supabase
          .from('duel_pass_season_rewards')
          .select('free_reward, premium_reward')
          .eq('season_id', seasonId)
          .eq('level', pending.newLevel)
          .maybeSingle();

        if (!cancelled) {
          setRewards({
            free: data?.free_reward ?? null,
            premium: data?.premium_reward ?? null,
          });
        }
      } catch (err) {
        console.error('[LevelUpModal] failed to load rewards', err);
        if (!cancelled) setRewards({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Звук + хаптика на открытие
    try { haptics.success(); } catch {}
    try { sounds.victory(); } catch {}

    return () => { cancelled = true; };
  }, [pending]);

  // ── Lock scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [pending]);

  const handleClaim = async () => {
    if (!pending || !profileId || claiming || claimed) return;
    setClaiming(true);
    try { haptics.medium(); } catch {}

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('duel-pass-claim', {
        body: {
          user_id: profileId,
          level: pending.newLevel,
          is_premium: isPremium,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setClaimed(true);
      try { haptics.success(); } catch {}
      try { sounds.confetti(); } catch {}

      // Обновляем кэши
      queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
      queryClient.invalidateQueries({ queryKey: ['duel-pass-info', profileId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-complete'] });

      // Закрываем через 1.5с — чтобы юзер увидел "claimed" состояние
      setTimeout(() => dismiss(), 1500);
    } catch (err: any) {
      console.error('[LevelUpModal] claim error', err);
      const msg = err?.message || 'Не удалось забрать награду';
      // Уже забрано — это не ошибка, считаем успешным
      if (msg.includes('already') || msg.includes('claimed')) {
        setClaimed(true);
        setTimeout(() => dismiss(), 1500);
      } else {
        toast.error('Ошибка получения награды', { description: msg });
        setClaiming(false);
      }
    }
  };

  const handleSkip = () => {
    try { haptics.selectionChanged(); } catch {}
    dismiss();
  };

  // Решаем какую награду показать как «главную»
  const primaryReward = useMemo<RewardData | null>(() => {
    if (!rewards) return null;
    return (isPremium && rewards.premium) ? rewards.premium : rewards.free;
  }, [rewards, isPremium]);

  const lockedPremiumReward = !isPremium && rewards?.premium ? rewards.premium : null;

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          key="level-up-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* ── CONFETTI BURST ─────────────────────────────────────────── */}
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={350}
            recycle={false}
            gravity={0.18}
            initialVelocityY={20}
            colors={['#fbbf24', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#10b981']}
            tweenDuration={6000}
            style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
          />

          {/* ── Animated background gradient orbs ───────────────────────── */}
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/30 blur-[120px]"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/30 blur-[120px]"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[140px]"
            />
          </motion.div>

          {/* ── Skip button (top-right) ────────────────────────────────── */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 z-50"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>

          {/* ── MAIN CARD ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
            className="relative w-full max-w-md mx-4 sm:mx-auto h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
          >
            <div
              className="relative flex-1 sm:flex-initial flex flex-col rounded-none sm:rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #1a1535 0%, #0f0a24 60%, #1a1535 100%)',
                boxShadow: '0 30px 90px rgba(168,85,247,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
              }}
            >
              {/* Animated top accent line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              <div className="flex-1 sm:flex-initial overflow-y-auto px-6 sm:px-8 pt-12 sm:pt-10 pb-6">

                {/* ── TROPHY с свечением ──────────────────────────────── */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
                  className="flex justify-center mb-4"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full blur-3xl"
                      style={{ backgroundColor: '#fbbf24' }}
                    />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.7)]">
                      <Trophy className="w-12 h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                    </div>
                    {/* Орбитальные звёзды */}
                    {[0, 120, 240].map((angle, i) => (
                      <motion.div
                        key={angle}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6 + i, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0"
                        style={{ transformOrigin: 'center' }}
                      >
                        <Star
                          className="absolute text-amber-300 fill-amber-300"
                          size={14}
                          style={{
                            top: '-6px',
                            left: '50%',
                            transform: `translateX(-50%) rotate(${angle}deg) translateY(-50px) rotate(-${angle}deg)`,
                            filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))',
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* ── ЗАГОЛОВОК ───────────────────────────────────────── */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mb-1"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] font-black text-amber-300/80 mb-2">
                    Новый уровень
                  </p>
                </motion.div>

                {/* ── НОМЕР УРОВНЯ ────────────────────────────────────── */}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.5 }}
                  className="text-center mb-6"
                >
                  <div className="inline-flex items-baseline gap-2">
                    <span
                      className="text-7xl sm:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500"
                      style={{
                        filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.6))',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {pending.newLevel}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mt-2 font-semibold">Duel Pass</p>
                </motion.div>

                {/* ── НАГРАДА ─────────────────────────────────────────── */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  {loading ? (
                    <div className="h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                    </div>
                  ) : primaryReward ? (
                    <RewardCard reward={primaryReward} primary />
                  ) : (
                    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-sm">
                      Награда уже получена ранее
                    </div>
                  )}

                  {/* Премиум-награда (если юзер не премиум — показываем locked) */}
                  {lockedPremiumReward && (
                    <div className="mt-3">
                      <RewardCard reward={lockedPremiumReward} locked />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* ── CTA BUTTONS ──────────────────────────────────────── */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="px-6 sm:px-8 pb-8 sm:pb-6 pt-2 space-y-3"
              >
                <button
                  onClick={handleClaim}
                  disabled={claiming || !primaryReward}
                  className={cn(
                    "w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider relative overflow-hidden group transition-all active:scale-[0.98]",
                    claimed
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)]"
                      : !primaryReward
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-amber-950 shadow-[0_8px_30px_rgba(251,191,36,0.5)]"
                  )}
                >
                  {!claimed && !claiming && primaryReward && (
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {claiming ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Получаем...</>
                    ) : claimed ? (
                      <><CheckCircle2 className="w-5 h-5" /> Получено!</>
                    ) : (
                      <><Gift className="w-5 h-5" /> Забрать награду</>
                    )}
                  </span>
                </button>

                {!claimed && (
                  <button
                    onClick={handleSkip}
                    className="w-full h-10 text-sm text-white/40 hover:text-white/70 font-semibold transition-colors"
                  >
                    Позже
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =====================================================================
// RewardCard — карточка награды (primary / locked)
// =====================================================================

const RewardCard: React.FC<{ reward: RewardData; primary?: boolean; locked?: boolean }> = ({
  reward, primary, locked,
}) => {
  const Icon = rewardIcon(reward.type);
  const rarity = (reward.rarity || 'common') as keyof typeof RARITY_STYLES;
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  return (
    <motion.div
      whileHover={!locked ? { scale: 1.02 } : undefined}
      className={cn(
        "relative rounded-2xl border p-4 backdrop-blur-md overflow-hidden",
        "bg-gradient-to-br", style.bg, style.border,
        locked && "opacity-50 grayscale",
        primary && "shadow-lg",
      )}
      style={primary && !locked ? { boxShadow: `0 0 30px ${style.glow}` } : undefined}
    >
      {/* Rarity shimmer */}
      {primary && !locked && rarity !== 'common' && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
        />
      )}

      <div className="relative flex items-center gap-3">
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
          locked ? "bg-white/5" : "bg-white/10",
        )}>
          {locked ? (
            <Lock className="w-6 h-6 text-white/40" />
          ) : (
            <Icon className={cn("w-7 h-7", style.text)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn("font-black text-lg leading-tight truncate", style.text)}>
              {rewardLabel(reward)}
            </p>
            {reward.amount && reward.type === 'coins' && (
              <span className="text-amber-300 font-black text-lg shrink-0">+{reward.amount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {locked ? (
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                Premium only
              </span>
            ) : (
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border",
                style.text, style.border,
              )}>
                {rarity}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
