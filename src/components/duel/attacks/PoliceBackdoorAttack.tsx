import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface PoliceBackdoorProps {
  isActive: boolean;
  onUnlock: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type Phase = 'arriving' | 'blowing' | 'passed';
type Mood = 'stern' | 'watching' | 'impatient' | 'approving';

const TAP_GAIN = 6.5;
const DECAY_PER_SEC = 14;
const DECAY_GRACE_MS = 450;
const MIN_TAP_INTERVAL = 55;
const SEGMENTS = 18;
const ARRIVAL_MS = 700;

const MOOD_EMOJI: Record<Mood, string> = {
  stern: '😐',
  watching: '🧐',
  impatient: '😠',
  approving: '😏',
};

const MOOD_HINT: Record<Mood, string> = {
  stern: 'Documentos, por favor',
  watching: '¡Siga soplando!',
  impatient: '¡Más fuerte!',
  approving: 'Casi listo…',
};

export const PoliceBackdoorAttack: React.FC<PoliceBackdoorProps> = ({ isActive, onUnlock, expiresAt }) => {
  const [phase, setPhase] = useState<Phase>('arriving');
  const [fill, setFill] = useState(0);
  const [mood, setMood] = useState<Mood>('stern');
  const [reading, setReading] = useState('0.84');

  const fillRef = useRef(0);
  const lastTapRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const unlockedRef = useRef(false);

  // Reset on activate
  useEffect(() => {
    if (!isActive) return;
    setPhase('arriving');
    setFill(0);
    setMood('stern');
    setReading('0.84');
    fillRef.current = 0;
    lastTapRef.current = 0;
    unlockedRef.current = false;

    const t = setTimeout(() => setPhase('blowing'), ARRIVAL_MS);
    return () => clearTimeout(t);
  }, [isActive]);

  // Auto-expire (force unlock if attack times out)
  useEffect(() => {
    if (!isActive || !expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      if (!unlockedRef.current) { unlockedRef.current = true; onUnlock(); }
      return;
    }
    const t = setTimeout(() => {
      if (!unlockedRef.current) { unlockedRef.current = true; onUnlock(); }
    }, remaining);
    return () => clearTimeout(t);
  }, [isActive, expiresAt, onUnlock]);

  // Animation loop: decay + mood
  useEffect(() => {
    if (phase !== 'blowing') return;

    const loop = (ts: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = ts;
      const dt = (ts - lastFrameRef.current) / 1000;
      lastFrameRef.current = ts;

      const sinceTap = Date.now() - lastTapRef.current;
      if (lastTapRef.current > 0 && sinceTap > DECAY_GRACE_MS) {
        const next = Math.max(0, fillRef.current - DECAY_PER_SEC * dt);
        if (Math.abs(next - fillRef.current) > 0.1) {
          fillRef.current = next;
          setFill(next);
        }
      }

      // Mood update
      const f = fillRef.current;
      let nextMood: Mood = 'stern';
      if (f >= 80) nextMood = 'approving';
      else if (lastTapRef.current > 0 && sinceTap > 900 && f < 50) nextMood = 'impatient';
      else if (f >= 35) nextMood = 'watching';
      setMood(prev => prev === nextMood ? prev : nextMood);

      // Reading flicker — random while filling, settles toward 0 when high
      if (f < 80) {
        const noise = (Math.random() * 0.6 + 0.3).toFixed(2);
        setReading(noise);
      } else {
        const settled = Math.max(0, (1 - f / 100) * 0.4).toFixed(2);
        setReading(settled);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = 0;
    };
  }, [phase]);

  const handleBlow = useCallback(() => {
    if (phase !== 'blowing' || unlockedRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < MIN_TAP_INTERVAL) return;
    lastTapRef.current = now;

    const next = Math.min(100, fillRef.current + TAP_GAIN);
    fillRef.current = next;
    setFill(next);

    if (navigator.vibrate) navigator.vibrate(8);

    if (next >= 100 && !unlockedRef.current) {
      unlockedRef.current = true;
      setReading('0.00');
      setMood('approving');
      setPhase('passed');
      if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
      setTimeout(onUnlock, 850);
    }
  }, [phase, onUnlock]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="police-attack"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9998] select-none overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Dark navy background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/95 to-slate-950" />

        {/* Animated red/blue police light sweeps */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ background: [
            'radial-gradient(ellipse at 10% 0%, rgba(239,68,68,0.35) 0%, transparent 50%)',
            'radial-gradient(ellipse at 90% 0%, rgba(59,130,246,0.35) 0%, transparent 50%)',
            'radial-gradient(ellipse at 10% 0%, rgba(239,68,68,0.35) 0%, transparent 50%)',
          ] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Top siren strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden">
          <motion.div
            className="h-full w-1/2"
            style={{ background: 'linear-gradient(90deg, transparent, #ef4444 30%, #ef4444 70%, transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden">
          <motion.div
            className="h-full w-1/2"
            style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 30%, #3b82f6 70%, transparent)' }}
            animate={{ x: ['200%', '-100%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Header — title */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{ top: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 56px) + 8px)' }}
        >
          <div className="text-[10px] tracking-[0.35em] text-red-400/90 font-bold uppercase mb-0.5">⚠ Guardia Civil ⚠</div>
          <div className="text-base font-black uppercase tracking-widest text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
            Control de Alcoholemia
          </div>
        </div>

        {/* Phase content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-6">

          {phase === 'arriving' && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
              className="text-7xl"
            >
              🚔
            </motion.div>
          )}

          {(phase === 'blowing' || phase === 'passed') && (
            <>
              {/* Officer portrait */}
              <motion.div
                className="relative flex flex-col items-center"
                animate={mood === 'impatient' ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="relative">
                  <motion.div
                    key={mood}
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="text-7xl leading-none"
                    style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))' }}
                  >
                    {MOOD_EMOJI[mood]}
                  </motion.div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">🧢</div>
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-blue-200/80 font-mono">
                  Agente Martínez · #41-DGT
                </div>
                <motion.div
                  key={`hint-${mood}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-1 text-sm font-bold ${
                    mood === 'impatient' ? 'text-red-400' :
                    mood === 'approving' ? 'text-emerald-400' :
                    'text-white/90'
                  }`}
                >
                  {phase === 'passed' ? '¡Puede continuar!' : MOOD_HINT[mood]}
                </motion.div>
              </motion.div>

              {/* Breathalyzer device */}
              <div className="w-full max-w-sm">
                <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl p-4 border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-[9px] font-mono text-zinc-400 tracking-wider">BREATHALYZER 3000</div>
                    <motion.div
                      className="w-2 h-2 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  </div>

                  {/* LED segments */}
                  <div className="flex gap-[3px] h-7 mb-3">
                    {Array.from({ length: SEGMENTS }).map((_, i) => {
                      const segPct = (i / SEGMENTS) * 100;
                      const lit = fill > segPct;
                      const color = i < SEGMENTS * 0.4 ? 'bg-red-500'
                                  : i < SEGMENTS * 0.75 ? 'bg-amber-400'
                                  : 'bg-emerald-400';
                      const glow = i < SEGMENTS * 0.4 ? 'shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                                 : i < SEGMENTS * 0.75 ? 'shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                                 : 'shadow-[0_0_10px_rgba(52,211,153,0.95)]';
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm transition-all duration-75 ${
                            lit ? `${color} ${glow}` : 'bg-zinc-700/40'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Digital reading */}
                  <div className="bg-black/60 rounded-lg px-3 py-2 flex items-baseline justify-between font-mono">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Lectura</span>
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        key={reading}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 1 }}
                        className={`text-2xl font-black tabular-nums ${
                          phase === 'passed' ? 'text-emerald-400' :
                          fill >= 75 ? 'text-amber-300' : 'text-red-400'
                        }`}
                        style={{ textShadow: '0 0 12px currentColor' }}
                      >
                        {reading}
                      </motion.span>
                      <span className="text-[10px] text-zinc-400">mg/L</span>
                    </div>
                  </div>

                  {/* Progress label */}
                  <div className="mt-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    {phase === 'passed' ? '✓ Análisis completo' : `Recolección ${Math.floor(fill)}%`}
                  </div>
                </div>
              </div>

              {/* BLOW button */}
              {phase === 'blowing' && (
                <motion.button
                  type="button"
                  onPointerDown={handleBlow}
                  whileTap={{ scale: 0.93 }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(59,130,246,0.6)',
                      '0 0 0 20px rgba(59,130,246,0)',
                    ],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="relative w-44 h-44 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-4 border-blue-300/40 shadow-2xl flex flex-col items-center justify-center active:from-blue-400 active:to-blue-600"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="text-5xl mb-1">💨</div>
                  <div className="text-white font-black text-lg tracking-widest">SOPLAR</div>
                  <div className="text-blue-200/70 text-[10px] font-mono mt-0.5">TAP RÁPIDO</div>
                </motion.button>
              )}

              {phase === 'passed' && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-emerald-500/20 border-2 border-emerald-400 rounded-2xl px-6 py-3 text-center"
                >
                  <div className="text-emerald-300 font-black text-xl uppercase tracking-widest">0.00 mg/L</div>
                  <div className="text-emerald-100/80 text-xs mt-1">¡Buen viaje!</div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PoliceBackdoorAttack;
