import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface IceScreenAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

export const IceScreenAttack: React.FC<IceScreenAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [cells, setCells] = useState<boolean[]>(new Array(9).fill(false)); // false = frozen
  const [done, setDone] = useState(false);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  const handleTap = useCallback((index: number) => {
    if (cells[index] || done) return;
    if (navigator.vibrate) navigator.vibrate(30);

    setCells(prev => {
      const next = [...prev];
      next[index] = true;
      const allCracked = next.every(Boolean);
      if (allCracked) {
        setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          setDone(true);
          setTimeout(onCleaned, 400);
        }, 200);
      }
      return next;
    });
  }, [cells, done, onCleaned]);

  const crackedCount = cells.filter(Boolean).length;

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Frost background */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/80 via-white/70 to-blue-300/80 backdrop-blur-md" />

          {/* Ice crystal pattern */}
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 40%),
                radial-gradient(circle at 70% 60%, rgba(200,230,255,0.6) 0%, transparent 30%),
                radial-gradient(circle at 50% 80%, rgba(180,220,255,0.7) 0%, transparent 35%)
              `
            }}
          />

          {/* Counter */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold">
              ❄️ Разбей лёд! {crackedCount}/9
            </div>
          </div>

          {/* 3x3 Grid */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm aspect-square">
              {cells.map((cracked, i) => (
                <motion.button
                  key={i}
                  onTouchStart={(e) => { e.preventDefault(); handleTap(i); }}
                  onClick={() => handleTap(i)}
                  className={`
                    rounded-xl border-2 relative overflow-hidden transition-colors
                    ${cracked
                      ? 'border-transparent bg-transparent'
                      : 'border-white/40 bg-white/30 backdrop-blur-sm active:scale-95'
                    }
                  `}
                  animate={cracked ? {
                    scale: [1, 1.1, 0],
                    opacity: [1, 0.5, 0],
                    rotate: [0, 15, -30],
                  } : {}}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {!cracked && (
                    <>
                      {/* Ice texture */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-cyan-200/40" />
                      {/* Crack lines hint */}
                      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-60">
                        ❄️
                      </div>
                    </>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
