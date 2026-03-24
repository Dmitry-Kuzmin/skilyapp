import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface SunGlareAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type SunPhase = 'blinding' | 'adapt' | 'visor' | 'flares' | 'completed';

const NETWORK_LATENCY_BUFFER_MS = 5000;

// Lens flare positions (relative %)
interface LensFlare {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

// Flare spots that need to be tapped away
interface FlareSpot {
  id: number;
  x: number;
  y: number;
  size: number;
  tapped: boolean;
}

export const SunGlareAttack: React.FC<SunGlareAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<SunPhase>('blinding');
  const [done, setDone] = useState(false);
  const [whiteout, setWhiteout] = useState(1); // 1 = fully white, 0 = clear
  const [visorY, setVisorY] = useState(0); // 0 = top, 100 = fully down
  const [visorLocked, setVisorLocked] = useState(false);
  const [flareSpots, setFlareSpots] = useState<FlareSpot[]>([]);
  const [lensFlares, setLensFlares] = useState<LensFlare[]>([]);
  const [sunPosX, setSunPosX] = useState(50); // sun horizontal position %

  const phaseRef = useRef<SunPhase>('blinding');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flareIdRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // --- Auto-expire with buffer ---
  useEffect(() => {
    if (!isActive || !expiresAt) return;
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0 && remaining > -NETWORK_LATENCY_BUFFER_MS) {
      const bufferTime = NETWORK_LATENCY_BUFFER_MS + remaining;
      expireTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current === 'completed') onCleaned();
      }, Math.max(0, bufferTime));
      return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
    }
    if (remaining <= -NETWORK_LATENCY_BUFFER_MS) return;
    if (remaining < 1000) return;

    expireTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'completed') onCleaned();
    }, remaining);

    return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
  }, [isActive, expiresAt, onCleaned]);

  // --- Phase progression ---
  useEffect(() => {
    if (!isActive) {
      setPhase('blinding');
      setDone(false);
      setWhiteout(1);
      setVisorY(0);
      setVisorLocked(false);
      setFlareSpots([]);
      return;
    }

    if (navigator.vibrate) navigator.vibrate([30, 20, 60]);

    // Generate decorative lens flares
    const flares: LensFlare[] = [];
    const colors = ['rgba(255,200,50,0.6)', 'rgba(255,150,0,0.4)', 'rgba(255,255,200,0.5)', 'rgba(100,200,255,0.3)'];
    for (let i = 0; i < 8; i++) {
      flares.push({
        id: i,
        x: 30 + Math.random() * 40,
        y: 10 + (i / 8) * 60,
        size: 10 + Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
    setLensFlares(flares);

    // Blinding phase: 2s of white
    const adaptTimer = setTimeout(() => {
      setPhase('adapt');
    }, 2000);

    // Eyes adapt: whiteout decreases over 1.5s, then visor phase
    const visorTimer = setTimeout(() => {
      setPhase('visor');
    }, 3500);

    return () => {
      clearTimeout(adaptTimer);
      clearTimeout(visorTimer);
    };
  }, [isActive]);

  // --- Whiteout animation ---
  useEffect(() => {
    if (phase === 'blinding') {
      setWhiteout(1);
      return;
    }
    if (phase === 'adapt') {
      // Gradually reduce whiteout
      const interval = setInterval(() => {
        setWhiteout(prev => {
          const next = prev - 0.02;
          if (next <= 0.5) { clearInterval(interval); return 0.5; }
          return next;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // --- Sun movement (subtle drift) ---
  useEffect(() => {
    if (!isActive || phase === 'completed') return;
    const interval = setInterval(() => {
      setSunPosX(prev => {
        const drift = (Math.random() - 0.5) * 2;
        return Math.max(30, Math.min(70, prev + drift));
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isActive, phase]);

  // --- Visor drag handlers ---
  const handleStart = useCallback((clientY: number) => {
    if (phase !== 'visor' || visorLocked) return;
    isDraggingRef.current = true;
  }, [phase, visorLocked]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current || !containerRef.current || phase !== 'visor' || visorLocked) return;
    const rect = containerRef.current.getBoundingClientRect();
    const delta = clientY - rect.top;
    const pct = Math.max(0, Math.min(100, (delta / rect.height) * 100));
    setVisorY(pct);

    // Reduce whiteout as visor goes down
    setWhiteout(Math.max(0.05, 0.5 * (1 - pct / 100)));

    if (pct >= 70 && !visorLocked) {
      setVisorLocked(true);
      isDraggingRef.current = false;
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

      // Transition to flares phase after visor locks
      setTimeout(() => {
        // Generate flare spots to tap
        const spots: FlareSpot[] = [];
        for (let i = 0; i < 5; i++) {
          spots.push({
            id: flareIdRef.current++,
            x: 15 + Math.random() * 70,
            y: 25 + Math.random() * 50,
            size: 40 + Math.random() * 30,
            tapped: false,
          });
        }
        setFlareSpots(spots);
        setPhase('flares');
      }, 500);
    }
  }, [phase, visorLocked]);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (phase === 'visor' && !visorLocked && visorY < 70) {
      // Spring back
      setVisorY(prev => Math.max(0, prev - 15));
      setWhiteout(prev => Math.min(0.5, prev + 0.05));
    }
  }, [phase, visorLocked, visorY]);

  // --- Flare spot tap handler ---
  const handleFlareTap = useCallback((id: number) => {
    if (phase !== 'flares' || done) return;
    if (navigator.vibrate) navigator.vibrate(20);

    setFlareSpots(prev => {
      const next = prev.map(f => f.id === id ? { ...f, tapped: true } : f);
      const allTapped = next.every(f => f.tapped);
      if (allTapped) {
        setPhase('completed');
        setDone(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
        setTimeout(onCleaned, 700);
      }
      return next;
    });
  }, [phase, done, onCleaned]);

  const remainingFlares = flareSpots.filter(f => !f.tapped).length;

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={e => handleStart(e.touches[0].clientY)}
          onTouchMove={e => handleMove(e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          onMouseDown={e => handleStart(e.clientY)}
          onMouseMove={e => { if (isDraggingRef.current) handleMove(e.clientY); }}
          onMouseUp={handleEnd}
        >
          {/* === SKY BACKGROUND === */}
          <div className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                #87CEEB ${Math.max(0, 20 - visorY * 0.2)}%,
                #E0F0FF ${50 - visorY * 0.3}%,
                #B0D4F1 100%
              )`,
            }}
          />

          {/* === SUN === */}
          <motion.div
            className="absolute"
            style={{
              left: `${sunPosX}%`,
              top: '8%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Sun corona */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="w-48 h-48 rounded-full absolute -inset-8"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,200,0.5) 0%, rgba(255,200,50,0.2) 50%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
            {/* Sun core */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-32 h-32 rounded-full"
              style={{
                background: 'radial-gradient(circle, #fff 20%, #ffd700 50%, #ff8c00 80%, transparent 100%)',
                boxShadow: `0 0 60px 30px rgba(255,200,50,0.5), 0 0 120px 60px rgba(255,150,0,0.3)`,
                opacity: Math.max(0.2, 1 - visorY / 100),
              }}
            />
            {/* Sun rays */}
            {[0, 30, 60, 90, 120, 150].map(angle => (
              <motion.div
                key={angle}
                className="absolute top-1/2 left-1/2 w-1 origin-left"
                style={{
                  transform: `rotate(${angle}deg)`,
                  height: '120px',
                  background: 'linear-gradient(90deg, rgba(255,200,50,0.4), transparent)',
                  filter: 'blur(2px)',
                  opacity: Math.max(0, 0.6 - visorY / 120),
                }}
                animate={{ scaleX: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 + angle * 0.01, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>

          {/* === LENS FLARES (decorative) === */}
          {lensFlares.map(flare => (
            <motion.div
              key={flare.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${flare.x}%`,
                top: `${flare.y}%`,
                width: flare.size,
                height: flare.size,
                background: flare.color,
                filter: 'blur(3px)',
                opacity: flare.opacity * Math.max(0, 1 - visorY / 100),
              }}
              animate={{ scale: [1, 1.3, 1], opacity: [flare.opacity * 0.5, flare.opacity, flare.opacity * 0.5] }}
              transition={{ repeat: Infinity, duration: 2 + flare.id * 0.3, ease: 'easeInOut' }}
            />
          ))}

          {/* === WHITEOUT OVERLAY === */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `rgba(255,255,255,${whiteout})`,
            }}
          />

          {/* === VISOR (dark bar pulled down) === */}
          {(phase === 'visor' || phase === 'flares' || visorY > 0) && (
            <motion.div
              initial={{ height: 0 }}
              className="absolute left-0 right-0 top-0 z-10"
              style={{ height: `${visorY}%` }}
            >
              <div className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
                  borderBottom: '3px solid #334155',
                }}
              />
              {/* Visor tint gradient at bottom edge */}
              <div className="absolute bottom-0 left-0 right-0 h-8"
                style={{ background: 'linear-gradient(180deg, transparent, rgba(0,100,0,0.15))' }}
              />

              {/* Handle */}
              {!visorLocked && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20">
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="bg-slate-600 rounded-full px-8 py-2.5 border border-slate-500 shadow-xl"
                  >
                    <div className="w-10 h-1 bg-slate-400 rounded-full mx-auto mb-1" />
                    <span className="text-white/80 text-xs font-bold tracking-wider">↓ КОЗЫРЁК ↓</span>
                  </motion.div>
                </div>
              )}

              {/* Locked indicator */}
              {visorLocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20"
                >
                  <div className="bg-green-600/80 rounded-full px-4 py-1.5 border border-green-400/50 shadow-lg">
                    <span className="text-white text-xs font-bold">✓ Зафиксирован</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* === FLARE SPOTS (tappable in flares phase) === */}
          {phase === 'flares' && flareSpots.map(spot => !spot.tapped && (
            <motion.div
              key={spot.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.7, 1, 0.7],
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 + spot.id * 0.2 }}
              className="absolute z-20 cursor-pointer"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: spot.size,
                height: spot.size,
                transform: 'translate(-50%, -50%)',
              }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); handleFlareTap(spot.id); }}
              onClick={e => { e.stopPropagation(); handleFlareTap(spot.id); }}
            >
              <div className="w-full h-full rounded-full relative"
                style={{
                  background: 'radial-gradient(circle, #fff 10%, rgba(255,200,50,0.8) 40%, rgba(255,150,0,0.4) 70%, transparent 100%)',
                  boxShadow: '0 0 20px 10px rgba(255,200,50,0.4)',
                }}
              >
                {/* Tap target indicator */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/50"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              </div>
            </motion.div>
          ))}

          {/* Tapped flare explosion */}
          {flareSpots.filter(f => f.tapped).map(spot => (
            <motion.div
              key={`tapped-${spot.id}`}
              className="absolute pointer-events-none z-20"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-12 h-12 rounded-full bg-yellow-300/60" style={{ filter: 'blur(4px)' }} />
            </motion.div>
          ))}

          {/* === UI OVERLAY === */}
          {/* Phase: blinding */}
          {phase === 'blinding' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5] }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center z-20"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-6xl mb-3 drop-shadow-[0_0_40px_rgba(255,200,50,0.8)]"
                >
                  ☀️
                </motion.div>
                <div className="text-yellow-900/80 font-black text-xl drop-shadow-lg">
                  ОСЛЕПЛЕНИЕ!
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase: adapt */}
          {phase === 'adapt' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold animate-pulse">
                👀 Глаза привыкают...
              </div>
            </motion.div>
          )}

          {/* Phase: visor hint */}
          {phase === 'visor' && visorY < 15 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold">
                ☀️ Тяни козырёк вниз!
              </div>
            </motion.div>
          )}

          {/* Phase: flares */}
          {phase === 'flares' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                <span>✨</span>
                Убери блики! ({flareSpots.filter(f => f.tapped).length}/{flareSpots.length})
              </div>
            </motion.div>
          )}

          {/* === COMPLETION === */}
          {phase === 'completed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-30"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-5xl mb-2">😎</div>
                <div className="text-white font-black text-xl drop-shadow-lg">
                  ВИДИМОСТЬ ВОССТАНОВЛЕНА
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* === PHASE PROGRESS DOTS === */}
          {phase !== 'blinding' && phase !== 'completed' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                {['adapt', 'visor', 'flares'].map((p, i) => (
                  <React.Fragment key={p}>
                    <div className={`
                      w-2 h-2 rounded-full transition-colors
                      ${phase === p ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]' :
                        (['adapt', 'visor', 'flares'].indexOf(phase) > i) ? 'bg-green-400' : 'bg-white/20'}
                    `} />
                    {i < 2 && <div className="w-4 h-0.5 bg-white/10" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
