import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useLanguage } from '@/contexts/LanguageContext';

interface SchulteTableAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

const TOTAL = 16;

/** Stable 16-color neon palette — each tile value (1..16) always gets the same hue. */
const COLORS: { from: string; to: string; glow: string }[] = [
  { from: '#ff5470', to: '#ff8a47', glow: 'rgba(255,90,120,0.55)' },   // 1  coral
  { from: '#ffb547', to: '#ffd93d', glow: 'rgba(255,200,70,0.55)' },   // 2  amber
  { from: '#a3e635', to: '#22d3ee', glow: 'rgba(132,220,140,0.55)' },  // 3  lime→cyan
  { from: '#22d3ee', to: '#3b82f6', glow: 'rgba(56,189,248,0.55)' },   // 4  sky
  { from: '#8b5cf6', to: '#ec4899', glow: 'rgba(168,120,255,0.55)' },  // 5  violet→pink
  { from: '#f472b6', to: '#fb7185', glow: 'rgba(244,114,182,0.55)' },  // 6  pink
  { from: '#34d399', to: '#10b981', glow: 'rgba(52,211,153,0.55)' },   // 7  emerald
  { from: '#facc15', to: '#f97316', glow: 'rgba(250,204,21,0.55)' },   // 8  yellow→orange
  { from: '#60a5fa', to: '#a78bfa', glow: 'rgba(96,165,250,0.55)' },   // 9  blue→violet
  { from: '#f87171', to: '#fb923c', glow: 'rgba(248,113,113,0.55)' },  // 10 red→orange
  { from: '#2dd4bf', to: '#06b6d4', glow: 'rgba(45,212,191,0.55)' },   // 11 teal
  { from: '#e879f9', to: '#a855f7', glow: 'rgba(232,121,249,0.55)' },  // 12 fuchsia
  { from: '#fde047', to: '#84cc16', glow: 'rgba(253,224,71,0.55)' },   // 13 yellow→lime
  { from: '#fb7185', to: '#a78bfa', glow: 'rgba(251,113,133,0.55)' },  // 14 rose→violet
  { from: '#7dd3fc', to: '#c084fc', glow: 'rgba(125,211,252,0.55)' },  // 15 light blue→purple
  { from: '#fcd34d', to: '#fb923c', glow: 'rgba(252,211,77,0.55)' },   // 16 gold
];

function shuffled(): number[] {
  const arr = Array.from({ length: TOTAL }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  color: { from: string; to: string; glow: string };
  value: number;
}

export const SchulteTableAttack: React.FC<SchulteTableAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const { t } = useLanguage();
  const numbers = useMemo(shuffled, []);
  const [next, setNext] = useState(1);
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [shake, setShake] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const tileRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-dismiss intro after a short readable beat
  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => setShowIntro(false), 1700);
    return () => clearTimeout(t);
  }, [showIntro]);

  // Auto-expire safety net
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const id = setTimeout(onCleaned, remaining);
    return () => clearTimeout(id);
  }, [expiresAt, onCleaned]);

  const spawnBurst = useCallback((value: number) => {
    const el = tileRefs.current.get(value);
    const root = containerRef.current;
    if (!el || !root) return;
    const tRect = el.getBoundingClientRect();
    const rRect = root.getBoundingClientRect();
    const x = tRect.left - rRect.left + tRect.width / 2;
    const y = tRect.top - rRect.top + tRect.height / 2;
    const id = ++burstIdRef.current;
    const color = COLORS[value - 1];
    setBursts(prev => [...prev, { id, x, y, color, value }]);
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id));
    }, 700);
  }, []);

  const handleTap = useCallback((value: number) => {
    if (done || cleared.has(value) || showIntro) return;

    if (value === next) {
      if (navigator.vibrate) navigator.vibrate(18);
      spawnBurst(value);
      setCleared(prev => {
        const nextSet = new Set(prev);
        nextSet.add(value);
        return nextSet;
      });
      if (value === TOTAL) {
        if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
        setDone(true);
        setTimeout(onCleaned, 550);
      } else {
        setNext(value + 1);
      }
    } else {
      if (navigator.vibrate) navigator.vibrate([12, 22, 12]);
      setWrongAt(value);
      setShake(s => s + 1);
      setTimeout(() => setWrongAt(prev => (prev === value ? null : prev)), 280);
    }
  }, [done, cleared, next, onCleaned, showIntro, spawnBurst]);

  const progress = cleared.size;
  const clearedRatio = progress / TOTAL;
  // Fog dissolves as the player progresses
  const fogOpacity = 0.78 * (1 - clearedRatio * 0.95);
  const fogBlur = 22 * (1 - clearedRatio * 0.92);

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: shake ? [0, -6, 6, -3, 3, 0] : 0 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.3 }}
          key={shake}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {/* Foggy backdrop — dissolves with progress */}
          <motion.div
            className="absolute inset-0 bg-slate-900"
            animate={{ opacity: fogOpacity, backdropFilter: `blur(${fogBlur}px)` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              backdropFilter: `blur(${fogBlur}px)`,
              WebkitBackdropFilter: `blur(${fogBlur}px)`,
            }}
          />
          {/* Drifting fog wisps (also fade with progress) */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: 0.5 * (1 - clearedRatio) }}
            transition={{ duration: 0.6 }}
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(160,200,255,0.30) 0%, transparent 55%),
                radial-gradient(circle at 75% 65%, rgba(200,160,255,0.25) 0%, transparent 50%),
                radial-gradient(circle at 50% 90%, rgba(120,220,255,0.22) 0%, transparent 45%)
              `,
            }}
          />
          {/* Aurora accent that gets stronger as fog clears (the reward) */}
          <motion.div
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            animate={{ opacity: clearedRatio * 0.55 }}
            transition={{ duration: 0.7 }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(120,200,255,0.45), rgba(180,120,255,0.25) 40%, transparent 75%)',
            }}
          />

          {/* === HEADER — safe-area-aware top === */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none"
            style={{ top: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px) + 8px)' }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-black/65 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-[12px] font-bold tracking-[0.18em] uppercase"
            >
              🌫 {t('duel.schulte.title')}
            </motion.div>

            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="flex items-center gap-2"
            >
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-3 pr-1.5 py-1 text-white/85 text-xs font-semibold flex items-center gap-2">
                <span className="opacity-70">{t('duel.schulte.find')}</span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={next}
                    initial={{ y: 8, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -10, opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25 }}
                    className="inline-block rounded-full px-2 py-0.5 text-[15px] font-extrabold text-white shadow"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS[next - 1]?.from || '#fff'}, ${COLORS[next - 1]?.to || '#fff'})`,
                      boxShadow: `0 0 12px ${COLORS[next - 1]?.glow || 'rgba(255,255,255,0.4)'}`,
                    }}
                  >
                    {next}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-white/80 text-xs font-bold tabular-nums">
                {t('duel.schulte.progress', { done: progress, total: TOTAL })}
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="w-full max-w-xs h-1 rounded-full bg-white/10 overflow-hidden mt-1"
            >
              <motion.div
                className="h-full"
                animate={{ width: `${clearedRatio * 100}%` }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                style={{
                  background: 'linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6)',
                  boxShadow: '0 0 12px rgba(167,139,250,0.6)',
                }}
              />
            </motion.div>
          </div>

          {/* === GRID === */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="grid grid-cols-4 gap-2.5 w-full max-w-sm aspect-square">
              {numbers.map((value, idx) => {
                const isCleared = cleared.has(value);
                const isWrong = wrongAt === value;
                const color = COLORS[value - 1];

                return (
                  <motion.button
                    key={value}
                    ref={(el) => { tileRefs.current.set(value, el); }}
                    onTouchStart={(e) => { e.preventDefault(); handleTap(value); }}
                    onClick={() => handleTap(value)}
                    disabled={isCleared || showIntro}
                    initial={{ opacity: 0, scale: 0.6, y: 14 }}
                    animate={
                      isCleared
                        ? { opacity: 0, scale: 0, rotate: (value % 2 === 0 ? 1 : -1) * 25 }
                        : isWrong
                          ? { opacity: 1, scale: 1, x: [0, -7, 7, -5, 5, 0], y: 0 }
                          : { opacity: 1, scale: 1, y: 0 }
                    }
                    transition={
                      isCleared
                        ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                        : isWrong
                          ? { duration: 0.28 }
                          : { delay: 0.18 + idx * 0.025, type: 'spring', stiffness: 280, damping: 22 }
                    }
                    whileTap={!isCleared && !showIntro ? { scale: 0.9 } : undefined}
                    className={`
                      relative rounded-2xl border font-extrabold text-2xl
                      flex items-center justify-center overflow-hidden
                      ${isCleared ? 'pointer-events-none' : ''}
                    `}
                    style={
                      isCleared
                        ? { background: 'transparent', borderColor: 'transparent', color: 'transparent' }
                        : isWrong
                          ? {
                              background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(190,18,60,0.45))',
                              borderColor: 'rgba(252,165,165,0.7)',
                              color: '#fff',
                              boxShadow: '0 0 20px rgba(239,68,68,0.5), inset 0 0 18px rgba(255,255,255,0.08)',
                            }
                          : {
                              background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                              borderColor: 'rgba(255,255,255,0.28)',
                              color: '#fff',
                              boxShadow: `0 6px 18px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -8px 14px rgba(0,0,0,0.18)`,
                              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                            }
                    }
                  >
                    {/* gloss */}
                    {!isCleared && !isWrong && (
                      <div
                        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0))',
                        }}
                      />
                    )}
                    <span className="relative z-10">{value}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* === PARTICLE BURSTS === */}
          <div className="absolute inset-0 pointer-events-none">
            {bursts.map(b => (
              <React.Fragment key={b.id}>
                {/* Flash ring */}
                <motion.div
                  initial={{ opacity: 0.9, scale: 0.4 }}
                  animate={{ opacity: 0, scale: 2.2 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute rounded-full"
                  style={{
                    left: b.x - 32,
                    top: b.y - 32,
                    width: 64,
                    height: 64,
                    background: `radial-gradient(circle, ${b.color.glow} 0%, transparent 70%)`,
                  }}
                />
                {/* Number ghost flying up */}
                <motion.div
                  initial={{ opacity: 1, scale: 1, y: 0 }}
                  animate={{ opacity: 0, scale: 1.8, y: -60 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute font-extrabold text-2xl"
                  style={{
                    left: b.x,
                    top: b.y,
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    textShadow: `0 0 14px ${b.color.glow}`,
                  }}
                >
                  {b.value}
                </motion.div>
                {/* Sparks */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const dx = Math.cos(angle) * 48;
                  const dy = Math.sin(angle) * 48;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      animate={{ opacity: 0, x: dx, y: dy, scale: 0.3 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className="absolute rounded-full"
                      style={{
                        left: b.x - 3,
                        top: b.y - 3,
                        width: 6,
                        height: 6,
                        background: `linear-gradient(135deg, ${b.color.from}, ${b.color.to})`,
                        boxShadow: `0 0 8px ${b.color.glow}`,
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* === INTRO OVERLAY === */}
          <AnimatePresence>
            {showIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-20 flex items-center justify-center px-6"
                onClick={() => setShowIntro(false)}
              >
                <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
                <motion.div
                  initial={{ y: 24, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -10, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="relative max-w-sm w-full rounded-3xl p-6 text-center"
                  style={{
                    background: 'linear-gradient(160deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 30px rgba(120,160,255,0.25)',
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-5xl mb-3"
                  >
                    🌫
                  </motion.div>
                  <div className="text-white text-lg font-extrabold tracking-wide mb-1">
                    {t('duel.schulte.introHeadline')}
                  </div>
                  <div className="text-white/65 text-sm mb-4">
                    {t('duel.schulte.introSub')}
                  </div>
                  {/* tiny preview row: 1 → 2 → 3 with colors */}
                  <div className="flex items-center justify-center gap-1.5 mb-5">
                    {[1, 2, 3].map((n, i) => (
                      <React.Fragment key={n}>
                        <motion.div
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-extrabold"
                          style={{
                            background: `linear-gradient(135deg, ${COLORS[n - 1].from}, ${COLORS[n - 1].to})`,
                            boxShadow: `0 0 12px ${COLORS[n - 1].glow}`,
                          }}
                        >
                          {n}
                        </motion.div>
                        {i < 2 && <span className="text-white/40 text-sm">→</span>}
                      </React.Fragment>
                    ))}
                    <span className="text-white/40 text-sm">…</span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-extrabold"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS[15].from}, ${COLORS[15].to})`,
                        boxShadow: `0 0 12px ${COLORS[15].glow}`,
                      }}
                    >
                      16
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); setShowIntro(false); }}
                    className="w-full rounded-2xl py-2.5 text-white font-bold text-sm tracking-wider uppercase"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)',
                      boxShadow: '0 8px 24px rgba(167,139,250,0.45)',
                    }}
                  >
                    {t('duel.schulte.introGo')} →
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
