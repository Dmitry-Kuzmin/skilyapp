import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  failedTopics: string[];  // topic titles of wrong answers
  leveledUp: boolean;
}

interface Props {
  data: CelebrationData;
  onDone: () => void;
}

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

type SlideId = 'result' | 'sp' | 'time' | 'xp' | 'topics' | 'cta';

const SLIDE_STYLES: Record<SlideId, { bg: string; glow: string; sparkle: string }> = {
  result:  { bg: 'from-zinc-950 via-zinc-900 to-zinc-950', glow: '', sparkle: 'transparent' },
  sp:      { bg: 'from-zinc-950 via-indigo-950/60 to-zinc-950', glow: 'bg-indigo-500/20', sparkle: '#818cf8' },
  time:    { bg: 'from-zinc-950 via-cyan-950/60 to-zinc-950',   glow: 'bg-cyan-500/20',   sparkle: '#22d3ee' },
  xp:      { bg: 'from-zinc-950 via-amber-950/50 to-zinc-950',  glow: 'bg-amber-500/20',  sparkle: '#fbbf24' },
  topics:  { bg: 'from-zinc-950 via-orange-950/50 to-zinc-950', glow: 'bg-orange-500/15', sparkle: '#fb923c' },
  cta:     { bg: 'from-zinc-950 via-violet-950/50 to-zinc-950', glow: 'bg-violet-500/15', sparkle: '#a78bfa' },
};

// ─── Individual slides ───────────────────────────────────────────────────────

function LeaderboardOvertake({ prevSP, spAwarded }: { prevSP: number; spAwarded: number }) {
  const sp = useCountUp(spAwarded, 400);
  const animatedUserSP = prevSP + sp;

  const competitors = useMemo(() => {
    // We want the user to overtake exactly one person if possible.
    const overtakeDistance = Math.max(1, Math.floor(spAwarded * 0.4));
    const unreachableDistance = Math.max(spAwarded + 25, Math.floor(spAwarded * 1.5));
    
    return [
      { id: 'c1', name: 'Alex M.', avatar: '🦊', sp: prevSP + unreachableDistance },
      { id: 'c2', name: 'Maria S.', avatar: '🐱', sp: prevSP + overtakeDistance },
      { id: 'c3', name: 'Juan D.', avatar: '🐼', sp: prevSP - 15 },
    ];
  }, [prevSP, spAwarded]);

  const players = useMemo(() => {
    return [
      ...competitors,
      { id: 'user', name: 'Ты', avatar: '😎', sp: animatedUserSP, isUser: true }
    ].sort((a, b) => b.sp - a.sp);
  }, [competitors, animatedUserSP]);

  return (
    <div className="w-full max-w-xs flex flex-col gap-2 mt-4">
      {players.map((p, index) => (
        <motion.div
          layout
          key={p.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            layout: { type: "spring", stiffness: 300, damping: 25 },
            opacity: { delay: index * 0.1 } 
          }}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors",
            p.isUser 
              ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
              : "bg-white/5 border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-black w-4 text-center",
              index === 0 ? "text-amber-400" : index === 1 ? "text-zinc-300" : index === 2 ? "text-amber-600" : "text-white/30"
            )}>
              {index + 1}
            </span>
            <span className="text-xl">{p.avatar}</span>
            <span className={cn("text-sm font-bold", p.isUser ? "text-indigo-300" : "text-white/80")}>
              {p.name}
            </span>
          </div>
          <span className={cn("text-sm font-black tabular-nums", p.isUser ? "text-indigo-400" : "text-white/50")}>
            {Math.floor(p.sp)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SlideResult({ data }: { data: CelebrationData }) {
  const score = useCountUp(data.correctCount, 600, 1000);
  const isPassed = data.isPassed;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      {isPassed && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={220}
          gravity={0.25}
          colors={['#22c55e', '#86efac', '#4ade80', '#ffffff', '#fbbf24']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 5 }}
        />
      )}

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        className="relative"
      >
        <div className={cn(
          'w-36 h-36 rounded-full flex items-center justify-center text-7xl',
          isPassed ? 'bg-green-500/20 ring-4 ring-green-500/40' : 'bg-red-500/15 ring-4 ring-red-500/30',
        )}>
          {isPassed ? '🏆' : '💪'}
        </div>
        {isPassed && (
          <motion.div
            className="absolute inset-0 rounded-full bg-green-500/10"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col items-center gap-2"
      >
        <span className={cn(
          'text-sm font-black uppercase tracking-[0.2em]',
          isPassed ? 'text-green-400' : 'text-red-400',
        )}>
          {isPassed ? '✓ Тест сдан' : '✗ Попробуй снова'}
        </span>

        {/* Score */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-8xl font-black text-white tabular-nums leading-none">{score}</span>
          <span className="text-3xl font-bold text-white/40">/{data.totalQuestions}</span>
        </div>
        <span className="text-lg text-white/50 font-medium">
          {data.score}% точность
        </span>
      </motion.div>

      {/* Time badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium flex items-center gap-2"
      >
        <span>⏱</span>
        <span>{fmtTime(data.timeSeconds)}</span>
      </motion.div>
    </div>
  );
}

function SlideSP({ data }: { data: CelebrationData }) {
  const sp = useCountUp(data.spAwarded, 400);
  const nextLevelSP = (data.currentLevel + 1) * 100;
  const prevSP = data.currentSP - data.spAwarded;
  const fillBefore = Math.min(prevSP % 100, 100);
  const fillAfter = Math.min(data.currentSP % 100, 100) || (data.currentSP >= nextLevelSP ? 100 : 0);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="relative mt-4"
      >
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 ring-4 ring-indigo-500/40 flex items-center justify-center text-4xl z-10 relative">
          🏅
        </div>
        <motion.div
          className="absolute inset-0 rounded-full bg-indigo-400/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-white/40">+</span>
          <span className="text-6xl font-black text-white tabular-nums leading-none">{sp}</span>
          <span className="text-xl font-bold text-indigo-400 ml-1">SP</span>
        </div>
        {data.spAwarded > 8 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="text-[10px] font-bold px-2 py-0.5 mt-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"
          >
            +{data.spAwarded - data.correctCount * 2} бонус 🎯
          </motion.span>
        )}
      </motion.div>

      {/* Level progress */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full max-w-xs flex flex-col gap-1.5 mt-2">
        <div className="flex justify-between text-[10px] text-white/50 font-semibold uppercase tracking-wider">
          <span>Ур. {data.currentLevel}</span>
          <span>{data.currentSP} / {nextLevelSP} SP</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
            initial={{ width: `${fillBefore}%` }}
            animate={{ width: `${fillAfter}%` }}
            transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Leaderboard Animation */}
      <LeaderboardOvertake prevSP={prevSP} spAwarded={data.spAwarded} />
    </div>
  );
}

function SlideTime({ data, percentile }: { data: CelebrationData; percentile: number | null }) {
  const avgSec = 180; // fallback average 3 min
  const isFaster = data.timeSeconds < avgSec;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-32 h-32 rounded-full bg-cyan-500/20 ring-4 ring-cyan-500/40 flex items-center justify-center text-6xl"
      >
        ⚡
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-2">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-cyan-400">Твоё время</span>
        <span className="text-7xl font-black text-white tabular-nums">{fmtTime(data.timeSeconds)}</span>
        {percentile !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col items-center gap-1 mt-2"
          >
            <span className={cn('text-2xl font-black', percentile >= 50 ? 'text-cyan-300' : 'text-white/60')}>
              {percentile >= 50 ? '🚀 ' : ''}Быстрее чем {percentile}%
            </span>
            <span className="text-white/40 text-sm">пользователей этого теста</span>
          </motion.div>
        ) : (
          <span className="text-white/30 text-sm mt-2">Анализируем результаты...</span>
        )}
      </motion.div>

      {/* Speed bar */}
      {percentile !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="w-full max-w-xs flex flex-col gap-2">
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentile}%` }}
              transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30">
            <span>Медленнее</span><span>Быстрее</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SlideXP({ data }: { data: CelebrationData }) {
  const xp = useCountUp(data.xpAwarded, 400);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: 20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        className="relative"
      >
        <div className="w-32 h-32 rounded-full bg-amber-500/20 ring-4 ring-amber-500/40 flex items-center justify-center text-6xl">
          ⚡
        </div>
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-400/10"
          animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-amber-400">Опыт заработан</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-white/40">+</span>
          <span className="text-8xl font-black text-white tabular-nums leading-none">{xp}</span>
          <span className="text-3xl font-bold text-amber-400 ml-1">XP</span>
        </div>
        <p className="text-white/40 text-sm mt-2">Ты продвигаешься к мастерству 🎓</p>
      </motion.div>
    </div>
  );
}

function SlideTopics({ topics, onPractice }: { topics: string[]; onPractice: () => void }) {
  const shown = topics.slice(0, 4);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-7 px-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-orange-500/15 ring-4 ring-orange-500/30 flex items-center justify-center text-5xl"
      >
        🎯
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-2">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">Поработай над</span>
        <p className="text-white/50 text-sm">Эти темы стоит повторить</p>
      </motion.div>

      <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="w-full max-w-xs flex flex-col gap-2">
        {shown.map((topic, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-orange-500/20 text-left"
          >
            <span className="w-5 h-5 rounded-full bg-orange-500/30 text-orange-400 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="text-sm text-white/80 font-medium leading-tight">{topic}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function SlideCTA({ data, onRetry, onDetails }: { data: CelebrationData; onRetry: () => void; onDetails: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
        className="text-8xl"
      >
        {data.isPassed ? '🎉' : '🔥'}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-white">
          {data.isPassed ? 'Отличная работа!' : 'Не сдавайся!'}
        </h2>
        <p className="text-white/50 text-base leading-relaxed max-w-[260px]">
          {data.isPassed
            ? 'Ты отлично справился с этим тестом. Продолжай в том же духе!'
            : 'Каждая попытка делает тебя сильнее. Повтори темы и попробуй снова!'}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-col w-full max-w-xs gap-4">
        <button
          onClick={onRetry}
          className="w-full py-4 rounded-2xl bg-white text-zinc-950 font-black text-lg tracking-wide uppercase shadow-[0_4px_0_0_rgb(209,213,219)] hover:bg-zinc-50 active:shadow-none active:translate-y-[4px] transition-all"
        >
          {data.isPassed ? '🚀 Следующий тест' : '🔄 Ещё раз'}
        </button>
        <button
          onClick={onDetails}
          className="w-full py-4 rounded-2xl bg-white/10 text-white font-black text-lg tracking-wide uppercase shadow-[0_4px_0_0_rgba(255,255,255,0.1)] hover:bg-white/15 active:shadow-none active:translate-y-[4px] transition-all"
        >
          Детали теста
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SLIDE_SOUNDS: Record<SlideId, () => void> = {
  result:  () => { /* fired externally based on pass/fail */ },
  sp:      playSuccessSound,
  time:    () => {},
  xp:      playSuccessSound,
  topics:  () => {},
  cta:     () => {},
};

export function TestResultsCelebrationFlow({ data, onDone }: Props) {
  const slides: SlideId[] = [
    'result',
    'sp',
    ...(data.timeSeconds > 0 ? ['time' as SlideId] : []),
    'xp',
    ...(data.failedTopics.length > 0 ? ['topics' as SlideId] : []),
    'cta',
  ];

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [percentile, setPercentile] = useState<number | null>(null);
  const soundFiredRef = useRef<Set<SlideId>>(new Set());

  const slideId = slides[current];
  const style = SLIDE_STYLES[slideId];

  // Fetch time percentile when time slide is about to show
  useEffect(() => {
    if (!slides.includes('time')) return;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('game_sessions')
          .select('duration_seconds')
          .eq('total_questions', data.totalQuestions)
          .gt('duration_seconds', 0)
          .limit(200);
        if (!rows || rows.length < 3) return;
        const slower = rows.filter(r => r.duration_seconds > data.timeSeconds).length;
        setPercentile(Math.round((slower / rows.length) * 100));
      } catch { /* silent */ }
    })();
  }, [data.totalQuestions, data.timeSeconds]);

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
    >
      {/* Ambient glow */}
      {style.glow && (
        <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] pointer-events-none', style.glow)} />
      )}

      {/* Sparkles */}
      {style.sparkle !== 'transparent' && <Sparkles color={style.sparkle} />}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 pb-3 pt-[max(env(safe-area-inset-top),2rem)]">
        <SlideDots total={slides.length} current={current} />
        {slideId !== 'cta' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="text-white/40 font-bold uppercase text-xs tracking-wider hover:text-white/80 transition-colors"
          >
            Пропустить
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
          <div className="flex-1 flex flex-col pt-20 pb-[120px] overflow-y-auto overflow-x-hidden">
            {slideId === 'result' && <SlideResult data={data} />}
            {slideId === 'sp'     && <SlideSP data={data} />}
            {slideId === 'time'   && <SlideTime data={data} percentile={percentile} />}
            {slideId === 'xp'     && <SlideXP data={data} />}
            {slideId === 'topics' && <SlideTopics topics={data.failedTopics} onPractice={onDone} />}
            {slideId === 'cta'    && <SlideCTA data={data} onRetry={onDone} onDetails={onDone} />}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Action Button (Duolingo Style) */}
      <AnimatePresence>
        {slideId !== 'cta' && (
          <motion.div
            key="bottom-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 px-6 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)] bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent z-30"
          >
            <button
              onClick={advance}
              className="w-full py-4 rounded-2xl bg-white text-zinc-950 font-black text-lg tracking-wide uppercase shadow-[0_4px_0_0_rgb(209,213,219)] hover:bg-zinc-50 active:shadow-none active:translate-y-[4px] transition-all"
            >
              Продолжить
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
