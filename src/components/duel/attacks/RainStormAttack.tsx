import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface RainStormAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

export const RainStormAttack: React.FC<RainStormAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [swipeCount, setSwipeCount] = useState(0);
  const [done, setDone] = useState(false);
  const [wiperAngle, setWiperAngle] = useState(0);
  const lastXRef = useRef(0);
  const lastDirRef = useRef<'left' | 'right' | null>(null);
  const REQUIRED_SWIPES = 8;

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (done) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - lastXRef.current;
    const absDelta = Math.abs(delta);

    if (absDelta < 40) return; // min swipe distance

    const dir: 'left' | 'right' = delta > 0 ? 'right' : 'left';

    // Must alternate directions
    if (lastDirRef.current && dir === lastDirRef.current) {
      lastXRef.current = currentX;
      return;
    }

    lastDirRef.current = dir;
    lastXRef.current = currentX;
    if (navigator.vibrate) navigator.vibrate(15);

    // Animate wiper
    setWiperAngle(dir === 'right' ? 60 : -60);

    setSwipeCount(prev => {
      const next = prev + 1;
      if (next >= REQUIRED_SWIPES) {
        setTimeout(() => {
          setDone(true);
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          setTimeout(onCleaned, 500);
        }, 200);
      }
      return next;
    });
  }, [done, onCleaned]);

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Blur overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-blue-900/30" />

          {/* Rain drops - CSS animated */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-blue-200/40 rounded-full"
                style={{
                  width: `${1 + Math.random() * 2}px`,
                  height: `${10 + Math.random() * 20}px`,
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animation: `rainDrop ${0.4 + Math.random() * 0.6}s linear ${Math.random() * 0.5}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Wiper visual */}
          <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 pointer-events-none">
            <motion.div
              animate={{ rotate: wiperAngle }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-1.5 h-48 bg-gray-800 rounded-full origin-bottom shadow-lg"
              style={{ transformOrigin: 'bottom center' }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-gray-700 rounded-full" />
            </motion.div>
          </div>

          {/* Progress + hint */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold">
              🌧️ Дворники! Свайпь ← → ({swipeCount}/{REQUIRED_SWIPES})
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400 rounded-full"
              animate={{ width: `${(swipeCount / REQUIRED_SWIPES) * 100}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>

          {/* Rain keyframes */}
          <style>{`
            @keyframes rainDrop {
              0% { transform: translateY(-20px); opacity: 0.8; }
              100% { transform: translateY(110vh); opacity: 0.2; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
