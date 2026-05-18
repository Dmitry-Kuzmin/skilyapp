import { useState, useEffect, useCallback, useRef, useContext, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { cn } from '@/lib/utils';
import {
  playCelebrationSoundFanfare,
  playCelebrationSoundPop,
  playSuccessSound,
  playAlertSound,
  playLevelUpSound,
} from '@/services/audioService';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { 
  Loader2, 
  ShieldCheck, 
  RefreshCw, 
  Trophy, 
  Zap, 
  Star,
  Target,
  Rocket,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { UserContext } from '@/contexts/UserContext';
import { RankIcon, getRankFromLevel } from '@/components/ranking/RankBadge';
import { useLanguage } from '@/contexts/LanguageContext';


const DuelPassLeaderboardView = lazy(() =>
  import('@/components/leaderboard/DuelPassLeaderboardModal').then(m => ({
    default: m.DuelPassLeaderboardView,
  }))
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankChange {
  prev_rank: number;
  new_rank: number;
  overtaken: Array<{
    user_id: string;
    sp: number;
    level?: number;
    first_name: string | null;
    username: string | null;
    photo_url: string | null;
  }>;
}

export interface CelebrationData {
  score: number;           // 0–100 percent
  correctCount: number;
  totalQuestions: number;
  timeSeconds: number;
  spAwarded: number;
  xpAwarded: number;
  currentSP: number;       // total SP after this test
  currentLevel: number;    // level after this test
  isPassed: boolean;
  mode: string;
  testId?: string;
  failedTopics: string[];  // topic titles of wrong answers
  leveledUp: boolean;
  rankChange?: RankChange;
}

interface Props {
  data: CelebrationData;
  onFinish: () => void;
  onRetry?: () => void;
}

// ─── Safe-area constants ─────────────────────────────────────────────────────

const SAFE_TOP = 'max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px), 16px)';
const SAFE_BOTTOM = 'max(env(safe-area-inset-bottom), 20px)';

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, startDelay = 400, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    setValue(0);
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * target));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, startDelay, duration]);
  return value;
}

// ─── Floating sparkles ───────────────────────────────────────────────────────

function Sparkles({ color }: { color: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5], y: [0, -30, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Progress dot navigation ─────────────────────────────────────────────────

function SlideDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-white"
          animate={{ width: i === current ? 20 : 6, opacity: i === current ? 1 : 0.3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ height: 6 }}
        />
      ))}
    </div>
  );
}

// ─── Format time ─────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Slide backgrounds & sounds ──────────────────────────────────────────────

type SlideId = 'result' | 'sp' | 'personal_best' | 'xp' | 'exam_readiness' | 'topics' | 'cta';

const SLIDE_STYLES: Record<SlideId, { bg: string; glow: string; sparkle: string }> = {
  result:          { bg: 'from-[#050505] via-[#0a0a0c] to-[#050505]', glow: '', sparkle: 'transparent' },
  sp:              { bg: 'from-zinc-950 via-indigo-950/40 to-zinc-950', glow: 'bg-indigo-500/20', sparkle: '#818cf8' },
  personal_best:   { bg: 'from-zinc-950 via-emerald-950/40 to-zinc-950', glow: 'bg-emerald-500/20', sparkle: '#10b981' },
  xp:              { bg: 'from-zinc-950 via-amber-950/40 to-zinc-950',  glow: 'bg-amber-500/20',  sparkle: '#fbbf24' },
  exam_readiness:  { bg: 'from-zinc-950 via-cyan-950/40 to-zinc-950',  glow: 'bg-cyan-500/20',   sparkle: '#06b6d4' },
  topics:          { bg: 'from-zinc-950 via-orange-950/40 to-zinc-950', glow: 'bg-orange-500/15', sparkle: '#fb923c' },
  cta:             { bg: 'from-zinc-950 via-violet-950/40 to-zinc-950', glow: 'bg-violet-500/15', sparkle: '#a78bfa' },
};

// ─── Individual slides ───────────────────────────────────────────────────────

function SlideResult({ data }: { data: CelebrationData }) {
  const { t } = useLanguage();
  const scoreCount = useCountUp(data.correctCount, 600, 1000);
  const isPassed = data.isPassed;
  
  // Рассчитываем длину дуги для кругового прогресса
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center relative">
      {isPassed && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={250}
          gravity={0.2}
          colors={['#22c55e', '#86efac', '#4ade80', '#ffffff', '#fbbf24', '#3b82f6']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 5 }}
        />
      )}

      {/* Main Score Glass Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col items-center gap-6"
      >
        {/* Animated Glow behind everything */}
        <div className={cn(
          "absolute inset-0 rounded-[3rem] blur-[60px] opacity-20 -z-10",
          isPassed ? "bg-green-500" : "bg-red-500"
        )} />

        {/* Circular Progress & Emoji */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              className="text-white/5"
            />
            {/* Progress circle */}
            <motion.circle
              cx="96"
              cy="96"
              r={radius}
              fill="transparent"
              stroke={isPassed ? "#22c55e" : "#ef4444"}
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progressOffset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              strokeLinecap="round"
            />
          </svg>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center z-10 shadow-inner relative group',
              isPassed ? 'bg-green-500/10' : 'bg-red-500/10',
            )}
          >
            {isPassed ? (
              <Trophy className="w-16 h-16 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            )}
          </motion.div>
        </div>

        {/* Status & Stats */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            <span className={cn(
              'text-xs font-black uppercase tracking-[0.4em] px-4 py-1 rounded-full border',
              isPassed 
                ? 'text-green-400 border-green-500/30 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                : 'text-red-400 border-red-500/30 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
            )}>
              {isPassed ? t('celebration.testPassed') : t('celebration.tryAgain')}
            </span>
          </motion.div>


          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">
                {scoreCount}
              </span>
              <span className="text-2xl font-bold text-white/30">/{data.totalQuestions}</span>
            </div>
            <p className="text-sm font-bold text-white/50 tracking-wider uppercase mt-1">
              {t('celebration.correctAnswers')}
            </p>

          </motion.div>
        </div>
      </motion.div>

      {/* Accuracy & Time Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex gap-4"
      >
        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{t('celebration.accuracy')}</span>
          <span className="text-xl font-black text-white">{data.score}%</span>
        </div>
        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{t('celebration.time')}</span>
          <span className="text-xl font-black text-white">{fmtTime(data.timeSeconds)}</span>
        </div>

      </motion.div>
    </div>
  );
}

// ─── Leaderboard climb mini-table ─────────────────────────────────────────────

type ClimbRow = {
  key: string;
  isYou: boolean;
  name: string;
  sp: number;
  rank: number;
  level: number;
  userId?: string;
  photoUrl?: string | null;
};

// Rank position circle — same colors as DuelPass leaderboard
function RankCircle({ rank }: { rank: number }) {
  return (
    <div className="w-10 flex items-center justify-center shrink-0">
      <span className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg shadow-black/20',
        rank === 1 ? 'bg-yellow-400 text-yellow-950' :
          rank === 2 ? 'bg-slate-300 text-slate-800' :
            rank === 3 ? 'bg-orange-500 text-orange-50' :
              'bg-white/5 text-white/50'
      )}>
        {rank}
      </span>
    </div>
  );
}

function LeaderboardClimb({
  rankChange,
  userId,
  currentSP,
  onOpenLeaderboard,
}: {
  rankChange: RankChange;
  userId?: string;
  currentSP: number;
  onOpenLeaderboard: () => void;
}) {
  const { prev_rank, new_rank, overtaken } = rankChange;
  const { t } = useLanguage();
  const climbed = new_rank < prev_rank;
  const overtakenCount = climbed ? prev_rank - new_rank : 0;

  const youRow: ClimbRow = {
    key: 'you',
    isYou: true,
    name: t('celebration.you'),
    sp: currentSP,
    rank: prev_rank,

    level: 0,
    userId,
  };

  // Context rows (overtaken in climb; neighbors above in static) — sorted by SP desc
  const overtakenRows: ClimbRow[] = overtaken
    .slice(0, 2)
    .map((u) => ({
      key: `o-${u.user_id}`,
      isYou: false,
      name: u.first_name || u.username || t('celebration.player'),
      sp: u.sp,
      rank: 0,

      level: u.level ?? 0,
      userId: u.user_id,
      photoUrl: u.photo_url,
    }))
    .sort((a, b) => b.sp - a.sp);

  // Initial: context rows ABOVE you, YOU at bottom
  const initialOrder: ClimbRow[] = overtakenRows.length > 0
    ? [...overtakenRows, youRow]
    : [youRow];

  // After climb: YOU on top, context rows below
  const finalOrder: ClimbRow[] = [youRow, ...overtakenRows];

  const initialRows: ClimbRow[] = initialOrder.map((row) => {
    if (row.isYou) return { ...row, rank: prev_rank };
    const idx = overtakenRows.findIndex(r => r.key === row.key);
    return { ...row, rank: prev_rank - 1 - idx };
  });

  const finalRows: ClimbRow[] = finalOrder.map((row, i) => {
    if (row.isYou) return { ...row, rank: new_rank };
    const youIdx = finalOrder.findIndex(r => r.isYou);
    return { ...row, rank: new_rank + (i - youIdx) };
  });

  const [order, setOrder] = useState<ClimbRow[]>(initialRows);
  const [animating, setAnimating] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current || !climbed || overtakenRows.length === 0) return;
    triggeredRef.current = true;
    const t = setTimeout(() => {
      setAnimating(true);
      setOrder(finalRows);
      try { haptics.medium(); } catch { /* noop */ }
      try { playCelebrationSoundPop(); } catch { /* noop */ }
      setTimeout(() => { try { haptics.success(); } catch { /* noop */ } }, 600);
    }, 1500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="w-full max-w-sm flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-widest font-black text-white/40">
        <span>{t('celebration.seasonRanking')}</span>
        <motion.span

          key={animating ? 'after' : 'before'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('font-mono', climbed && animating ? 'text-emerald-400' : 'text-white/40')}
        >
          {climbed && animating ? `↑ #${prev_rank} → #${new_rank}` : `#${prev_rank}`}
        </motion.span>
      </div>

      {/* Rows — DuelPass style */}
      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {order.map((row) => (
            <motion.div
              key={row.key}
              layout
              layoutId={`climb-${row.key}`}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{
                layout: { type: 'spring', stiffness: 380, damping: 32 },
                opacity: { duration: 0.2 },
              }}
              className={cn(
                'flex items-center p-3 rounded-2xl transition-all backdrop-blur-md',
                row.isYou
                  ? 'bg-gradient-to-r from-indigo-600/80 to-blue-600/80 border border-white/10 shadow-[0_8px_32px_rgba(79,70,229,0.35)]'
                  : 'bg-white/[0.03] border border-white/[0.05]'
              )}
            >
              {/* Rank circle */}
              <RankCircle rank={row.rank} />

              {/* Avatar + name + rank icon */}
              <div className="flex-1 ml-3 flex items-center gap-2.5 min-w-0">
                {row.isYou && row.userId ? (
                  <UserAvatar
                    profileId={row.userId}
                    size="sm"
                    showPremiumGlow={false}
                    avatarClassName="rounded-full"
                    className="rounded-full ring-2 ring-white/30 shrink-0"
                  />
                ) : row.photoUrl ? (
                  <img
                    src={row.photoUrl}
                    alt={row.name}
                    className="w-8 h-8 rounded-full ring-1 ring-white/10 object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 ring-1 ring-white/20 shrink-0 flex items-center justify-center text-xs font-black text-white">
                    {row.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <p className={cn(
                    'font-bold text-sm truncate',
                    row.isYou ? 'text-white' : 'text-white/80'
                  )}>
                    {row.name}
                  </p>
                  {row.level > 0 && (
                    <div className="shrink-0">
                      <RankIcon rank={getRankFromLevel(row.level)} size="xs" />
                    </div>
                  )}
                </div>
              </div>

              {/* SP */}
              <div className="shrink-0 text-right pl-2">
                <span className={cn(
                  'font-mono font-black tabular-nums tracking-tighter',
                  row.isYou ? 'text-white text-base' : 'text-white/70 text-sm'
                )}>
                  {row.sp > 0 ? row.sp.toLocaleString('ru-RU') : '—'}
                  <span className="text-[9px] ml-1 opacity-50 uppercase font-black">SP</span>
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Climb result message */}
      {climbed && animating && overtakenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center text-emerald-400 text-xs font-black tracking-wide"
        >
          {t('celebration.overtookPlayers', { 
            count: overtakenCount, 
            plural: t(overtakenCount === 1 ? 'celebration.overtookPlural_one' : 'celebration.overtookPlural_other')
          })}
        </motion.div>

      )}

      {/* CTA */}
      <button
        onClick={onOpenLeaderboard}
        className="text-white/50 text-xs font-semibold text-center hover:text-white/80 transition-colors"
      >
        {t('celebration.fullRanking')}
      </button>

    </motion.div>
  );
}

function SlideSP({ data, onOpenLeaderboard, currentUserId, prefetchedRank, userRealSP }: { data: CelebrationData; onOpenLeaderboard: () => void; currentUserId?: string; prefetchedRank: RankChange | null; userRealSP: number | null }) {
  const { t } = useLanguage();
  const sp = useCountUp(data.spAwarded, 400);

  const nextLevelSP = (data.currentLevel + 1) * 100;
  const prevSP = data.currentSP - data.spAwarded;
  const fillBefore = Math.min(prevSP % 100, 100);
  const fillAfter = Math.min(data.currentSP % 100, 100) || (data.currentSP >= nextLevelSP ? 100 : 0);

  const effectiveRankChange = data.rankChange ?? prefetchedRank;

  const hasSpData = data.spAwarded > 0;

  return (
    <div className="flex flex-col items-center justify-start h-full gap-5 px-6 text-center">
      {hasSpData ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative w-full max-w-sm p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 ring-4 ring-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Star className="w-12 h-12 text-indigo-400 fill-indigo-400/20" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full bg-indigo-400/10"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Season Points</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white/40">+</span>
              <span className="text-7xl font-black text-white tabular-nums leading-none">{sp}</span>
              <span className="text-2xl font-bold text-indigo-400 ml-1">SP</span>
            </div>
            {data.spAwarded > 8 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 }}
                className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-2"
              >
                +{data.spAwarded - data.correctCount * 2} {t('celebration.bonus')}
              </motion.span>

            )}
          </motion.div>

          {/* Level progress */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="w-full flex flex-col gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between text-[10px] text-white/50 font-black uppercase tracking-wider">
              <span>{t('celebration.level')} {data.currentLevel}</span>
              <span className="tabular-nums">{data.currentSP} / {nextLevelSP}</span>
            </div>

            <div className="h-3 rounded-full bg-black/40 overflow-hidden relative border border-white/5">
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ width: `${fillBefore}%` }}
                animate={{ width: `${fillAfter}%` }}
                transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        /* SP=0 case: show season leaderboard header instead */
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-indigo-500/15 ring-3 ring-indigo-500/30 flex items-center justify-center mt-2">
            <Trophy className="w-10 h-10 text-indigo-400/60" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mt-1">{t('celebration.seasonLeaderboard')}</span>
          <p className="text-white/40 text-xs max-w-[220px]">{t('celebration.currentPosition')}</p>
        </motion.div>

      )}

      {/* Climb mini-leaderboard (server-powered or client fallback) */}
      {effectiveRankChange ? (
        <LeaderboardClimb
          rankChange={effectiveRankChange}
          userId={currentUserId}
          currentSP={userRealSP ?? data.currentSP}
          onOpenLeaderboard={onOpenLeaderboard}
        />
      ) : (
        /* Loading state while fetching fallback position */
        currentUserId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/30 text-xs"
          >
            {t('celebration.loadingPosition')}
          </motion.div>

        )
      )}
    </div>
  );
}

type PersonalBestData = { best: number; attempts: number } | null;

function SlidePersonalBest({ data, personalBest }: { data: CelebrationData; personalBest: PersonalBestData }) {
  const { t } = useLanguage();
  const { correctCount, totalQuestions } = data;

  const isFirst   = !personalBest || personalBest.attempts <= 1;
  const isRecord  = !isFirst && correctCount >= personalBest!.best;
  const prevBest  = personalBest?.best ?? correctCount;
  const gap       = prevBest - correctCount; // > 0 means below record

  const scoreCount = useCountUp(correctCount, 300, 800);
  const prevCount  = useCountUp(isRecord && !isFirst ? prevBest : 0, 200, 600);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-7"
      >
        {/* Ambient glow */}
        <div className={cn(
          "absolute inset-0 rounded-[3rem] blur-[60px] opacity-15 -z-10",
          isRecord || isFirst ? "bg-emerald-500" : "bg-white"
        )} />

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className={cn(
            "w-28 h-28 rounded-full flex items-center justify-center text-6xl",
            isRecord || isFirst
              ? "bg-emerald-500/20 ring-4 ring-emerald-500/40"
              : "bg-white/5 ring-4 ring-white/10"
          )}
        >
          {isFirst ? '✨' : isRecord ? '🏆' : '🎯'}
        </motion.div>

        {/* Label */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col items-center gap-1">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.35em]",
            isRecord || isFirst ? "text-emerald-400" : "text-white/40"
          )}>
            {isFirst ? t('celebration.firstResult') : isRecord ? t('celebration.newRecord') : t('celebration.personalBest')}
          </span>


          {/* Score display */}
          {isRecord && !isFirst ? (
            /* Animated: old → new */
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-black text-white/30 tabular-nums line-through">{prevCount}/{totalQuestions}</span>
              <span className="text-white/40 text-xl">→</span>
              <span className="text-5xl font-black text-emerald-300 tabular-nums">{scoreCount}/{totalQuestions}</span>
            </div>
          ) : (
            <span className={cn(
              "tabular-nums font-black leading-none mt-1",
              isFirst ? "text-6xl text-white" : "text-5xl text-white/50"
            )}>
              {scoreCount}<span className="text-white/30 font-bold text-3xl">/{totalQuestions}</span>
            </span>
          )}
        </motion.div>

        {/* Bottom context */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full">
          {isFirst && (
            <p className="text-white/40 text-sm">{t('celebration.recordSet')}</p>
          )}

          {isRecord && !isFirst && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-400 font-black text-sm">+{correctCount - prevBest}{t('celebration.toRecord')}</span>
            </div>
          )}

          {!isFirst && !isRecord && (
            <div className="w-full bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-white/40">{t('celebration.today')}</span>
                <span className="text-white/80">{correctCount}/{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-emerald-400">{t('celebration.record')}</span>
                <span className="text-emerald-300">{prevBest}/{totalQuestions}</span>
              </div>
              <div className="h-px bg-white/5" />
              <p className="text-[11px] text-white/30 font-bold uppercase tracking-wider">
                {t('celebration.moreToRecord', {
                  count: gap,
                  plural: t(gap === 1 ? 'celebration.moreToRecordPlural_one' : gap < 5 ? 'celebration.moreToRecordPlural_few' : 'celebration.moreToRecordPlural_other')
                })}
              </p>
            </div>
          )}

        </motion.div>
      </motion.div>
    </div>
  );
}

function SlideXP({ data }: { data: CelebrationData }) {
  const { t } = useLanguage();
  const xp = useCountUp(data.xpAwarded, 400);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-8"
      >
        <motion.div
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-amber-500/20 ring-4 ring-amber-500/40 flex items-center justify-center shadow-inner">
            <Zap className="w-16 h-16 text-amber-400 fill-amber-400/20 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-amber-400/10"
            animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400">{t('celebration.xpEarned')}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-white/40">+</span>
            <span className="text-8xl font-black text-white tabular-nums leading-none">{xp}</span>
            <span className="text-3xl font-bold text-amber-400 ml-1">XP</span>
          </div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-4">{t('celebration.movingToMastery')}</p>
        </motion.div>

      </motion.div>
    </div>
  );
}

function SlideTopics({ topics, onPractice }: { topics: string[]; onPractice: () => void }) {
  const { t } = useLanguage();
  const shown = topics.slice(0, 4);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-7 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm p-8 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-7"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-orange-500/15 ring-4 ring-orange-500/30 flex items-center justify-center"
        >
          <Target className="w-12 h-12 text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400">{t('celebration.workOn')}</span>
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase">{t('celebration.topicsToReview')}</p>
        </motion.div>


        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="w-full flex flex-col gap-3">
          {shown.map((topic, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/5 border border-white/5 text-left group hover:bg-white/10 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-white/90 font-bold leading-tight flex-1">{topic}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </div>
  );
}

function SlideExamReadiness({ before, after }: { before: number; after: number }) {
  const { t } = useLanguage();
  const delta = after - before;

  const afterCount = useCountUp(after, 500, 1000);

  const label =
    after >= 90 ? t('celebration.readyForExam') :
    after >= 70 ? t('celebration.excellentProgress') :
    t('celebration.everyTestIncreases');


  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-7"
      >
        <div className="absolute inset-0 rounded-[3rem] blur-[60px] opacity-10 -z-10 bg-cyan-500" />

        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className="w-28 h-28 rounded-full bg-cyan-500/20 ring-4 ring-cyan-500/40 flex items-center justify-center text-5xl"
        >
          🎓
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">{t('celebration.examReadiness')}</span>


          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-black text-white/30 tabular-nums">{before}%</span>
            <span className="text-white/40 text-xl">→</span>
            <span className="text-6xl font-black text-cyan-300 tabular-nums leading-none">{afterCount}%</span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 mt-1"
          >
            <span className="text-cyan-400 font-black text-sm">+{delta}%{t('celebration.toReadiness')}</span>
          </motion.div>
        </motion.div>


        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full flex flex-col gap-2">
          <div className="h-3 rounded-full bg-black/40 overflow-hidden border border-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
              initial={{ width: `${before}%` }}
              animate={{ width: `${after}%` }}
              transition={{ delay: 0.65, duration: 0.9, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 font-bold uppercase tracking-wider">
            <span>0%</span>
            <span>100%</span>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-white/40 text-sm font-medium max-w-[220px] leading-relaxed">
          {label}
        </motion.p>
      </motion.div>
    </div>
  );
}

function SlideCTA({ data, onRetry, onDetails, todayTestCount }: { data: CelebrationData; onRetry: () => void; onDetails: () => void; todayTestCount: number }) {
  const { t } = useLanguage();
  return (

    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col items-center gap-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
          className="w-32 h-32 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-2xl"
        >
          <Rocket className="w-16 h-16 text-violet-400 drop-shadow-[0_0_20px_rgba(167,139,250,0.5)]" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-col gap-3 items-center">
          <h2 className="text-4xl font-black text-white tracking-tight">
            {data.isPassed ? t('celebration.greatJob') : t('celebration.dontGiveUp')}
          </h2>
          <p className="text-white/40 text-sm font-medium leading-relaxed max-w-[260px] mx-auto uppercase tracking-widest">
            {data.isPassed
              ? t('celebration.passedDesc')
              : t('celebration.failedDesc')}
          </p>

          {todayTestCount >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mt-1"
            >
              <span className="text-orange-400 font-black text-sm">
                {t('celebration.todayTestCount', { count: todayTestCount })}
              </span>
            </motion.div>

          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-col w-full gap-3 mt-4">
          <button
            onClick={onRetry}
            className="w-full py-5 rounded-[2rem] bg-white text-zinc-950 font-black text-lg tracking-wide active:scale-95 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 group"
          >
            {data.isPassed ? (
              <Rocket className="w-5 h-5 text-violet-600 group-hover:translate-x-1 transition-transform" />
            ) : (
              <RefreshCw className="w-5 h-5 text-indigo-600 group-hover:rotate-180 transition-transform duration-500" />
            )}
            <span>{data.isPassed ? t('celebration.nextTest') : t('celebration.tryAgain')}</span>
          </button>

          <button
            onClick={onDetails}
            className="w-full py-4 rounded-[1.5rem] border border-white/10 text-white/50 font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>{t('celebration.testDetails')}</span>
          </button>

        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SLIDE_SOUNDS: Record<SlideId, () => void> = {
  result:          () => {},
  sp:              playSuccessSound,
  personal_best:   playSuccessSound,
  xp:              playSuccessSound,
  exam_readiness:  playSuccessSound,
  topics:          () => {},
  cta:             () => {},
};

export function TestResultsCelebrationFlow({ data, onFinish, onRetry }: Props) {
  const { t } = useLanguage();
  const userCtx = useContext(UserContext);
  const currentUserId = userCtx?.profileId ?? undefined;


  // State must be declared before slides array (which depends on examReadinessData)
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [prefetchedRank, setPrefetchedRank] = useState<RankChange | null>(null);
  const [userRealSP, setUserRealSP] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBestData>(null);
  const [todayTestCount, setTodayTestCount] = useState<number>(0);
  const [examReadinessData, setExamReadinessData] = useState<{ before: number; after: number } | null>(null);
  const soundFiredRef = useRef<Set<SlideId>>(new Set());

  const slides: SlideId[] = [
    'result',
    'sp',
    ...(data.testId ? ['personal_best' as SlideId] : []),
    'xp',
    ...(examReadinessData ? ['exam_readiness' as SlideId] : []),
    ...(data.failedTopics.length > 0 ? ['topics' as SlideId] : []),
    'cta',
  ];

  const handleDone = () => {
    onFinish();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      onFinish();
    }
  };

  const slideId = slides[current];
  const style = SLIDE_STYLES[slideId];

  // Prefetch user position on mount so SP slide has data immediately
  useEffect(() => {
    if (!currentUserId || data.rankChange) return;
    (async () => {
      try {
        const { data: res } = await supabase.functions.invoke('duel-pass-leaderboard', {
          body: { type: 'user_position', user_id: currentUserId, neighbors_count: 4 },
        });
        if (res?.position) {
          const realSP: number | null = res.user_data?.season_points ?? null;
          if (realSP !== null) setUserRealSP(realSP);
          const above = (res.neighbors ?? [] as Array<{
            user_id: string;
            position?: number;
            season_points?: number;
            duel_pass_level?: number;
            profile?: { first_name?: string | null; username?: string | null; photo_url?: string | null };
          }>)
            .filter((n) => n.user_id !== currentUserId && (n.position ?? Infinity) < res.position)
            .slice(0, 2)
            .map((n) => ({
              user_id: n.user_id,
              sp: n.season_points ?? 0,
              level: n.duel_pass_level ?? 0,
              first_name: n.profile?.first_name ?? null,
              username: n.profile?.username ?? null,
              photo_url: n.profile?.photo_url ?? null,
            }));
          setPrefetchedRank({ prev_rank: res.position, new_rank: res.position, overtaken: above });
        }
      } catch { /* noop */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch personal best for this test on mount
  useEffect(() => {
    if (!currentUserId || !data.testId) return;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('game_sessions')
          .select('score')
          .eq('user_id', currentUserId)
          .eq('game_type', data.testId)
          .eq('total_questions', data.totalQuestions);
        if (rows?.length) {
          const best = Math.max(...rows.map(r => r.score as number));
          setPersonalBest({ best, attempts: rows.length });
        }
      } catch { /* noop */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch daily momentum count + exam readiness delta on mount
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      try {
        // Daily Momentum: count today's sessions
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .gte('created_at', todayStart.toISOString());
        if (count !== null) setTodayTestCount(count);
      } catch { /* noop */ }

      try {
        // Exam Readiness: compute accuracy delta from recent sessions
        const { data: rows } = await supabase
          .from('game_sessions')
          .select('score, total_questions')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (rows && rows.length >= 2) {
          const toAcc = (r: { score: number; total_questions: number }) =>
            r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0;
          const afterAvg = rows.reduce((s, r) => s + toAcc(r), 0) / rows.length;
          const beforeRows = rows.slice(1);
          const beforeAvg = beforeRows.reduce((s, r) => s + toAcc(r), 0) / beforeRows.length;
          const before = Math.round(beforeAvg);
          const after = Math.round(afterAvg);
          if (after - before >= 2) setExamReadinessData({ before, after });
        }
      } catch { /* noop */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire sounds on slide entry (once per slide type)
  useEffect(() => {
    if (soundFiredRef.current.has(slideId)) return;
    soundFiredRef.current.add(slideId);
    if (slideId === 'result') {
      setTimeout(() => data.isPassed ? playCelebrationSoundFanfare() : playAlertSound(), 300);
    } else if (slideId === 'sp') {
      setTimeout(playSuccessSound, 300);
    } else if (slideId === 'xp') {
      setTimeout(playSuccessSound, 200);
    } else if (slideId === 'cta') {
      if (data.isPassed) setTimeout(playCelebrationSoundPop, 200);
    }
  }, [slideId, data.isPassed]);

  const advance = useCallback(() => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent(c => c + 1);
      try { haptics.light(); } catch { /* noop */ }
    }
  }, [current, slides.length]);

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      className={cn('fixed inset-0 z-50 bg-gradient-to-b', style.bg)}
      onClick={slideId !== 'cta' ? advance : undefined}
    >
      {/* Ambient glow */}
      {style.glow && (
        <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] pointer-events-none', style.glow)} />
      )}

      {/* Sparkles */}
      {style.sparkle !== 'transparent' && <Sparkles color={style.sparkle} />}

      {/* Top bar — safe-area-aware */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 pb-3"
        style={{ paddingTop: SAFE_TOP }}
      >
        <SlideDots total={slides.length} current={current} />
        {slideId !== 'cta' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDone(); }}
            className="text-white/30 text-sm font-medium hover:text-white/60 transition-colors"
          >
            {t('celebration.skip')}
          </button>

        )}
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slideId}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          className="absolute inset-0 flex flex-col"
        >
          <div className="flex-1 flex flex-col pt-20 pb-32 overflow-y-auto">
            {slideId === 'result' && <SlideResult data={data} />}
            {slideId === 'sp'     && (
              <SlideSP
                data={data}
                onOpenLeaderboard={() => setLeaderboardOpen(true)}
                currentUserId={currentUserId}
                prefetchedRank={prefetchedRank}
                userRealSP={userRealSP}
              />
            )}
            {slideId === 'personal_best' && <SlidePersonalBest data={data} personalBest={personalBest} />}
            {slideId === 'xp'            && <SlideXP data={data} />}
            {slideId === 'exam_readiness' && examReadinessData && (
              <SlideExamReadiness before={examReadinessData.before} after={examReadinessData.after} />
            )}
            {slideId === 'topics' && <SlideTopics topics={data.failedTopics} onPractice={handleDone} />}
            {slideId === 'cta'    && <SlideCTA data={data} onRetry={handleRetry} onDetails={handleDone} todayTestCount={todayTestCount} />}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom CTA — wide, mobile-friendly, safe-area-aware */}
      {slideId !== 'cta' && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 z-30 px-6 pt-4"
          style={{ paddingBottom: SAFE_BOTTOM }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={advance}
            className="w-full py-5 rounded-[2rem] bg-white text-zinc-950 font-black text-lg tracking-wide active:scale-[0.96] transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10">{t('celebration.next')}</span>

            <motion.span 
              className="relative z-10"
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              →
            </motion.span>
          </button>
        </motion.div>
      )}

      {/* Lazy leaderboard overlay */}
      {leaderboardOpen && (
        <div
          className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-4 pb-2"
            style={{ paddingTop: SAFE_TOP }}
          >
            <span className="text-white font-black text-base">{t('celebration.seasonLeaderboardTitle')}</span>
            <button
              onClick={() => setLeaderboardOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-white/80 text-sm font-semibold active:scale-95"
            >
              ✕ {t('celebration.close')}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center h-40 text-white/40 text-sm">{t('celebration.loading')}</div>
            }>

              <DuelPassLeaderboardView
                onBack={() => setLeaderboardOpen(false)}
                onOpenHallOfFame={() => {}}
                embedded
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
