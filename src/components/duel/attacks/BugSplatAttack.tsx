import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface BugSplatAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type BugPhase = 'incoming' | 'splattered' | 'washing' | 'wiping' | 'completed';

const NETWORK_LATENCY_BUFFER_MS = 5000;
const REQUIRED_WIPES = 6;

// Bug that flies toward screen
interface FlyingBug {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
  size: number;
}

// Splat on windshield
interface BugSplat {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  spread: number;
  washed: boolean;
  wiped: boolean;
}

const SPLAT_COLORS = [
  'rgba(120,180,50,0.7)',  // green guts
  'rgba(140,160,40,0.6)',  // olive guts
  'rgba(160,140,30,0.65)', // yellow-green
  'rgba(100,150,60,0.7)',  // dark green
  'rgba(180,170,50,0.6)',  // yellowish
];

export const BugSplatAttack: React.FC<BugSplatAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<BugPhase>('incoming');
  const [done, setDone] = useState(false);
  const [flyingBugs, setFlyingBugs] = useState<FlyingBug[]>([]);
  const [splats, setSplats] = useState<BugSplat[]>([]);
  const [washProgress, setWashProgress] = useState(0);
  const [isHoldingWash, setIsHoldingWash] = useState(false);
  const [washFluid, setWashFluid] = useState(false); // fluid spraying animation
  const [wipeCount, setWipeCount] = useState(0);
  const [wiperAngle, setWiperAngle] = useState(0);

  const phaseRef = useRef<BugPhase>('incoming');
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const washIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const splatIdRef = useRef(0);
  const bugIdRef = useRef(0);
  const lastXRef = useRef(0);
  const lastDirRef = useRef<'left' | 'right' | null>(null);

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
      setPhase('incoming');
      setDone(false);
      setFlyingBugs([]);
      setSplats([]);
      setWashProgress(0);
      setWipeCount(0);
      return;
    }

    // Generate flying bugs
    const bugs: FlyingBug[] = [];
    for (let i = 0; i < 8; i++) {
      bugs.push({
        id: bugIdRef.current++,
        startX: 20 + Math.random() * 60,
        startY: Math.random() * 100,
        endX: 15 + Math.random() * 70,
        endY: 15 + Math.random() * 70,
        duration: 0.3 + Math.random() * 0.4,
        delay: i * 0.15 + Math.random() * 0.1,
        size: 8 + Math.random() * 12,
      });
    }
    setFlyingBugs(bugs);

    // After bugs arrive, transition to splattered
    const splatTimer = setTimeout(() => {
      // Generate splats at bug landing positions
      const newSplats: BugSplat[] = bugs.map((bug, i) => ({
        id: splatIdRef.current++,
        x: bug.endX,
        y: bug.endY,
        size: 30 + Math.random() * 40,
        rotation: Math.random() * 360,
        color: SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)],
        spread: 1 + Math.random() * 0.5,
        washed: false,
        wiped: false,
      }));
      setSplats(newSplats);
      setPhase('splattered');
      if (navigator.vibrate) navigator.vibrate([40, 20, 40, 20, 60]);
    }, 1800);

    return () => clearTimeout(splatTimer);
  }, [isActive]);

  // --- Wash button (hold to spray washer fluid) ---
  const startWash = useCallback(() => {
    if (phase !== 'splattered' || done) return;
    setIsHoldingWash(true);
    setWashFluid(true);
    if (navigator.vibrate) navigator.vibrate(20);

    washIntervalRef.current = setInterval(() => {
      setWashProgress(prev => {
        const next = prev + 3; // 3% every 60ms ≈ 2 seconds
        if (next >= 100) {
          clearInterval(washIntervalRef.current!);
          washIntervalRef.current = null;
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

          // Mark all splats as washed (softened)
          setSplats(prev => prev.map(s => ({ ...s, washed: true })));

          // Transition to wiping phase
          setTimeout(() => {
            setPhase('wiping');
            setWashFluid(false);
          }, 500);
        }
        return Math.min(next, 100);
      });
    }, 60);
  }, [phase, done]);

  const stopWash = useCallback(() => {
    setIsHoldingWash(false);
    if (washIntervalRef.current) {
      clearInterval(washIntervalRef.current);
      washIntervalRef.current = null;
    }
    // Slight decay
    if (phase === 'splattered') {
      setWashProgress(prev => Math.max(0, prev - 10));
      setTimeout(() => setWashFluid(false), 200);
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      if (washIntervalRef.current) clearInterval(washIntervalRef.current);
    };
  }, []);

  // --- Wiper swipes (wiping phase) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (phase === 'wiping') {
      lastXRef.current = e.touches[0].clientX;
    }
  }, [phase]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (phase !== 'wiping' || done) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - lastXRef.current;

    if (Math.abs(delta) < 35) return;

    const dir: 'left' | 'right' = delta > 0 ? 'right' : 'left';

    if (lastDirRef.current && dir === lastDirRef.current) {
      lastXRef.current = currentX;
      return;
    }

    lastDirRef.current = dir;
    lastXRef.current = currentX;
    if (navigator.vibrate) navigator.vibrate(15);

    setWiperAngle(dir === 'right' ? 50 : -50);

    // Remove some splats per wipe
    setSplats(prev => {
      const updated = [...prev];
      let removed = 0;
      for (let i = 0; i < updated.length && removed < 2; i++) {
        if (!updated[i].wiped && updated[i].washed) {
          updated[i] = { ...updated[i], wiped: true };
          removed++;
        }
      }
      return updated;
    });

    setWipeCount(prev => {
      const next = prev + 1;
      if (next >= REQUIRED_WIPES) {
        // Mark all remaining as wiped
        setSplats(prev => prev.map(s => ({ ...s, wiped: true })));
        setTimeout(() => {
          setPhase('completed');
          setDone(true);
          if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
          setTimeout(onCleaned, 600);
        }, 300);
      }
      return next;
    });
  }, [phase, done, onCleaned]);

  const activeSplats = splats.filter(s => !s.wiped);

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
          {/* Semi-transparent overlay (dusk/evening driving) */}
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(40,30,20,0.2) 0%, rgba(50,40,25,0.15) 100%)',
            }}
          />

          {/* === FLYING BUGS (incoming phase) === */}
          {phase === 'incoming' && flyingBugs.map(bug => (
            <motion.div
              key={bug.id}
              className="absolute pointer-events-none z-10"
              initial={{
                left: `${bug.startX}%`,
                top: `${bug.startY}%`,
                scale: 0.2,
                opacity: 0.3,
              }}
              animate={{
                left: `${bug.endX}%`,
                top: `${bug.endY}%`,
                scale: [0.2, 0.5, 1.5, 0],
                opacity: [0.3, 0.8, 1, 0],
              }}
              transition={{
                duration: bug.duration,
                delay: bug.delay,
                ease: 'easeIn',
              }}
            >
              <div style={{ fontSize: bug.size, transform: `rotate(${Math.random() * 360}deg)` }}>
                🪰
              </div>
            </motion.div>
          ))}

          {/* === BUG SPLATS === */}
          {splats.map(splat => !splat.wiped && (
            <motion.div
              key={splat.id}
              className="absolute pointer-events-none z-10"
              style={{
                left: `${splat.x}%`,
                top: `${splat.y}%`,
                transform: `translate(-50%, -50%) rotate(${splat.rotation}deg)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: splat.spread,
                opacity: splat.washed ? 0.4 : 0.9,
              }}
              transition={{ type: 'spring', damping: 6, stiffness: 200 }}
            >
              {/* Main splat body */}
              <div className="relative" style={{ width: splat.size, height: splat.size }}>
                {/* Central splat */}
                <div className="absolute inset-[15%] rounded-full"
                  style={{
                    background: splat.color,
                    filter: splat.washed ? 'blur(3px)' : 'blur(1px)',
                  }}
                />
                {/* Splatter arms */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 origin-left"
                    style={{
                      transform: `rotate(${angle + splat.rotation * 0.5}deg)`,
                      width: splat.size * (0.3 + Math.random() * 0.3),
                      height: 2 + Math.random() * 3,
                      background: splat.color,
                      borderRadius: '0 4px 4px 0',
                      filter: splat.washed ? 'blur(2px)' : 'blur(0.5px)',
                      opacity: 0.6 + Math.random() * 0.3,
                    }}
                  />
                ))}
                {/* Bug body remnant */}
                {!splat.washed && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-3 bg-gray-800/60 rounded-full" />
                )}
              </div>
            </motion.div>
          ))}

          {/* === WASH FLUID ANIMATION === */}
          {washFluid && (
            <>
              {/* Fluid streams from nozzles */}
              <motion.div
                className="absolute inset-0 pointer-events-none z-15"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Left nozzle stream */}
                <motion.div
                  className="absolute bottom-[15%] left-[30%]"
                  animate={{ scaleY: [0, 1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                >
                  <div className="w-0.5 h-32 -rotate-12"
                    style={{ background: 'linear-gradient(0deg, rgba(100,180,255,0.4), rgba(100,180,255,0.1), transparent)' }}
                  />
                </motion.div>
                {/* Right nozzle stream */}
                <motion.div
                  className="absolute bottom-[15%] right-[30%]"
                  animate={{ scaleY: [0, 1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 0.3, delay: 0.1 }}
                >
                  <div className="w-0.5 h-32 rotate-12"
                    style={{ background: 'linear-gradient(0deg, rgba(100,180,255,0.4), rgba(100,180,255,0.1), transparent)' }}
                  />
                </motion.div>
              </motion.div>

              {/* Fluid spreading on glass */}
              <motion.div
                className="absolute inset-0 pointer-events-none z-14"
                animate={{ opacity: [0, 0.2, 0.15, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                style={{
                  background: 'linear-gradient(180deg, rgba(100,180,255,0.1) 0%, rgba(100,180,255,0.15) 50%, transparent 100%)',
                }}
              />
            </>
          )}

          {/* === WIPER (wiping phase) === */}
          {phase === 'wiping' && (
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 pointer-events-none z-20">
              <motion.div
                animate={{ rotate: wiperAngle }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="origin-bottom"
              >
                <div className="w-1.5 h-48 bg-gray-700 rounded-t-full mx-auto relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-1.5 bg-gray-800 rounded-full shadow-md" />
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-600 rounded-full" />
                </div>
              </motion.div>
              <div className="w-4 h-4 bg-gray-800 rounded-full mx-auto -mt-2 border border-gray-600" />
            </div>
          )}

          {/* === UI OVERLAY === */}
          {/* Incoming phase */}
          {phase === 'incoming' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                <motion.span animate={{ rotate: [0, 20, -20, 0] }} transition={{ repeat: Infinity, duration: 0.3 }}>
                  🪰
                </motion.span>
                Мошкара!
              </div>
            </motion.div>
          )}

          {/* Splattered phase — wash button */}
          {phase === 'splattered' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold">
                  🪰 Стекло заляпано! Зажми омыватель
                </div>
              </motion.div>

              {/* Wash button */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
                <motion.button
                  onTouchStart={e => { e.preventDefault(); startWash(); }}
                  onTouchEnd={stopWash}
                  onTouchCancel={stopWash}
                  onMouseDown={startWash}
                  onMouseUp={stopWash}
                  onMouseLeave={stopWash}
                  animate={isHoldingWash ? { scale: 0.92 } : { scale: 1 }}
                  className={`
                    relative w-20 h-20 rounded-full border-3
                    flex items-center justify-center transition-all
                    ${isHoldingWash
                      ? 'bg-blue-600/80 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]'
                      : 'bg-slate-800/80 border-slate-600 shadow-lg'
                    }
                  `}
                >
                  {/* Progress ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="#60a5fa" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${washProgress * 2.64} 264`}
                      className="transition-all duration-75"
                    />
                  </svg>
                  <span className="text-2xl z-10">💧</span>
                </motion.button>
                <p className="text-center text-white/50 text-xs mt-2 font-bold uppercase tracking-wider">
                  {isHoldingWash ? 'Промывка...' : 'Зажми'}
                </p>
              </div>

              {/* Decay warning */}
              {!isHoldingWash && washProgress > 10 && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="text-red-400/80 text-xs font-mono">
                    ⚠️ Не отпускай!
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Wiping phase */}
          {phase === 'wiping' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                  <span>🧹</span>
                  Дворники! Свайпь ← → ({wipeCount}/{REQUIRED_WIPES})
                </div>
              </motion.div>

              {/* Progress bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-48">
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                    animate={{ width: `${Math.min(100, (wipeCount / REQUIRED_WIPES) * 100)}%` }}
                    transition={{ duration: 0.2 }}
                  />
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
                <div className="text-5xl mb-2">✨</div>
                <div className="text-white font-black text-xl drop-shadow-lg">
                  СТЕКЛО ЧИСТОЕ!
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* === PHASE PROGRESS === */}
          {phase !== 'incoming' && phase !== 'completed' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                {['splattered', 'wiping'].map((p, i) => (
                  <React.Fragment key={p}>
                    <div className={`
                      w-2 h-2 rounded-full transition-colors
                      ${phase === p ? 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.6)]' :
                        (['splattered', 'wiping'].indexOf(phase) > i) ? 'bg-green-400' : 'bg-white/20'}
                    `} />
                    {i < 1 && <div className="w-6 h-0.5 bg-white/10" />}
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
