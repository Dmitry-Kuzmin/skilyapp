import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface RainStormAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type RainPhase = 'drizzle' | 'storm' | 'wipers' | 'completed';

const NETWORK_LATENCY_BUFFER_MS = 5000;
const REQUIRED_SWIPES = 10;

// Raindrop on windshield
interface WindshieldDrop {
  id: number;
  x: number; // %
  y: number; // %
  size: number;
  streakLength: number;
  opacity: number;
  delay: number;
}

export const RainStormAttack: React.FC<RainStormAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<RainPhase>('drizzle');
  const [done, setDone] = useState(false);
  const [rainIntensity, setRainIntensity] = useState(0.3); // 0-1
  const [swipeCount, setSwipeCount] = useState(0);
  const [wiperAngle, setWiperAngle] = useState(0);
  const [lightningFlash, setLightningFlash] = useState(false);
  const [thunderShake, setThunderShake] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [windshieldDrops, setWindshieldDrops] = useState<WindshieldDrop[]>([]);
  const [wiperClearArc, setWiperClearArc] = useState(0); // percentage of arc cleared

  const lastXRef = useRef(0);
  const lastDirRef = useRef<'left' | 'right' | null>(null);
  const phaseRef = useRef<RainPhase>('drizzle');
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropIdRef = useRef(0);

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
      setPhase('drizzle');
      setDone(false);
      setRainIntensity(0.3);
      setSwipeCount(0);
      setWindshieldDrops([]);
      setHeadlightsOn(false);
      return;
    }

    // Drizzle for 2s, then storm
    const stormTimer = setTimeout(() => {
      setPhase('storm');
      setRainIntensity(0.8);
      if (navigator.vibrate) navigator.vibrate([30, 20, 50]);
    }, 2000);

    // Storm for 2.5s, then wipers available
    const wiperTimer = setTimeout(() => {
      setPhase('wipers');
      setRainIntensity(1);
    }, 4500);

    return () => {
      clearTimeout(stormTimer);
      clearTimeout(wiperTimer);
    };
  }, [isActive]);

  // --- Rain intensity builds gradually ---
  useEffect(() => {
    if (phase === 'drizzle') {
      const interval = setInterval(() => {
        setRainIntensity(prev => Math.min(0.5, prev + 0.02));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // --- Generate windshield drops continuously ---
  useEffect(() => {
    if (!isActive || phase === 'completed') return;

    const addDrops = () => {
      const count = phase === 'drizzle' ? 2 : phase === 'storm' ? 5 : 3;
      const newDrops: WindshieldDrop[] = [];
      for (let i = 0; i < count; i++) {
        newDrops.push({
          id: dropIdRef.current++,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 2 + Math.random() * 6,
          streakLength: phase === 'storm' ? 15 + Math.random() * 25 : 5 + Math.random() * 10,
          opacity: 0.4 + Math.random() * 0.4,
          delay: Math.random() * 0.3,
        });
      }
      setWindshieldDrops(prev => {
        const combined = [...prev, ...newDrops];
        return combined.slice(-80); // keep max 80 drops
      });
    };

    const interval = setInterval(addDrops, phase === 'storm' ? 200 : 400);
    addDrops(); // immediate first batch

    return () => clearInterval(interval);
  }, [isActive, phase]);

  // --- Lightning flashes ---
  useEffect(() => {
    if (phase !== 'storm' && phase !== 'wipers') return;

    const triggerLightning = () => {
      setLightningFlash(true);
      setTimeout(() => setLightningFlash(false), 100);
      setTimeout(() => {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 50);
      }, 150);
      // Thunder shake after delay
      setTimeout(() => {
        setThunderShake(true);
        if (navigator.vibrate) navigator.vibrate([60, 30, 40]);
        setTimeout(() => setThunderShake(false), 300);
      }, 300 + Math.random() * 500);
    };

    const interval = setInterval(triggerLightning, 3000 + Math.random() * 4000);
    // First lightning sooner
    const firstTimeout = setTimeout(triggerLightning, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, [phase]);

  // --- Swipe handlers (wipers phase) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (phase !== 'wipers' || done) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - lastXRef.current;

    if (Math.abs(delta) < 35) return;

    const dir: 'left' | 'right' = delta > 0 ? 'right' : 'left';

    // Must alternate
    if (lastDirRef.current && dir === lastDirRef.current) {
      lastXRef.current = currentX;
      return;
    }

    lastDirRef.current = dir;
    lastXRef.current = currentX;
    if (navigator.vibrate) navigator.vibrate(15);

    // Animate wiper
    setWiperAngle(dir === 'right' ? 55 : -55);

    // Clear some drops on wiper pass
    setWindshieldDrops(prev => {
      const cleared = prev.filter(() => Math.random() > 0.4);
      return cleared;
    });

    setSwipeCount(prev => {
      const next = prev + 1;
      setWiperClearArc(Math.min(100, (next / REQUIRED_SWIPES) * 100));

      if (next >= REQUIRED_SWIPES) {
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

  // --- Headlights toggle ---
  const toggleHeadlights = useCallback(() => {
    if (phase !== 'wipers') return;
    setHeadlightsOn(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(20);
  }, [phase]);

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            x: thunderShake ? [0, -4, 4, -3, 3, 0] : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* === DARK SKY BACKGROUND === */}
          <div className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                rgba(20,20,35,${0.6 + rainIntensity * 0.3}) 0%,
                rgba(30,35,50,${0.5 + rainIntensity * 0.3}) 40%,
                rgba(40,45,60,${0.4 + rainIntensity * 0.3}) 100%
              )`,
            }}
          />

          {/* === WINDSHIELD GLASS EFFECT === */}
          <div className="absolute inset-0"
            style={{
              backdropFilter: `blur(${rainIntensity * 4}px)`,
              WebkitBackdropFilter: `blur(${rainIntensity * 4}px)`,
            }}
          />

          {/* === RAINDROPS ON WINDSHIELD === */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {windshieldDrops.map(drop => (
              <motion.div
                key={drop.id}
                className="absolute rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: drop.opacity,
                  scale: 1,
                  y: drop.streakLength,
                }}
                transition={{ duration: 0.6, delay: drop.delay }}
                style={{
                  left: `${drop.x}%`,
                  top: `${drop.y}%`,
                  width: drop.size,
                  height: drop.size,
                }}
              >
                {/* Drop body */}
                <div className="w-full h-full rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(200,220,255,0.8), rgba(150,180,220,0.4))',
                    boxShadow: '0 0 2px rgba(200,220,255,0.3)',
                  }}
                />
                {/* Streak */}
                <div className="absolute top-full left-1/2 -translate-x-1/2"
                  style={{
                    width: Math.max(1, drop.size * 0.4),
                    height: drop.streakLength,
                    background: `linear-gradient(180deg, rgba(200,220,255,${drop.opacity * 0.5}), transparent)`,
                    borderRadius: '0 0 2px 2px',
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* === FALLING RAIN (atmospheric) === */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: Math.floor(20 + rainIntensity * 40) }).map((_, i) => (
              <div
                key={`rain-${i}`}
                className="absolute"
                style={{
                  width: '1px',
                  height: `${8 + rainIntensity * 15}px`,
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  background: `linear-gradient(180deg, transparent, rgba(180,200,230,${0.2 + rainIntensity * 0.3}))`,
                  animation: `rainFall ${0.3 + Math.random() * 0.4}s linear ${Math.random() * 0.5}s infinite`,
                  transform: `rotate(${-5 + Math.random() * 10}deg)`,
                }}
              />
            ))}
          </div>

          {/* === LIGHTNING FLASH === */}
          {lightningFlash && (
            <div className="absolute inset-0 bg-white/60 pointer-events-none z-30"
              style={{ mixBlendMode: 'overlay' }}
            />
          )}

          {/* === WIPER === */}
          {phase === 'wipers' && (
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 pointer-events-none z-10">
              {/* Wiper pivot */}
              <div className="relative">
                {/* Wiper arm */}
                <motion.div
                  animate={{ rotate: wiperAngle }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="origin-bottom"
                  style={{ transformOrigin: 'bottom center' }}
                >
                  {/* Arm */}
                  <div className="w-1.5 h-52 bg-gray-700 rounded-t-full mx-auto relative">
                    {/* Rubber blade */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gray-800 rounded-full shadow-md">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/30 to-transparent" />
                    </div>
                    {/* Arm joints */}
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-600 rounded-full" />
                    <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-600 rounded-full" />
                  </div>
                </motion.div>
                {/* Pivot point */}
                <div className="w-4 h-4 bg-gray-800 rounded-full mx-auto -mt-2 border border-gray-600" />
              </div>
            </div>
          )}

          {/* === HEADLIGHTS BUTTON (wipers phase) === */}
          {phase === 'wipers' && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); toggleHeadlights(); }}
              onClick={e => { e.stopPropagation(); toggleHeadlights(); }}
              className={`
                absolute bottom-6 right-6 z-20 w-14 h-14 rounded-full
                flex items-center justify-center border-2 transition-all
                ${headlightsOn
                  ? 'bg-yellow-500/30 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  : 'bg-white/10 border-white/20'
                }
              `}
            >
              <span className="text-2xl">{headlightsOn ? '💡' : '🔦'}</span>
            </motion.button>
          )}

          {/* Headlights glow effect */}
          {headlightsOn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              className="absolute inset-0 pointer-events-none z-5"
              style={{
                background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(255,255,200,0.4), transparent)',
              }}
            />
          )}

          {/* === UI OVERLAY === */}
          {/* Drizzle phase */}
          {phase === 'drizzle' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold">
                🌦️ Начинается дождь...
              </div>
            </motion.div>
          )}

          {/* Storm phase */}
          {phase === 'storm' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -5, 0], scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-5xl mb-3"
                >
                  ⛈️
                </motion.div>
                <div className="text-white font-black text-2xl drop-shadow-lg">
                  ЛИВЕНЬ!
                </div>
                <div className="text-blue-200/60 text-sm mt-1">
                  Видимость критическая...
                </div>
              </div>
            </motion.div>
          )}

          {/* Wipers phase */}
          {phase === 'wipers' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5 text-white text-sm font-bold flex items-center gap-2">
                  <span>🌧️</span>
                  Дворники! Свайпь ← → ({swipeCount}/{REQUIRED_SWIPES})
                </div>
              </motion.div>

              {/* Progress bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-48">
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    animate={{ width: `${wiperClearArc}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="text-center text-white/50 text-xs mt-1 font-mono">
                  {swipeCount < REQUIRED_SWIPES
                    ? `Чередуй ← →`
                    : '✅ Чисто!'
                  }
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
                <div className="text-5xl mb-2">🌤️</div>
                <div className="text-white font-black text-xl drop-shadow-lg">
                  ВИДИМОСТЬ ВОССТАНОВЛЕНА
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Rain keyframes */}
          <style>{`
            @keyframes rainFall {
              0% { transform: translateY(-20px); opacity: 0.8; }
              100% { transform: translateY(110vh); opacity: 0.1; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
