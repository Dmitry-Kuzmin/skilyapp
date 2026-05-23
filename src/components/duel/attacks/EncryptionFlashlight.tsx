import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Lock, Search, Delete, ShieldCheck, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EncryptionFlashlightProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type Phase = 'intro' | 'searching' | 'memorize' | 'entering' | 'denied' | 'success';

const MEMORIZE_DURATION_MS = 2000;
const FLASH_REVEAL_MS = 1000;

interface DigitSlot {
  slot: 0 | 1 | 2 | 3;
  value: number;
  x: number;
  y: number;
  found: boolean;
}

const CODE_LENGTH = 4;
const REVEAL_RADIUS = 95;
const FLASHLIGHT_RADIUS = 130;
const INTRO_DURATION_MS = 1500;
const TOUCH_Y_OFFSET = 90;

function randomCode(): number[] {
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 10));
}

function placeDigits(width: number, height: number, code: number[]): DigitSlot[] {
  const safeTop = 180;
  const safeBottom = 140;
  const safeSide = 70;
  const usableW = Math.max(120, width - safeSide * 2);
  const usableH = Math.max(120, height - safeTop - safeBottom);

  // 2×2 grid, jitter inside each cell — guarantees the digits spread out
  return code.map((value, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellW = usableW / 2;
    const cellH = usableH / 2;
    const baseX = safeSide + col * cellW;
    const baseY = safeTop + row * cellH;
    const jitterX = (cellW - 80) * (0.2 + Math.random() * 0.6);
    const jitterY = (cellH - 80) * (0.2 + Math.random() * 0.6);
    return {
      slot: i as 0 | 1 | 2 | 3,
      value,
      x: baseX + jitterX,
      y: baseY + jitterY,
      found: false,
    };
  });
}

export const EncryptionFlashlight: React.FC<EncryptionFlashlightProps> = ({
  isActive,
  onCleaned,
  expiresAt,
  exploitId,
}) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [digits, setDigits] = useState<DigitSlot[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: -500, y: -500 });
  const [isTouching, setIsTouching] = useState(false);
  const [entered, setEntered] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const [deniedFlash, setDeniedFlash] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [flashReveal, setFlashReveal] = useState(false);
  const [memorizeLeft, setMemorizeLeft] = useState<number>(MEMORIZE_DURATION_MS);

  const codeRef = useRef<number[]>([]);
  const resolvedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Setup: pick code, place digits ─────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const code = randomCode();
    codeRef.current = code;
    setPhase('intro');
    setEntered([]);
    setDigits(placeDigits(window.innerWidth, window.innerHeight, code));
    resolvedRef.current = false;
  }, [isActive, exploitId]);

  // ── Resize handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const onResize = () => {
      setDigits(prev => {
        if (prev.length === 0) return prev;
        const fresh = placeDigits(window.innerWidth, window.innerHeight, codeRef.current);
        // preserve found state
        return fresh.map((d, i) => ({ ...d, found: prev[i]?.found ?? false }));
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isActive]);

  // ── Intro → searching ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || phase !== 'intro') return;
    const t = setTimeout(() => setPhase('searching'), INTRO_DURATION_MS);
    const shakeI = setInterval(() => setShake(Math.random() * 6), 60);
    return () => {
      clearTimeout(t);
      clearInterval(shakeI);
      setShake(0);
    };
  }, [isActive, phase]);

  // ── Countdown (visual only — never auto-resolves) ──────────────────────────
  useEffect(() => {
    if (!isActive || !expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remain = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remain);
    };
    tick();
    const i = setInterval(tick, 500);
    return () => clearInterval(i);
  }, [isActive, expiresAt]);

  // ── Searching: pointer over digit → reveal ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'searching') return;
    setDigits(prev => {
      let changed = false;
      const next = prev.map(d => {
        if (d.found) return d;
        const dx = pointer.x - d.x;
        const dy = pointer.y - d.y;
        if (dx * dx + dy * dy <= REVEAL_RADIUS * REVEAL_RADIUS) {
          changed = true;
          return { ...d, found: true };
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [pointer, phase]);

  // ── All digits found → memorize phase (show key 2s) → entering ─────────────
  useEffect(() => {
    if (phase !== 'searching') return;
    if (digits.length === CODE_LENGTH && digits.every(d => d.found)) {
      const t = setTimeout(() => {
        setMemorizeLeft(MEMORIZE_DURATION_MS);
        setPhase('memorize');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [digits, phase]);

  // ── Memorize: countdown then hide the key and prompt entry ─────────────────
  useEffect(() => {
    if (phase !== 'memorize') return;
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const remain = Math.max(0, MEMORIZE_DURATION_MS - (Date.now() - startedAt));
      setMemorizeLeft(remain);
      if (remain <= 0) {
        clearInterval(tick);
        setPhase('entering');
      }
    }, 50);
    return () => clearInterval(tick);
  }, [phase]);

  // ── Flash-reveal: brief code peek on wrong answer ──────────────────────────
  useEffect(() => {
    if (!flashReveal) return;
    const t = setTimeout(() => setFlashReveal(false), FLASH_REVEAL_MS);
    return () => clearTimeout(t);
  }, [flashReveal]);

  // ── Keypad ─────────────────────────────────────────────────────────────────
  const onKeyPress = useCallback((n: number) => {
    if (phase !== 'entering') return;
    setEntered(prev => (prev.length >= CODE_LENGTH ? prev : [...prev, n]));
  }, [phase]);

  const onBackspace = useCallback(() => {
    if (phase !== 'entering') return;
    setEntered(prev => prev.slice(0, -1));
  }, [phase]);

  // ── Auto-submit when 4 digits entered ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'entering' || entered.length !== CODE_LENGTH) return;
    const correct = entered.every((d, i) => d === codeRef.current[i]);

    if (correct) {
      setPhase('success');
      if (exploitId) {
        try {
          supabase.rpc('resolve_exploit', { p_exploit_id: exploitId })
            .then(({ error }) => {
              if (error) console.warn('[EncryptionFlashlight] resolve_exploit error:', error);
            });
        } catch (e) {
          console.warn('[EncryptionFlashlight] resolve_exploit exception:', e);
        }
      }
      const t = setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        onCleaned();
      }, 600);
      return () => clearTimeout(t);
    } else {
      // Wrong code → red flash, shake, brief key peek, reset entry — back to entering
      setDeniedFlash(true);
      setFlashReveal(true);
      setPhase('denied');
      const shakeI = setInterval(() => setShake(Math.random() * 14), 40);
      const reset = setTimeout(() => {
        clearInterval(shakeI);
        setShake(0);
        setDeniedFlash(false);
        setEntered([]);
        setPhase('entering');
      }, FLASH_REVEAL_MS);
      return () => {
        clearInterval(shakeI);
        clearTimeout(reset);
      };
    }
  }, [entered, phase, exploitId, onCleaned]);

  // ── Pointer handling ───────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    setPointer({ x: e.clientX, y: e.clientY });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) setPointer({ x: t.clientX, y: t.clientY - TOUCH_Y_OFFSET });
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(true);
    const t = e.touches[0];
    if (t) setPointer({ x: t.clientX, y: t.clientY - TOUCH_Y_OFFSET });
  };
  const handleTouchEnd = () => {
    setIsTouching(false);
    setPointer({ x: -500, y: -500 });
  };

  // Keypad render data — declared before any early return to keep hook order stable
  const keypadRows: (number | 'back')[][] = useMemo(() => [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['back', 0, 'back'],
  ], []);

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!isActive) return null;

  const flashlightVisible = phase === 'searching' || phase === 'intro';
  const keypadVisible = phase === 'entering' || phase === 'denied' || phase === 'success';
  const memorizeVisible = phase === 'memorize';

  // HUD code visibility logic:
  //  • searching      → show only found digits, rest = "_"
  //  • memorize       → show full code (player is memorizing it)
  //  • flashReveal    → briefly re-show full code on wrong answer
  //  • entering/denied/success → hide everything as "•"
  const revealAll = memorizeVisible || flashReveal;
  const hudDigits = digits.map(d => {
    if (revealAll) return String(d.value);
    if (phase === 'searching' || phase === 'intro') return d.found ? String(d.value) : '_';
    return '•';
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden font-mono select-none"
      style={{
        zIndex: 2147483647,
        background: 'radial-gradient(circle at center, #061018 0%, #000000 70%)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: phase === 'searching' ? 'none' : 'default',
        transform: `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`,
      }}
      onMouseMove={phase === 'searching' ? handleMouseMove : undefined}
      onTouchStart={phase === 'searching' ? handleTouchStart : undefined}
      onTouchMove={phase === 'searching' ? handleTouchMove : undefined}
      onTouchEnd={phase === 'searching' ? handleTouchEnd : undefined}
      onTouchCancel={phase === 'searching' ? handleTouchEnd : undefined}
    >
      {/* Scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(transparent 50%, rgba(16,185,129,0.08) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Digits (only visible inside flashlight beam) */}
      {flashlightVisible && digits.map(d => {
        const dx = pointer.x - d.x;
        const dy = pointer.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inBeam = dist <= FLASHLIGHT_RADIUS;
        const closeness = Math.max(0, 1 - dist / FLASHLIGHT_RADIUS);

        return (
          <div
            key={d.slot}
            className="absolute pointer-events-none"
            style={{
              left: d.x,
              top: d.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Faint slot label — always visible at 8% opacity */}
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-emerald-400"
              style={{ bottom: 'calc(100% + 4px)', opacity: 0.18 }}
            >
              {d.slot + 1}
            </div>

            {/* The digit itself — fades in with proximity */}
            <div
              className="flex items-center justify-center"
              style={{
                opacity: inBeam ? closeness : 0,
                transition: 'opacity 0.15s linear',
              }}
            >
              <span
                className="text-6xl font-black text-emerald-300"
                style={{
                  textShadow: `0 0 ${12 + closeness * 18}px rgba(52,211,153,${0.6 + closeness * 0.4}), 0 0 4px rgba(0,0,0,0.9)`,
                  letterSpacing: '0.02em',
                }}
              >
                {d.value}
              </span>
            </div>

            {/* Capture pulse */}
            {d.found && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: '2px solid rgba(52,211,153,0.6)',
                  animation: 'ping 1.2s ease-out 1',
                }}
              />
            )}
          </div>
        );
      })}

      {/* Flashlight beam */}
      {phase === 'searching' && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle ${FLASHLIGHT_RADIUS}px at ${pointer.x}px ${pointer.y}px, rgba(167,243,208,0.18) 0%, rgba(16,185,129,0.06) 50%, transparent 100%)`,
              transition: 'background 0.05s linear',
            }}
          />
          <div
            className="absolute pointer-events-none rounded-full border border-emerald-400/60"
            style={{
              left: pointer.x - FLASHLIGHT_RADIUS,
              top: pointer.y - FLASHLIGHT_RADIUS,
              width: FLASHLIGHT_RADIUS * 2,
              height: FLASHLIGHT_RADIUS * 2,
              boxShadow: 'inset 0 0 30px rgba(16,185,129,0.25)',
            }}
          />
          {/* Cursor crosshair */}
          {!isTouching && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: pointer.x - 8,
                top: pointer.y - 8,
                width: 16,
                height: 16,
              }}
            >
              <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-300" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-emerald-300" />
            </div>
          )}
        </>
      )}

      {/* HUD top — code progress + countdown */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
        style={{
          top: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px) + 12px)',
        }}
      >
        <div className="bg-black/80 backdrop-blur-md border border-emerald-500/40 rounded-xl px-5 py-3 flex flex-col items-center gap-1 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-400/80">
            <Lock className="w-3 h-3" />
            <span>Encryption Key</span>
            {secondsLeft !== null && (
              <span className="text-emerald-300/60 ml-2">{secondsLeft}s</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {hudDigits.map((c, i) => {
              const isHidden = c === '•';
              const isPending = c === '_';
              const isRevealed = !isHidden && !isPending;
              const isFlashing = revealAll && isRevealed;
              return (
                <div
                  key={i}
                  className={`w-10 h-12 flex items-center justify-center rounded-md border text-2xl font-black transition-all duration-150 ${
                    isPending
                      ? 'border-emerald-500/20 text-emerald-500/30 bg-emerald-500/5'
                      : isHidden
                        ? 'border-emerald-500/15 text-emerald-500/20 bg-emerald-500/[0.03]'
                        : isFlashing
                          ? 'border-yellow-300 text-yellow-200 bg-yellow-500/20 shadow-[0_0_20px_rgba(253,224,71,0.7)]'
                          : 'border-emerald-400 text-emerald-300 bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  }`}
                >
                  {c}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INTRO PHASE */}
      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-40">
          <div className="relative bg-zinc-950 border-4 border-emerald-500 px-10 py-8 max-w-md text-center shadow-[0_0_80px_rgba(16,185,129,0.6)]">
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.6) 50%)',
                backgroundSize: '100% 4px',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative">
                <Lock className="w-20 h-20 text-emerald-400 animate-pulse" />
                <AlertTriangle className="w-10 h-10 text-yellow-400 absolute -top-2 -right-3 animate-ping" />
              </div>
              <h1
                className="text-5xl font-black text-white tracking-[0.2em]"
                style={{ textShadow: '3px 3px 0 #047857' }}
              >
                CRYPTOLOCKER
              </h1>
              <p className="text-emerald-300 font-mono text-sm uppercase animate-pulse">
                {'>'} SYSTEM ENCRYPTED<br />
                {'>'} SEARCH FOR 4-DIGIT KEY...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH HINT */}
      {phase === 'searching' && (
        <div className="absolute left-0 right-0 bottom-8 flex justify-center pointer-events-none z-20">
          <div className="flex items-center gap-2 bg-black/70 border border-emerald-500/30 rounded-full px-4 py-2 text-emerald-300/80 text-xs uppercase tracking-widest">
            <Search className="w-3.5 h-3.5" />
            <span>Move flashlight to find digits 1–4</span>
          </div>
        </div>
      )}

      {/* MEMORIZE PHASE — show full code for 2s, then it disappears */}
      {memorizeVisible && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div
            className="bg-zinc-950/95 backdrop-blur-md border-2 border-yellow-400 rounded-2xl px-8 py-7 max-w-sm w-[90%] shadow-[0_0_70px_rgba(253,224,71,0.45)] text-center animate-fade-in"
          >
            <div className="flex items-center justify-center gap-2 mb-3 text-yellow-300/90 text-[11px] uppercase tracking-[0.3em]">
              <Brain className="w-3.5 h-3.5" />
              <span>Memorize the key</span>
            </div>

            {/* The full code — big and obvious */}
            <div className="flex justify-center gap-3 mb-4">
              {codeRef.current.map((d, i) => (
                <div
                  key={i}
                  className="w-14 h-16 flex items-center justify-center rounded-md border-2 border-yellow-300 bg-yellow-500/15 text-yellow-100 text-4xl font-black shadow-[0_0_20px_rgba(253,224,71,0.5)]"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Countdown bar */}
            <div className="h-1.5 w-full rounded-full bg-yellow-500/15 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 shadow-[0_0_8px_rgba(253,224,71,0.6)]"
                style={{
                  width: `${(memorizeLeft / MEMORIZE_DURATION_MS) * 100}%`,
                  transition: 'width 60ms linear',
                }}
              />
            </div>

            <p className="mt-3 text-yellow-300/70 text-[10px] uppercase tracking-widest">
              {'>'} Code self-destructs in {(memorizeLeft / 1000).toFixed(1)}s
            </p>
          </div>
        </div>
      )}

      {/* KEYPAD PHASE */}
      {keypadVisible && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div
            className={`bg-zinc-950/90 backdrop-blur-md border-2 ${
              phase === 'denied' ? 'border-red-500 shadow-[0_0_60px_rgba(220,38,38,0.6)]' : 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.45)]'
            } rounded-2xl px-8 py-7 max-w-sm w-[90%]`}
          >
            <div className="flex items-center justify-center gap-2 mb-4 text-emerald-300/80 text-[11px] uppercase tracking-[0.3em]">
              <Lock className="w-3 h-3" />
              <span>
                {phase === 'denied'
                  ? 'Access denied'
                  : phase === 'success'
                    ? 'Decrypting…'
                    : 'Enter key from memory'}
              </span>
            </div>

            {/* Cells */}
            <div className="flex justify-center gap-3 mb-5">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const v = entered[i];
                const filled = v !== undefined;
                return (
                  <div
                    key={i}
                    className={`w-14 h-16 flex items-center justify-center rounded-md border-2 text-3xl font-black ${
                      phase === 'success'
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : phase === 'denied'
                          ? 'border-red-500 bg-red-500/20 text-red-300'
                          : filled
                            ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                            : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500/40'
                    }`}
                  >
                    {filled ? v : '•'}
                  </div>
                );
              })}
            </div>

            {/* Keypad grid */}
            <div className="grid grid-cols-3 gap-2">
              {keypadRows.flat().map((k, idx) => {
                if (k === 'back') {
                  // Only one back button: left side of last row → middle/right are filler/0
                  if (idx === 9) {
                    return (
                      <button
                        key={`back-${idx}`}
                        onClick={onBackspace}
                        disabled={phase !== 'entering'}
                        className="h-12 rounded-md bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    );
                  }
                  return <div key={`gap-${idx}`} />;
                }
                return (
                  <button
                    key={`k-${k}-${idx}`}
                    onClick={() => onKeyPress(k as number)}
                    disabled={phase !== 'entering' || entered.length >= CODE_LENGTH}
                    className="h-12 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 border border-emerald-500/30 text-emerald-200 text-xl font-black flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {k}
                  </button>
                );
              })}
            </div>

            {phase === 'denied' && (
              <p className="mt-4 text-center text-red-400 text-xs uppercase tracking-widest animate-pulse">
                {'>'} Wrong key — peek above, then retry
              </p>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {phase === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-emerald-600/95 backdrop-blur-md border-4 border-emerald-300 px-10 py-6 rounded-2xl shadow-[0_0_80px_rgba(16,185,129,0.7)] text-center animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <ShieldCheck className="w-14 h-14 text-white animate-bounce" />
              <h2 className="text-2xl font-black text-white tracking-widest">ACCESS GRANTED</h2>
              <p className="text-emerald-100 text-xs uppercase tracking-widest">System decrypted</p>
            </div>
          </div>
        </div>
      )}

      {/* DENIED red flash */}
      {deniedFlash && (
        <div className="absolute inset-0 bg-red-600/25 pointer-events-none z-20 animate-pulse" />
      )}
    </div>
  );
};

export default EncryptionFlashlight;
