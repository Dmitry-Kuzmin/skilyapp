import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface FogScreenAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type FogPhase = 'condensing' | 'fogged' | 'defog' | 'completed';

const NETWORK_LATENCY_BUFFER_MS = 5000;
const FOG_REGROW_INTERVAL = 100; // ms between regrowth ticks
const FOG_REGROW_AMOUNT = 0.3; // % regrowth per tick
const DEFOG_SPEED_MULTIPLIER = 2.5; // how much faster defog clears when blower is on
const REQUIRED_CLEAR_PERCENT = 85;

// Clear spot from finger wiping
interface ClearSpot {
  id: number;
  x: number; // %
  y: number; // %
  radius: number;
  timestamp: number;
  permanent: boolean; // spots from defog blower don't fade
}

// Water droplet running down glass
interface WaterDroplet {
  id: number;
  x: number;
  startY: number;
  speed: number;
  size: number;
  delay: number;
}

export const FogScreenAttack: React.FC<FogScreenAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<FogPhase>('condensing');
  const [done, setDone] = useState(false);
  const [fogOpacity, setFogOpacity] = useState(0); // 0-1 fog density
  const [clearSpots, setClearSpots] = useState<ClearSpot[]>([]);
  const [clearPercent, setClearPercent] = useState(0);
  const [blowerOn, setBlowerOn] = useState(false);
  const [blowerProgress, setBlowerProgress] = useState(0); // 0-100, the blower heats up
  const [waterDroplets, setWaterDroplets] = useState<WaterDroplet[]>([]);
  const [fingerTrail, setFingerTrail] = useState<{ x: number; y: number }[]>([]);

  const phaseRef = useRef<FogPhase>('condensing');
  const clearPercentRef = useRef(0);
  const blowerOnRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotIdRef = useRef(0);
  const dropIdRef = useRef(0);
  const lastAddRef = useRef(0);
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { clearPercentRef.current = clearPercent; }, [clearPercent]);
  useEffect(() => { blowerOnRef.current = blowerOn; }, [blowerOn]);

  // --- Auto-expire ---
  useEffect(() => {
    if (!isActive || !expiresAt) return;
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0 && remaining > -NETWORK_LATENCY_BUFFER_MS) {
      const bufferTime = NETWORK_LATENCY_BUFFER_MS + remaining;
      expireTimeoutRef.current = setTimeout(() => {
        if (clearPercentRef.current >= REQUIRED_CLEAR_PERCENT) onCleaned();
      }, Math.max(0, bufferTime));
      return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
    }
    if (remaining <= -NETWORK_LATENCY_BUFFER_MS) return;
    if (remaining < 1000) return;

    expireTimeoutRef.current = setTimeout(() => {
      if (clearPercentRef.current >= REQUIRED_CLEAR_PERCENT) onCleaned();
    }, remaining);
    return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
  }, [isActive, expiresAt, onCleaned]);

  // --- Phase progression ---
  useEffect(() => {
    if (!isActive) {
      setPhase('condensing');
      setDone(false);
      setFogOpacity(0);
      setClearSpots([]);
      setClearPercent(0);
      setBlowerOn(false);
      setBlowerProgress(0);
      setWaterDroplets([]);
      return;
    }

    // Generate water droplets that run down
    const drops: WaterDroplet[] = [];
    for (let i = 0; i < 15; i++) {
      drops.push({
        id: dropIdRef.current++,
        x: Math.random() * 100,
        startY: Math.random() * 40,
        speed: 0.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 3,
      });
    }
    setWaterDroplets(drops);

    // Condensing phase: fog builds up
    const foggedTimer = setTimeout(() => {
      setPhase('fogged');
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    }, 2500);

    // Defog phase after brief fogged state
    const defogTimer = setTimeout(() => {
      setPhase('defog');
    }, 3500);

    return () => {
      clearTimeout(foggedTimer);
      clearTimeout(defogTimer);
    };
  }, [isActive]);

  // --- Fog opacity builds during condensing ---
  useEffect(() => {
    if (phase !== 'condensing') return;

    const interval = setInterval(() => {
      setFogOpacity(prev => Math.min(1, prev + 0.03));
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  // Set fog to max when fogged
  useEffect(() => {
    if (phase === 'fogged' || phase === 'defog') {
      setFogOpacity(1);
    }
  }, [phase]);

  // --- Fog regrowth & clear percentage calculation loop ---
  useEffect(() => {
    if (phase !== 'defog') return;

    const tick = () => {
      const now = Date.now();

      setClearSpots(prev => {
        // Remove non-permanent spots that have expired (finger wipes fade in 4s without blower, 6s with)
        const lifetime = blowerOnRef.current ? 8000 : 4000;
        const alive = prev.filter(s => s.permanent || (now - s.timestamp < lifetime));

        // Calculate coverage via grid sampling
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const gridSize = 25;
          const cols = Math.ceil(rect.width / gridSize);
          const rows = Math.ceil(rect.height / gridSize);
          let clearCells = 0;
          const totalCells = cols * rows;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cx = ((c + 0.5) * gridSize / rect.width) * 100;
              const cy = ((r + 0.5) * gridSize / rect.height) * 100;
              const isClear = alive.some(s => {
                const dx = cx - s.x;
                const dy = cy - s.y;
                const maxR = (s.radius / rect.width) * 100;
                return Math.sqrt(dx * dx + dy * dy) < maxR;
              });
              if (isClear) clearCells++;
            }
          }

          const pct = Math.round((clearCells / totalCells) * 100);
          setClearPercent(pct);

          if (pct >= REQUIRED_CLEAR_PERCENT) {
            setPhase('completed');
            setDone(true);
            if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
            setTimeout(onCleaned, 600);
            return alive;
          }
        }

        return alive;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, onCleaned]);

  // --- Blower heats up while held ---
  useEffect(() => {
    if (!blowerOn) return;

    const interval = setInterval(() => {
      setBlowerProgress(prev => {
        const next = Math.min(100, prev + 1);
        // Blower adds permanent clear spots from bottom up
        if (next % 5 === 0 && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const clearY = 100 - (next / 100) * 80; // clears from bottom
          for (let x = 10; x <= 90; x += 15) {
            setClearSpots(prev => [...prev, {
              id: spotIdRef.current++,
              x: x + (Math.random() - 0.5) * 10,
              y: clearY + (Math.random() - 0.5) * 8,
              radius: 60 + Math.random() * 30,
              timestamp: Date.now(),
              permanent: true,
            }]);
          }
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [blowerOn]);

  // --- Finger wipe handler ---
  const addClearSpot = useCallback((clientX: number, clientY: number) => {
    if (phase !== 'defog' || done) return;
    const now = Date.now();
    if (now - lastAddRef.current < 40) return;
    lastAddRef.current = now;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    const radius = blowerOn ? 55 : 40; // bigger radius with blower

    setClearSpots(prev => [...prev, {
      id: spotIdRef.current++,
      x, y,
      radius,
      timestamp: now,
      permanent: false,
    }]);

    // Finger trail (last 4 positions)
    setFingerTrail(prev => [...prev.slice(-3), { x: clientX, y: clientY }]);
  }, [phase, done, blowerOn]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    addClearSpot(e.touches[0].clientX, e.touches[0].clientY);
  }, [addClearSpot]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0) addClearSpot(e.clientX, e.clientY);
  }, [addClearSpot]);

  // --- Build fog mask ---
  const buildFogMask = useCallback(() => {
    if (clearSpots.length === 0) return 'none';
    const base = 'radial-gradient(circle 1px at 0% 0%, white 0%, white 100%)';
    const holes = clearSpots.map(s => {
      if (!containerRef.current) return '';
      const rect = containerRef.current.getBoundingClientRect();
      const rPx = s.radius;
      const rPct = (rPx / rect.width) * 100;
      return `radial-gradient(circle ${rPct}vw at ${s.x}% ${s.y}%, transparent 30%, white 100%)`;
    }).filter(Boolean).join(', ');
    return `${base}, ${holes}`;
  }, [clearSpots]);

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
          onTouchStart={e => addClearSpot(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setFingerTrail([])}
          onMouseDown={e => addClearSpot(e.clientX, e.clientY)}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setFingerTrail([])}
        >
          {/* === FOG LAYER with mask holes === */}
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              background: `rgba(180,190,200,${fogOpacity * 0.75})`,
              backdropFilter: `blur(${fogOpacity * 14}px)`,
              WebkitBackdropFilter: `blur(${fogOpacity * 14}px)`,
              ...(clearSpots.length > 0 ? {
                WebkitMaskImage: buildFogMask(),
                maskImage: buildFogMask(),
                WebkitMaskComposite: 'intersect',
                maskComposite: 'intersect',
              } : {}),
            }}
          />

          {/* === CONDENSATION TEXTURE === */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: fogOpacity * 0.4,
              backgroundImage: `
                radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.8) 50%, transparent 100%),
                radial-gradient(1.5px 1.5px at 45% 35%, rgba(255,255,255,0.6) 50%, transparent 100%),
                radial-gradient(1px 1px at 70% 55%, rgba(255,255,255,0.7) 50%, transparent 100%),
                radial-gradient(2px 2px at 30% 70%, rgba(255,255,255,0.5) 50%, transparent 100%),
                radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.6) 50%, transparent 100%)
              `,
              backgroundSize: '15px 15px, 22px 20px, 18px 22px, 25px 18px, 20px 25px',
              ...(clearSpots.length > 0 ? {
                WebkitMaskImage: buildFogMask(),
                maskImage: buildFogMask(),
                WebkitMaskComposite: 'intersect',
                maskComposite: 'intersect',
              } : {}),
            }}
          />

          {/* === WATER DROPLETS running down === */}
          {waterDroplets.map(drop => (
            <motion.div
              key={drop.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${drop.x}%`,
                width: drop.size,
                height: drop.size * 1.5,
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(200,210,220,0.3))',
                opacity: fogOpacity * 0.6,
              }}
              initial={{ top: `${drop.startY}%` }}
              animate={{ top: `${drop.startY + 40}%` }}
              transition={{
                duration: 4 / drop.speed,
                delay: drop.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {/* Trail */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2"
                style={{
                  width: Math.max(1, drop.size * 0.3),
                  height: drop.size * 5,
                  background: `linear-gradient(180deg, transparent, rgba(255,255,255,${0.15 * fogOpacity}))`,
                }}
              />
            </motion.div>
          ))}

          {/* === FINGER TRAIL GLOW === */}
          {phase === 'defog' && fingerTrail.map((pos, i) => (
            <motion.div
              key={`trail-${i}`}
              className="absolute pointer-events-none rounded-full"
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.6 }}
              style={{
                left: pos.x,
                top: pos.y,
                width: 60,
                height: 60,
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                position: 'fixed',
              }}
            />
          ))}

          {/* === BLOWER HEAT EFFECT === */}
          {blowerOn && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 + blowerProgress * 0.002 }}
              style={{
                background: `linear-gradient(0deg,
                  rgba(255,200,100,${0.05 + blowerProgress * 0.001}) 0%,
                  transparent ${30 + blowerProgress * 0.5}%
                )`,
              }}
            />
          )}

          {/* === UI OVERLAY === */}
          {/* Condensing phase */}
          {phase === 'condensing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-5xl mb-3"
                >
                  🌫️
                </motion.div>
                <div className="text-white/80 font-bold text-lg drop-shadow-lg">
                  Стекло запотевает...
                </div>
                <motion.div
                  className="mt-2 text-white/40 text-sm"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Температура: {Math.round(8 - fogOpacity * 12)}°C
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Fogged phase */}
          {phase === 'fogged' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center">
                <div className="text-5xl mb-3">😶‍🌫️</div>
                <div className="text-white font-black text-2xl drop-shadow-lg">
                  НЕ ВИДНО!
                </div>
              </div>
            </motion.div>
          )}

          {/* Defog phase — main gameplay */}
          {phase === 'defog' && (
            <>
              {/* Hint */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                  <span>🌫️</span>
                  Протри стекло + включи обдув! ({clearPercent}%)
                </div>
              </motion.div>

              {/* Regrowth warning */}
              {!blowerOn && clearPercent > 10 && clearPercent < REQUIRED_CLEAR_PERCENT && (
                <motion.div
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="bg-red-500/20 backdrop-blur-sm rounded-full px-3 py-1 text-red-300 text-xs font-bold">
                    ❄️ Стекло запотевает обратно! Включи обдув ↓
                  </div>
                </motion.div>
              )}

              {/* Blower button */}
              <div className="absolute bottom-6 right-6 z-20">
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onTouchStart={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBlowerOn(prev => !prev);
                    if (navigator.vibrate) navigator.vibrate(25);
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    setBlowerOn(prev => !prev);
                    if (navigator.vibrate) navigator.vibrate(25);
                  }}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    border-2 transition-all relative overflow-hidden
                    ${blowerOn
                      ? 'bg-orange-500/30 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                      : 'bg-white/10 border-white/20'
                    }
                  `}
                >
                  {/* Blower progress ring */}
                  {blowerOn && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <circle cx="50" cy="50" r="44" fill="none"
                        stroke="#f97316" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${blowerProgress * 2.76} 276`}
                        className="transition-all duration-100"
                      />
                    </svg>
                  )}
                  <span className="text-2xl z-10">{blowerOn ? '🔥' : '💨'}</span>
                </motion.button>
                <p className="text-center text-white/40 text-xs mt-1 font-bold">
                  {blowerOn ? 'ОБДУВ ВКЛ' : 'ОБДУВ'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-[calc(50%+20px)] z-20 w-40">
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: clearPercent > 60
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                    }}
                    animate={{ width: `${clearPercent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="text-center text-white/50 text-xs mt-1 font-mono">
                  {clearPercent}% / {REQUIRED_CLEAR_PERCENT}%
                </div>
              </div>
            </>
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
                <div className="text-5xl mb-2">🪟</div>
                <div className="text-white font-black text-xl drop-shadow-lg">
                  СТЕКЛО ЧИСТОЕ!
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* === PHASE PROGRESS === */}
          {phase === 'defog' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="w-4 h-0.5 bg-white/10" />
                <div className={`w-2 h-2 rounded-full ${clearPercent > 40 ? 'bg-green-400' : 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.6)]'}`} />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
