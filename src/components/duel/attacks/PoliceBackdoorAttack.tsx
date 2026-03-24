import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { ShieldAlert } from 'lucide-react';

interface PoliceBackdoorProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type PolicePhase = 'siren' | 'scanning' | 'code_entry' | 'verified' | 'completed';

const NETWORK_LATENCY_BUFFER_MS = 5000;

// Generate a random 4-digit code
const generateCode = () => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
};

// Siren bar component
const SirenBar: React.FC<{ intensity: number }> = ({ intensity }) => (
  <div className="absolute top-0 left-0 right-0 h-full pointer-events-none overflow-hidden">
    {/* Red sweep */}
    <motion.div
      className="absolute top-0 left-0 w-1/2 h-full"
      animate={{
        opacity: [0.1, intensity * 0.6, 0.1],
        backgroundColor: ['rgba(239,68,68,0)', `rgba(239,68,68,${intensity * 0.3})`, 'rgba(239,68,68,0)'],
      }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
    />
    {/* Blue sweep */}
    <motion.div
      className="absolute top-0 right-0 w-1/2 h-full"
      animate={{
        opacity: [0.1, intensity * 0.6, 0.1],
        backgroundColor: ['rgba(59,130,246,0)', `rgba(59,130,246,${intensity * 0.3})`, 'rgba(59,130,246,0)'],
      }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut', delay: 0.4 }}
    />
    {/* Top light bar */}
    <div className="absolute top-0 left-0 right-0 h-1.5 flex">
      <motion.div
        className="flex-1 bg-red-500"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ repeat: Infinity, duration: 0.4 }}
      />
      <motion.div
        className="flex-1 bg-blue-500"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 0.4 }}
      />
    </div>
  </div>
);

export const PoliceBackdoorAttack: React.FC<PoliceBackdoorProps> = ({ isActive, onCleaned, expiresAt }) => {
  const [phase, setPhase] = useState<PolicePhase>('siren');
  const [done, setDone] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isHoldingScanner, setIsHoldingScanner] = useState(false);
  const [targetCode, setTargetCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [codeFlash, setCodeFlash] = useState(true); // briefly show code then hide
  const [shakeInput, setShakeInput] = useState(false);
  const [scanRingPulse, setScanRingPulse] = useState(false);

  const phaseRef = useRef<PolicePhase>('siren');
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // --- Auto-expire with network buffer ---
  useEffect(() => {
    if (!isActive || !expiresAt) return;
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0 && remaining > -NETWORK_LATENCY_BUFFER_MS) {
      const bufferTime = NETWORK_LATENCY_BUFFER_MS + remaining;
      expireTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current === 'verified' || phaseRef.current === 'completed') {
          onCleaned();
        }
      }, Math.max(0, bufferTime));
      return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
    }
    if (remaining <= -NETWORK_LATENCY_BUFFER_MS) return;
    if (remaining < 1000) return;

    expireTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'verified' || phaseRef.current === 'completed') {
        onCleaned();
      }
    }, remaining);

    return () => { if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current); };
  }, [isActive, expiresAt, onCleaned]);

  // --- Phase progression: siren (1.5s) → scanning ---
  useEffect(() => {
    if (!isActive) {
      setPhase('siren');
      setDone(false);
      setScanProgress(0);
      setEnteredCode('');
      setIsHoldingScanner(false);
      return;
    }

    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 80]);

    const scanTimer = setTimeout(() => {
      setPhase('scanning');
      setScanRingPulse(true);
    }, 1500);

    return () => clearTimeout(scanTimer);
  }, [isActive]);

  // --- Scanner: hold finger to scan (fingerprint) ---
  const startScan = useCallback(() => {
    if (phase !== 'scanning' || done) return;
    setIsHoldingScanner(true);
    if (navigator.vibrate) navigator.vibrate(15);

    scanIntervalRef.current = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 2; // 2% every 50ms = ~2.5 seconds total
        if (next >= 100) {
          clearInterval(scanIntervalRef.current!);
          scanIntervalRef.current = null;
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

          // Generate code and transition to code entry
          const code = generateCode();
          setTargetCode(code);
          setCodeFlash(true);
          setPhase('code_entry');

          // Flash code for 2 seconds then hide
          setTimeout(() => setCodeFlash(false), 2000);
        }
        return Math.min(next, 100);
      });
    }, 50);
  }, [phase, done]);

  const stopScan = useCallback(() => {
    setIsHoldingScanner(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    // Decay when released
    if (phase === 'scanning') {
      setScanProgress(prev => Math.max(0, prev - 15));
    }
  }, [phase]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // --- Code entry: numpad ---
  const handleDigit = useCallback((digit: string) => {
    if (phase !== 'code_entry' || done) return;
    if (navigator.vibrate) navigator.vibrate(10);

    setEnteredCode(prev => {
      const next = prev + digit;
      if (next.length >= 4) {
        // Check code
        if (next === targetCode) {
          // Success!
          if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
          setPhase('verified');
          setTimeout(() => {
            setDone(true);
            setTimeout(onCleaned, 500);
          }, 800);
        } else {
          // Wrong code — shake and reset
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setShakeInput(true);
          setTimeout(() => {
            setShakeInput(false);
            setEnteredCode('');
            // Re-flash the code briefly
            setCodeFlash(true);
            setTimeout(() => setCodeFlash(false), 1500);
          }, 500);
        }
        return next;
      }
      return next;
    });
  }, [phase, done, targetCode, onCleaned]);

  const handleBackspace = useCallback(() => {
    if (phase !== 'code_entry') return;
    setEnteredCode(prev => prev.slice(0, -1));
    if (navigator.vibrate) navigator.vibrate(8);
  }, [phase]);

  // Fingerprint SVG scan lines
  const scanLineY = (scanProgress / 100) * 80 + 10; // 10% to 90%

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] select-none overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {/* Dark background */}
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />

          {/* Siren effect */}
          <SirenBar intensity={phase === 'siren' ? 1 : 0.4} />

          {/* === PHASE: SIREN — dramatic entrance === */}
          {phase === 'siren' && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  filter: [
                    'drop-shadow(0 0 20px rgba(239,68,68,0.8))',
                    'drop-shadow(0 0 40px rgba(59,130,246,0.8))',
                    'drop-shadow(0 0 20px rgba(239,68,68,0.8))',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                <ShieldAlert className="w-28 h-28 text-red-500" />
              </motion.div>

              <motion.h2
                className="text-4xl font-black text-white uppercase tracking-[0.3em]"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
              >
                ПОЛИЦИЯ
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-red-300/80 text-center text-sm font-mono px-8"
              >
                ОБНАРУЖЕНА ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ
                <br />
                ПОДГОТОВЬТЕ ДОКУМЕНТЫ К ПРОВЕРКЕ
              </motion.p>

              {/* Scan line sweep */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              />
            </motion.div>
          )}

          {/* === PHASE: SCANNING — fingerprint scanner === */}
          {phase === 'scanning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6"
            >
              {/* Header */}
              <div className="text-center">
                <p className="text-blue-300/80 text-xs font-mono uppercase tracking-widest mb-1">
                  Биометрическая верификация
                </p>
                <h3 className="text-white text-xl font-bold">
                  Приложите палец к сканеру
                </h3>
              </div>

              {/* Fingerprint scanner */}
              <motion.div
                className="relative w-40 h-40"
                onTouchStart={e => { e.preventDefault(); startScan(); }}
                onTouchEnd={stopScan}
                onTouchCancel={stopScan}
                onMouseDown={startScan}
                onMouseUp={stopScan}
                onMouseLeave={stopScan}
              >
                {/* Outer ring */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
                  {/* Background ring */}
                  <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  {/* Progress ring */}
                  <circle
                    cx="80" cy="80" r="72" fill="none"
                    stroke={scanProgress > 70 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${scanProgress * 4.52} 452`}
                    className="transition-all duration-100"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>

                {/* Fingerprint area */}
                <div className={`
                  absolute inset-4 rounded-full overflow-hidden
                  border-2 transition-colors duration-200
                  ${isHoldingScanner
                    ? 'border-blue-400 bg-blue-950/80 shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                    : 'border-white/20 bg-slate-900/80'
                  }
                `}>
                  {/* Fingerprint pattern */}
                  <svg viewBox="0 0 100 100" className="w-full h-full p-4 opacity-40">
                    <path d="M50,15 Q30,15 25,30 Q20,50 25,65 Q30,80 50,85 Q70,80 75,65 Q80,50 75,30 Q70,15 50,15" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-300" />
                    <path d="M50,22 Q35,22 31,33 Q27,48 31,60 Q35,72 50,76 Q65,72 69,60 Q73,48 69,33 Q65,22 50,22" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-300" />
                    <path d="M50,29 Q40,29 37,37 Q34,48 37,56 Q40,65 50,68 Q60,65 63,56 Q66,48 63,37 Q60,29 50,29" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-300" />
                    <path d="M50,36 Q44,36 42,42 Q40,50 42,55 Q44,60 50,62 Q56,60 58,55 Q60,50 58,42 Q56,36 50,36" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-300" />
                  </svg>

                  {/* Scan line */}
                  {isHoldingScanner && (
                    <motion.div
                      className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                      style={{ top: `${scanLineY}%` }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    />
                  )}
                </div>

                {/* Pulsing ring when waiting */}
                {!isHoldingScanner && scanRingPulse && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400/30"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>

              {/* Progress text */}
              <div className="text-center">
                <div className="text-white font-mono text-lg font-bold">
                  {scanProgress}%
                </div>
                <div className="text-white/40 text-xs font-mono mt-1">
                  {isHoldingScanner ? 'Сканирование...' : 'Удерживай палец на сканере'}
                </div>
              </div>

              {/* Decay warning */}
              {!isHoldingScanner && scanProgress > 10 && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-red-400/80 text-xs font-mono"
                >
                  ⚠️ Прогресс теряется! Не отпускай!
                </motion.div>
              )}
            </motion.div>
          )}

          {/* === PHASE: CODE ENTRY — numpad === */}
          {phase === 'code_entry' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
            >
              {/* Code display */}
              <div className="text-center mb-2">
                <p className="text-blue-300/60 text-xs font-mono uppercase tracking-widest mb-3">
                  Введите код доступа
                </p>

                {/* Target code (flashes then hides) */}
                <AnimatePresence>
                  {codeFlash && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
                      className="mb-4"
                    >
                      <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-6 py-3">
                        <span className="text-green-400 font-mono text-3xl font-black tracking-[0.5em]">
                          {targetCode}
                        </span>
                      </div>
                      <p className="text-green-400/60 text-xs mt-1 font-mono">
                        Запомните код!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!codeFlash && (
                  <div className="mb-4">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-6 py-2">
                      <p className="text-red-300/60 text-xs font-mono">
                        Код скрыт — введите по памяти
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Entered code display */}
              <motion.div
                className="flex gap-3 mb-4"
                animate={shakeInput ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`
                      w-14 h-16 rounded-xl border-2 flex items-center justify-center
                      font-mono text-2xl font-bold transition-all duration-200
                      ${enteredCode[i]
                        ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : i === enteredCode.length
                          ? 'border-white/40 bg-white/5 text-white/20 animate-pulse'
                          : 'border-white/15 bg-white/5 text-white/20'
                      }
                    `}
                  >
                    {enteredCode[i] || (i === enteredCode.length ? '▌' : '')}
                  </div>
                ))}
              </motion.div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 w-64">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✓'].map(key => (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.9 }}
                    onTouchStart={e => {
                      e.preventDefault();
                      if (key === '←') handleBackspace();
                      else if (key === '✓') { /* submit handled by length check */ }
                      else handleDigit(key);
                    }}
                    onClick={() => {
                      if (key === '←') handleBackspace();
                      else if (key === '✓') { /* submit handled by length check */ }
                      else handleDigit(key);
                    }}
                    className={`
                      h-14 rounded-xl font-mono text-xl font-bold
                      transition-colors active:scale-95
                      ${key === '←'
                        ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                        : key === '✓'
                          ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                          : 'bg-white/10 border border-white/15 text-white hover:bg-white/20'
                      }
                    `}
                  >
                    {key}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* === PHASE: VERIFIED === */}
          {phase === 'verified' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            >
              {/* Stamp effect */}
              <motion.div
                initial={{ scale: 3, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 8, stiffness: 200 }}
                className="w-40 h-40 rounded-full border-4 border-green-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 40px rgba(34,197,94,0.4)' }}
              >
                <div className="text-center">
                  <div className="text-5xl mb-1">✅</div>
                  <div className="text-green-400 font-black text-sm uppercase tracking-widest">
                    Верифицирован
                  </div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-green-300/60 text-sm font-mono"
              >
                Проверка пройдена. Продолжайте движение.
              </motion.p>
            </motion.div>
          )}

          {/* === Phase indicator === */}
          {phase !== 'siren' && phase !== 'verified' && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2">
                {['scanning', 'code_entry'].map((p, i) => (
                  <div key={p} className="flex items-center gap-2">
                    <div className={`
                      w-2.5 h-2.5 rounded-full transition-colors
                      ${phase === p ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                        (p === 'scanning' && phase === 'code_entry') ? 'bg-green-500' : 'bg-white/20'}
                    `} />
                    {i < 1 && <div className="w-8 h-0.5 bg-white/10" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
