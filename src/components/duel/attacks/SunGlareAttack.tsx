import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface SunGlareAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

export const SunGlareAttack: React.FC<SunGlareAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [visorY, setVisorY] = useState(0); // 0 = top, 100 = fully down
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  const handleStart = (clientY: number) => {
    isDraggingRef.current = true;
    startYRef.current = clientY;
  };

  const handleMove = (clientY: number) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const delta = clientY - rect.top;
    const pct = Math.max(0, Math.min(100, (delta / rect.height) * 100));
    setVisorY(pct);

    if (pct >= 75 && !done) {
      setDone(true);
      isDraggingRef.current = false;
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      setTimeout(onCleaned, 500);
    }
  };

  const handleEnd = () => {
    isDraggingRef.current = false;
    if (!done && visorY < 75) {
      setVisorY(prev => Math.max(0, prev - 10)); // Spring back slightly
    }
  };

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={e => handleStart(e.touches[0].clientY)}
          onTouchMove={e => handleMove(e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          onMouseDown={e => handleStart(e.clientY)}
          onMouseMove={e => { if (isDraggingRef.current) handleMove(e.clientY); }}
          onMouseUp={handleEnd}
        >
          {/* Sun glare overlay */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: 1 - visorY / 120 }}
            style={{
              background: 'radial-gradient(circle at 50% 15%, #fff 0%, #fbbf24 25%, #f59e0b 50%, rgba(245,158,11,0.3) 80%, transparent 100%)',
            }}
          />

          {/* Pulsing sun */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-[5%] left-1/2 -translate-x-1/2 w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, #fff 30%, #fbbf24 60%, transparent 100%)',
              boxShadow: '0 0 80px 40px rgba(251,191,36,0.6)',
              opacity: Math.max(0, 1 - visorY / 80),
            }}
          />

          {/* Visor (dark bar you pull down) */}
          <motion.div
            className="absolute left-0 right-0 top-0"
            style={{ height: `${visorY}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 border-b-4 border-gray-600" />
            {/* Handle */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="bg-gray-500 rounded-full px-8 py-2 border border-gray-400 shadow-lg"
              >
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-1" />
                <span className="text-white/80 text-xs font-bold">↓ ТЯНИ КОЗЫРЁК ↓</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Hint */}
          {visorY < 10 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold animate-bounce">
                ☀️ Свайп вниз — опусти козырёк!
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
