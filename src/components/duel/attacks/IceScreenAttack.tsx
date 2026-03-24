import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface IceScreenAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type IcePhase = 'warning' | 'freezing' | 'frozen' | 'thawing' | 'completed';

// Frost crystal SVG path fragments for visual variety
const CRYSTAL_PATHS = [
  'M50,0 L55,20 L70,10 L60,30 L80,25 L60,40 L75,50 L55,45 L50,65 L45,45 L25,50 L40,40 L20,25 L40,30 L30,10 L45,20 Z',
  'M50,5 L58,25 L75,15 L62,35 L85,30 L62,45 L50,60 L38,45 L15,30 L38,35 L25,15 L42,25 Z',
  'M50,0 L52,30 L70,20 L55,40 L75,50 L50,48 L25,50 L45,40 L30,20 L48,30 Z',
];

// Frost particle for the freezing phase
interface FrostParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  rotation: number;
  crystal: number; // index into CRYSTAL_PATHS
}

// Heat trail point
interface HeatPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  radius: number;
}

const NETWORK_LATENCY_BUFFER_MS = 5000;
const HEAT_TRAIL_LIFETIME = 2500; // ms before heat trail fades and ice regrows
const HEAT_RADIUS = 55; // px radius of heat effect
const REQUIRED_THAW_PERCENT = 80;

export const IceScreenAttack: React.FC<IceScreenAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<IcePhase>('warning');
  const [done, setDone] = useState(false);
  const [temperature, setTemperature] = useState(20); // starts at 20°C, drops to -20°C
  const [frostParticles, setFrostParticles] = useState<FrostParticle[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [thawPercent, setThawPercent] = useState(0);
  const [fingerActive, setFingerActive] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const phaseRef = useRef<IcePhase>('warning');
  const thawPercentRef = useRef(0);
  const heatPointsRef = useRef<HeatPoint[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  const heatIdRef = useRef(0);
  const lastAddRef = useRef(0);
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { thawPercentRef.current = thawPercent; }, [thawPercent]);
  useEffect(() => { heatPointsRef.current = heatPoints; }, [heatPoints]);

  // --- Auto-expire with network buffer (same pattern as OilSplash) ---
  useEffect(() => {
    if (!isActive || !expiresAt) return;

    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0 && remaining > -NETWORK_LATENCY_BUFFER_MS) {
      const bufferTime = NETWORK_LATENCY_BUFFER_MS + remaining;
      expireTimeoutRef.current = setTimeout(() => {
        if (thawPercentRef.current >= REQUIRED_THAW_PERCENT) {
          onCleaned();
        }
      }, Math.max(0, bufferTime));
      return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
    }

    if (remaining <= -NETWORK_LATENCY_BUFFER_MS) return;
    if (remaining < 1000) return;

    expireTimeoutRef.current = setTimeout(() => {
      if (thawPercentRef.current >= REQUIRED_THAW_PERCENT) {
        onCleaned();
      }
    }, remaining);

    return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
  }, [isActive, expiresAt, onCleaned]);

  // --- Phase 1: Warning (1.5s) → Freezing (2s) → Frozen ---
  useEffect(() => {
    if (!isActive) {
      setPhase('warning');
      setDone(false);
      setTemperature(20);
      setFrostParticles([]);
      setHeatPoints([]);
      setThawPercent(0);
      return;
    }

    // Warning phase: screen shake + temperature drops
    const freezingTimer = setTimeout(() => {
      setPhase('freezing');
      if (navigator.vibrate) navigator.vibrate([30, 20, 30, 20, 50]);

      // Generate frost particles that grow from edges
      const particles: FrostParticle[] = [];
      for (let i = 0; i < 60; i++) {
        // Concentrate on edges
        const edge = Math.random();
        let x: number, y: number;
        if (edge < 0.25) { x = Math.random() * 20; y = Math.random() * 100; }
        else if (edge < 0.5) { x = 80 + Math.random() * 20; y = Math.random() * 100; }
        else if (edge < 0.75) { x = Math.random() * 100; y = Math.random() * 20; }
        else { x = Math.random() * 100; y = 80 + Math.random() * 20; }

        particles.push({
          id: particleIdRef.current++,
          x, y,
          size: 15 + Math.random() * 35,
          opacity: 0.3 + Math.random() * 0.5,
          delay: Math.random() * 1.5,
          rotation: Math.random() * 360,
          crystal: Math.floor(Math.random() * CRYSTAL_PATHS.length),
        });
      }
      // Add center particles with longer delay
      for (let i = 0; i < 30; i++) {
        particles.push({
          id: particleIdRef.current++,
          x: 15 + Math.random() * 70,
          y: 15 + Math.random() * 70,
          size: 20 + Math.random() * 40,
          opacity: 0.2 + Math.random() * 0.4,
          delay: 0.8 + Math.random() * 1.2,
          rotation: Math.random() * 360,
          crystal: Math.floor(Math.random() * CRYSTAL_PATHS.length),
        });
      }
      setFrostParticles(particles);
    }, 1500);

    const frozenTimer = setTimeout(() => {
      setPhase('frozen');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, 3500);

    // Short delay then allow interaction
    const thawTimer = setTimeout(() => {
      setPhase('thawing');
    }, 4200);

    return () => {
      clearTimeout(freezingTimer);
      clearTimeout(frozenTimer);
      clearTimeout(thawTimer);
    };
  }, [isActive]);

  // --- Temperature animation during warning/freezing ---
  useEffect(() => {
    if (phase !== 'warning' && phase !== 'freezing') return;

    const interval = setInterval(() => {
      setTemperature(prev => {
        if (phase === 'warning') return Math.max(0, prev - 2);
        return Math.max(-25, prev - 3);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  // --- Heat trail decay loop: ice regrows where heat expires ---
  useEffect(() => {
    if (phase !== 'thawing') return;

    const tick = () => {
      const now = Date.now();

      setHeatPoints(prev => {
        const alive = prev.filter(p => now - p.timestamp < HEAT_TRAIL_LIFETIME);
        // Recalculate thaw percent based on coverage
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const totalArea = rect.width * rect.height;
          // Approximate coverage using grid sampling
          const gridSize = 20;
          const cols = Math.ceil(rect.width / gridSize);
          const rows = Math.ceil(rect.height / gridSize);
          let thawedCells = 0;
          const totalCells = cols * rows;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cx = (c + 0.5) * gridSize;
              const cy = (r + 0.5) * gridSize;
              const isThawed = alive.some(p => {
                const px = (p.x / 100) * rect.width;
                const py = (p.y / 100) * rect.height;
                const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
                return dist < p.radius;
              });
              if (isThawed) thawedCells++;
            }
          }

          const pct = Math.round((thawedCells / totalCells) * 100);
          setThawPercent(pct);

          if (pct >= REQUIRED_THAW_PERCENT) {
            setPhase('completed');
            setDone(true);
            if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
            setTimeout(onCleaned, 600);
            return alive;
          }
        }
        return alive;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [phase, onCleaned]);

  // --- Touch/mouse handlers for heat trail ---
  const addHeatPoint = useCallback((clientX: number, clientY: number) => {
    if (phase !== 'thawing' || done) return;
    const now = Date.now();
    if (now - lastAddRef.current < 30) return;
    lastAddRef.current = now;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setLastPos({ x: clientX, y: clientY });

    setHeatPoints(prev => [...prev, {
      id: heatIdRef.current++,
      x, y,
      timestamp: now,
      radius: HEAT_RADIUS,
    }]);

    if (navigator.vibrate && heatIdRef.current % 5 === 0) navigator.vibrate(8);
  }, [phase, done]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setFingerActive(true);
    addHeatPoint(e.touches[0].clientX, e.touches[0].clientY);
  }, [addHeatPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0) {
      setFingerActive(true);
      addHeatPoint(e.clientX, e.clientY);
    }
  }, [addHeatPoint]);

  // Build CSS mask for thawed areas (heat melts ice)
  const buildIceMask = useCallback(() => {
    if (heatPoints.length === 0) return 'none';
    const base = 'radial-gradient(circle 1px at 0% 0%, white 0%, white 100%)';
    const holes = heatPoints.map(p =>
      `radial-gradient(circle ${p.radius}px at ${p.x}% ${p.y}%, transparent 40%, white 100%)`
    ).join(', ');
    return `${base}, ${holes}`;
  }, [heatPoints]);

  // Temperature color
  const tempColor = temperature > 10 ? '#22c55e' : temperature > 0 ? '#eab308' : temperature > -10 ? '#3b82f6' : '#dc2626';

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={e => { setFingerActive(true); addHeatPoint(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setFingerActive(false)}
          onMouseDown={e => { setFingerActive(true); addHeatPoint(e.clientX, e.clientY); }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setFingerActive(false)}
        >
          {/* === PHASE: WARNING — Screen shakes, temperature drops === */}
          {phase === 'warning' && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center"
              animate={{
                x: [0, -3, 3, -2, 2, 0],
                backgroundColor: [`rgba(0,50,80,${0.3 + (20 - temperature) / 40})`, `rgba(0,50,80,${0.5 + (20 - temperature) / 40})`],
              }}
              transition={{ x: { repeat: Infinity, duration: 0.3 }, backgroundColor: { duration: 0.5 } }}
            >
              {/* Temperature gauge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: tempColor, boxShadow: `0 0 20px ${tempColor}40` }}
                >
                  <span className="text-3xl">🌡️</span>
                </div>
                <motion.div
                  className="text-5xl font-black font-mono tabular-nums"
                  style={{ color: tempColor }}
                  animate={{ scale: temperature < 0 ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  {temperature > 0 ? '+' : ''}{temperature}°C
                </motion.div>
                <div className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2">
                  ⚠️ Температура падает...
                </div>
              </motion.div>

              {/* Frost creeping from edges */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-cyan-200/30 to-transparent"
                  style={{ opacity: Math.min(1, (20 - temperature) / 20) }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cyan-200/30 to-transparent"
                  style={{ opacity: Math.min(1, (20 - temperature) / 20) }}
                />
                <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-cyan-200/30 to-transparent"
                  style={{ opacity: Math.min(1, (20 - temperature) / 20) }}
                />
                <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-cyan-200/30 to-transparent"
                  style={{ opacity: Math.min(1, (20 - temperature) / 20) }}
                />
              </div>
            </motion.div>
          )}

          {/* === PHASE: FREEZING — Crystals grow from edges === */}
          {(phase === 'freezing' || phase === 'frozen' || phase === 'thawing') && (
            <>
              {/* Base ice layer */}
              <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(135deg, rgba(180,220,255,0.85) 0%, rgba(200,240,255,0.75) 30%, rgba(220,245,255,0.9) 60%, rgba(190,230,255,0.8) 100%)',
                  backdropFilter: 'blur(12px)',
                  ...(phase === 'thawing' && heatPoints.length > 0 ? {
                    WebkitMaskImage: buildIceMask(),
                    maskImage: buildIceMask(),
                    WebkitMaskComposite: 'intersect',
                    maskComposite: 'intersect',
                  } : {}),
                }}
              />

              {/* Frost crystal particles */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={phase === 'thawing' && heatPoints.length > 0 ? {
                  WebkitMaskImage: buildIceMask(),
                  maskImage: buildIceMask(),
                  WebkitMaskComposite: 'intersect',
                  maskComposite: 'intersect',
                } : {}}
              >
                {frostParticles.map(p => (
                  <motion.div
                    key={p.id}
                    className="absolute"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: p.size,
                      height: p.size,
                    }}
                    initial={{ scale: 0, opacity: 0, rotate: p.rotation }}
                    animate={{
                      scale: phase === 'freezing' ? [0, 1.2, 1] : 1,
                      opacity: p.opacity,
                      rotate: p.rotation + 30,
                    }}
                    transition={{
                      delay: p.delay,
                      duration: 0.8,
                      ease: 'easeOut',
                    }}
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 3px rgba(200,230,255,0.8))' }}>
                      <path
                        d={CRYSTAL_PATHS[p.crystal]}
                        fill="rgba(255,255,255,0.7)"
                        stroke="rgba(200,230,255,0.9)"
                        strokeWidth="1"
                      />
                    </svg>
                  </motion.div>
                ))}
              </div>

              {/* Ice surface texture (cracks pattern) */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: `
                    linear-gradient(30deg, transparent 40%, rgba(255,255,255,0.5) 41%, transparent 42%),
                    linear-gradient(150deg, transparent 55%, rgba(255,255,255,0.4) 56%, transparent 57%),
                    linear-gradient(80deg, transparent 30%, rgba(200,230,255,0.3) 31%, transparent 32%),
                    linear-gradient(210deg, transparent 60%, rgba(255,255,255,0.3) 61%, transparent 62%)
                  `,
                  backgroundSize: '100% 100%',
                  ...(phase === 'thawing' && heatPoints.length > 0 ? {
                    WebkitMaskImage: buildIceMask(),
                    maskImage: buildIceMask(),
                    WebkitMaskComposite: 'intersect',
                    maskComposite: 'intersect',
                  } : {}),
                }}
              />

              {/* Shimmer effect on frozen ice */}
              {(phase === 'frozen' || phase === 'thawing') && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    ...(phase === 'thawing' && heatPoints.length > 0 ? {
                      WebkitMaskImage: buildIceMask(),
                      maskImage: buildIceMask(),
                      WebkitMaskComposite: 'intersect',
                      maskComposite: 'intersect',
                    } : {}),
                  }}
                />
              )}
            </>
          )}

          {/* === HEAT TRAIL GLOW (visible in thawing phase) === */}
          {phase === 'thawing' && heatPoints.slice(-8).map(p => {
            const age = Date.now() - p.timestamp;
            const lifeRatio = Math.max(0, 1 - age / HEAT_TRAIL_LIFETIME);
            return (
              <motion.div
                key={p.id}
                className="absolute pointer-events-none rounded-full"
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 1.5 }}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.radius * 2,
                  height: p.radius * 2,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, rgba(255,140,50,${0.4 * lifeRatio}) 0%, rgba(255,80,20,${0.2 * lifeRatio}) 40%, transparent 70%)`,
                }}
              />
            );
          })}

          {/* === FINGER CURSOR HEAT INDICATOR === */}
          {phase === 'thawing' && fingerActive && (
            <motion.div
              className="absolute pointer-events-none rounded-full"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                left: lastPos.x,
                top: lastPos.y,
                width: HEAT_RADIUS * 2.5,
                height: HEAT_RADIUS * 2.5,
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(255,100,30,0.5) 0%, rgba(255,60,10,0.2) 50%, transparent 70%)',
                boxShadow: '0 0 30px rgba(255,100,30,0.4)',
                position: 'fixed',
              }}
            />
          )}

          {/* === UI OVERLAY === */}
          {/* Temperature display (all phases) */}
          {phase !== 'warning' && (
            <div className="absolute top-3 right-3 z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2"
              >
                <span className="text-lg">🌡️</span>
                <span className="text-white font-mono font-bold text-sm" style={{ color: '#3b82f6' }}>
                  {temperature}°C
                </span>
              </motion.div>
            </div>
          )}

          {/* Phase-specific UI */}
          {phase === 'freezing' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-10"
            >
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                >
                  ❄️
                </motion.span>
                Экран замерзает...
              </div>
            </motion.div>
          )}

          {phase === 'frozen' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-6xl mb-4"
                >
                  🥶
                </motion.div>
                <div className="text-white font-black text-2xl drop-shadow-lg">
                  ЭКРАН ЗАМОРОЖЕН
                </div>
                <div className="text-cyan-200/80 text-sm mt-2">
                  Приготовься размораживать...
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'thawing' && (
            <>
              {/* Instruction */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-10"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                  <span>🔥</span>
                  Води пальцем — растопи лёд! ({thawPercent}%)
                </div>
              </motion.div>

              {/* Progress bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-48">
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: thawPercent > 60
                        ? 'linear-gradient(90deg, #f97316, #ef4444)'
                        : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                    }}
                    animate={{ width: `${thawPercent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="text-center text-white/60 text-xs mt-1 font-mono">
                  {thawPercent < REQUIRED_THAW_PERCENT
                    ? `Растоплено: ${thawPercent}% / ${REQUIRED_THAW_PERCENT}%`
                    : '✅ Лёд растоплен!'
                  }
                </div>
              </div>

              {/* Warning: ice regrows */}
              {!fingerActive && thawPercent > 10 && thawPercent < REQUIRED_THAW_PERCENT && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10"
                >
                  <div className="bg-red-500/30 backdrop-blur-sm rounded-full px-4 py-1.5 text-red-200 text-xs font-bold">
                    ❄️ Лёд нарастает обратно! Не останавливайся!
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* === COMPLETION OVERLAY === */}
          {phase === 'completed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              {/* Water droplets falling effect */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-4 bg-cyan-300/60 rounded-full"
                  initial={{
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                    y: -10,
                    opacity: 0.8,
                  }}
                  animate={{
                    y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.8 + Math.random() * 0.6,
                    delay: Math.random() * 0.3,
                    ease: 'easeIn',
                  }}
                />
              ))}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center"
              >
                <div className="text-5xl mb-2">☀️</div>
                <div className="text-white font-black text-xl drop-shadow-lg">
                  ОТТАЯЛ!
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
