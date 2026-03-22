import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface BugSplatAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

const SPLAT_POSITIONS = [
  { top: '25%', left: '15%', rotate: 12, scale: 1.1 },
  { top: '35%', left: '60%', rotate: -20, scale: 0.9 },
  { top: '55%', left: '30%', rotate: 45, scale: 1.2 },
  { top: '65%', left: '70%', rotate: -10, scale: 1.0 },
];

export const BugSplatAttack: React.FC<BugSplatAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [washing, setWashing] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  const startHold = useCallback(() => {
    if (done || washing) return;
    setIsHolding(true);
    if (navigator.vibrate) navigator.vibrate(20);

    intervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        const next = prev + 5; // 5% every 100ms = 2 seconds total
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setWashing(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

          // Wash animation, then clean
          setTimeout(() => {
            setDone(true);
            setTimeout(onCleaned, 400);
          }, 1200);
        }
        return Math.min(next, 100);
      });
    }, 100);
  }, [done, washing, onCleaned]);

  const stopHold = useCallback(() => {
    setIsHolding(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Progress decays when released
    if (!washing) {
      setHoldProgress(prev => Math.max(0, prev - 20));
    }
  }, [washing]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-amber-950/20" />

          {/* Bug splats */}
          {!washing && SPLAT_POSITIONS.map((pos, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: pos.scale, opacity: 1 }}
              transition={{ delay: i * 0.15, type: 'spring', damping: 8 }}
              className="absolute pointer-events-none"
              style={{ top: pos.top, left: pos.left, transform: `rotate(${pos.rotate}deg)` }}
            >
              <div className="relative">
                <div className="text-5xl">💥</div>
                <div className="absolute inset-0 w-20 h-20 -top-2 -left-2 bg-yellow-600/40 rounded-full blur-md" />
              </div>
            </motion.div>
          ))}

          {/* Blue wash animation */}
          {washing && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-b from-blue-400/70 via-blue-300/50 to-transparent"
            />
          )}

          {/* Hint */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold">
              🪰 Зажми омыватель!
            </div>
          </div>

          {/* Washer button */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
            <motion.button
              onTouchStart={e => { e.preventDefault(); startHold(); }}
              onTouchEnd={stopHold}
              onTouchCancel={stopHold}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              animate={isHolding ? { scale: 0.92 } : { scale: 1 }}
              className={`
                relative w-24 h-24 rounded-full border-4
                flex items-center justify-center
                transition-colors
                ${isHolding
                  ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]'
                  : 'bg-gray-800 border-gray-600 shadow-lg'
                }
              `}
            >
              {/* Progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#60a5fa" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${holdProgress * 2.76} 276`}
                  className="transition-all duration-100"
                />
              </svg>
              <span className="text-3xl z-10">💧</span>
            </motion.button>
            <p className="text-center text-white/60 text-xs mt-2 font-bold">
              ЗАЖМИ И ДЕРЖИ
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
