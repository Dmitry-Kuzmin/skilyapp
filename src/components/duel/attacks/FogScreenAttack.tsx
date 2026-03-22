import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface FogScreenAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

interface ClearSpot {
  x: number;
  y: number;
  id: number;
}

export const FogScreenAttack: React.FC<FogScreenAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [clearSpots, setClearSpots] = useState<ClearSpot[]>([]);
  const [done, setDone] = useState(false);
  const spotIdRef = useRef(0);
  const lastAddRef = useRef(0);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned]);

  // Check if enough area is cleared (by number of spots)
  useEffect(() => {
    if (clearSpots.length >= 25 && !done) {
      setDone(true);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      setTimeout(onCleaned, 500);
    }
  }, [clearSpots.length, done, onCleaned]);

  const addSpot = useCallback((clientX: number, clientY: number) => {
    if (done) return;
    const now = Date.now();
    if (now - lastAddRef.current < 50) return; // throttle
    lastAddRef.current = now;

    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;

    setClearSpots(prev => [...prev, { x, y, id: spotIdRef.current++ }]);
  }, [done]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    addSpot(e.touches[0].clientX, e.touches[0].clientY);
  }, [addSpot]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0) {
      addSpot(e.clientX, e.clientY);
    }
  }, [addSpot]);

  // Build CSS mask from clear spots
  const maskImage = clearSpots.length > 0
    ? clearSpots.map(s => `radial-gradient(circle 50px at ${s.x}% ${s.y}%, transparent 0%, transparent 100%)`).join(', ')
    : 'none';

  // Composite mask: each spot creates a transparent hole
  const maskComposite = clearSpots.length > 0
    ? `
      radial-gradient(circle 1px at 0% 0%, black 0%, black 100%)
      ${clearSpots.map(s => `, radial-gradient(circle 50px at ${s.x}% ${s.y}%, transparent 40%, black 100%)`).join('')}
    `
    : 'none';

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9998] select-none"
          style={{ touchAction: 'none' }}
          onTouchMove={handleTouchMove}
          onTouchStart={e => addSpot(e.touches[0].clientX, e.touches[0].clientY)}
          onMouseMove={handleMouseMove}
          onMouseDown={e => addSpot(e.clientX, e.clientY)}
        >
          {/* Fog layer with mask holes */}
          <div
            className="absolute inset-0 backdrop-blur-lg bg-gray-400/60"
            style={clearSpots.length > 0 ? {
              WebkitMaskImage: maskComposite,
              maskImage: maskComposite,
              WebkitMaskComposite: 'intersect',
              maskComposite: 'intersect',
            } : {}}
          />

          {/* Condensation texture */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={clearSpots.length > 0 ? {
              WebkitMaskImage: maskComposite,
              maskImage: maskComposite,
              WebkitMaskComposite: 'intersect',
              maskComposite: 'intersect',
              backgroundImage: `
                radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 100%),
                radial-gradient(1px 1px at 60% 50%, rgba(255,255,255,0.6) 50%, transparent 100%),
                radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.5) 50%, transparent 100%)
              `,
              backgroundSize: '20px 20px, 30px 25px, 25px 30px',
            } : {
              backgroundImage: `
                radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 100%),
                radial-gradient(1px 1px at 60% 50%, rgba(255,255,255,0.6) 50%, transparent 100%),
                radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.5) 50%, transparent 100%)
              `,
              backgroundSize: '20px 20px, 30px 25px, 25px 30px',
            }}
          />

          {/* Hint */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-bold">
              🌫️ Протри стекло пальцем! ({Math.min(100, Math.round(clearSpots.length / 25 * 100))}%)
            </div>
          </div>

          {/* Finger trail glow */}
          {clearSpots.slice(-3).map(spot => (
            <motion.div
              key={spot.id}
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.8 }}
              className="absolute w-16 h-16 rounded-full pointer-events-none"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
