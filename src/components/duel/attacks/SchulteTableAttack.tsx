import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface SchulteTableAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

const TOTAL = 16;

function shuffled(): number[] {
  const arr = Array.from({ length: TOTAL }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const SchulteTableAttack: React.FC<SchulteTableAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const numbers = useMemo(shuffled, []);
  const [next, setNext] = useState(1);
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  const handleTap = useCallback((value: number) => {
    if (done || cleared.has(value)) return;

    if (value === next) {
      if (navigator.vibrate) navigator.vibrate(20);
      setCleared(prev => {
        const nextSet = new Set(prev);
        nextSet.add(value);
        return nextSet;
      });
      if (value === TOTAL) {
        if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
        setDone(true);
        setTimeout(onCleaned, 450);
      } else {
        setNext(value + 1);
      }
    } else {
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      setWrongAt(value);
      setTimeout(() => setWrongAt(prev => (prev === value ? null : prev)), 260);
    }
  }, [done, cleared, next, onCleaned]);

  const progress = cleared.size;
  const elapsed = done ? ((Date.now() - startedAtRef.current) / 1000).toFixed(1) : null;

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Foggy backdrop */}
          <div className="absolute inset-0 backdrop-blur-xl bg-slate-900/75" />
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(120,180,255,0.25) 0%, transparent 55%),
                radial-gradient(circle at 75% 65%, rgba(180,140,255,0.20) 0%, transparent 50%),
                radial-gradient(circle at 50% 90%, rgba(80,200,255,0.18) 0%, transparent 45%)
              `,
            }}
          />

          {/* Header */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold tracking-wider">
              🌫 СЕТКА ДЕЗОРИЕНТАЦИИ
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/20 border border-cyan-400/50 rounded-full px-3 py-1 text-cyan-100 text-xs font-bold">
                Нажми: <span className="text-cyan-300 text-base ml-1">{next}</span>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white/80 text-xs font-bold">
                {progress}/{TOTAL}
              </div>
            </div>
          </div>

          {/* 4x4 Grid */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm aspect-square">
              {numbers.map((value) => {
                const isCleared = cleared.has(value);
                const isWrong = wrongAt === value;
                const isNext = value === next && !isCleared;

                return (
                  <motion.button
                    key={value}
                    onTouchStart={(e) => { e.preventDefault(); handleTap(value); }}
                    onClick={() => handleTap(value)}
                    disabled={isCleared}
                    className={`
                      relative rounded-xl border-2 font-bold text-2xl
                      flex items-center justify-center overflow-hidden
                      transition-colors
                      ${isCleared
                        ? 'border-transparent bg-transparent text-transparent'
                        : isWrong
                          ? 'border-red-400 bg-red-500/30 text-red-100'
                          : isNext
                            ? 'border-cyan-300/80 bg-cyan-500/15 text-white shadow-[0_0_18px_rgba(34,211,238,0.35)]'
                            : 'border-white/25 bg-white/10 text-white/90 backdrop-blur-sm active:scale-95'
                      }
                    `}
                    animate={
                      isCleared
                        ? { scale: [1, 1.15, 0], opacity: [1, 0.6, 0], rotate: [0, 10, -10] }
                        : isWrong
                          ? { x: [0, -6, 6, -4, 4, 0] }
                          : isNext
                            ? { scale: [1, 1.04, 1] }
                            : { scale: 1 }
                    }
                    transition={
                      isCleared
                        ? { duration: 0.4, ease: 'easeOut' }
                        : isWrong
                          ? { duration: 0.26 }
                          : isNext
                            ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.1 }
                    }
                  >
                    {!isCleared && value}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Footer hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <p className="text-white/50 text-xs font-medium tracking-wide text-center">
              Восстанови концентрацию: тапай числа по порядку
            </p>
          </div>

          {elapsed && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs">
              {elapsed}s
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
