import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';

export interface AttackParticleData {
  type: string;
  emoji: string;
  color: string;
  glow: string;
}

interface AttackParticleEffectProps {
  attack: AttackParticleData | null;
  onComplete: () => void;
}

interface Pos { x: number; y: number }

// ─────────────────────────────────────────────────────────────────────────────

const BIG_COUNT = 18;
const SPARK_COUNT = 10;

function genBigParticles(seed: number) {
  // deterministic-ish per attack type so re-renders don't flicker
  const rng = (n: number) => (Math.sin(seed * 127 + n * 31) * 0.5 + 0.5);
  return Array.from({ length: BIG_COUNT }, (_, i) => {
    const angle = (360 / BIG_COUNT) * i + rng(i * 3) * 22 - 11;
    const dist  = 48 + rng(i * 7) * 38;
    return {
      id: i,
      bx:    Math.cos(angle * Math.PI / 180) * dist,
      by:    Math.sin(angle * Math.PI / 180) * dist,
      delay: i * 0.016 + rng(i) * 0.04,
      size:  5 + rng(i * 2) * 5,
    };
  });
}

function genSparks(seed: number) {
  const rng = (n: number) => (Math.sin(seed * 53 + n * 17) * 0.5 + 0.5);
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (360 / SPARK_COUNT) * i + 18 + rng(i) * 15;
    const dist  = 22 + rng(i * 5) * 22;
    return {
      id: i,
      bx:    Math.cos(angle * Math.PI / 180) * dist,
      by:    Math.sin(angle * Math.PI / 180) * dist,
      ex:    (rng(i + 11) - 0.5) * 18,
      ey:    (rng(i + 17) - 0.5) * 18,
      delay: 0.05 + i * 0.014 + rng(i) * 0.03,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export const AttackParticleEffect: React.FC<AttackParticleEffectProps> = ({ attack, onComplete }) => {
  const [coords, setCoords] = useState<{ o: Pos; t: Pos } | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seed = useMemo(() => attack ? attack.type.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 0, [attack?.type]);
  const bigParticles = useMemo(() => genBigParticles(seed), [seed]);
  const sparks       = useMemo(() => genSparks(seed),       [seed]);

  useEffect(() => {
    if (!attack) { setCoords(null); return; }

    const origin: Pos = { x: window.innerWidth / 2, y: window.innerHeight * 0.5 };

    const targetEl = document.querySelector('[data-attack-target]');
    const target: Pos = targetEl
      ? (() => { const r = targetEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()
      : { x: window.innerWidth * 0.82, y: 185 };

    setCoords({ o: origin, t: target });

    timerRef.current = setTimeout(() => onCompleteRef.current(), 1650);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [attack]);

  return (
    <AnimatePresence>
      {attack && coords && (() => {
        const { o, t } = coords;
        const dx = t.x - o.x;
        const dy = t.y - o.y;

        return (
          <div
            key={attack.type + '-particles'}
            className="fixed inset-0 pointer-events-none select-none overflow-hidden"
            style={{ zIndex: 9988 }}
          >
            {/* ── BURST ORIGIN FLASH ─────────────────────────── */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.8, 0], opacity: [0, 0.65, 0] }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                left:   o.x - 30,
                top:    o.y - 30,
                width:  60,
                height: 60,
                background: `radial-gradient(circle, ${attack.color}99 0%, transparent 70%)`,
              }}
            />

            {/* ── BIG PARTICLES ──────────────────────────────── */}
            {bigParticles.map(p => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x:       [0, p.bx * 1.35, dx],
                  y:       [0, p.by * 1.35, dy],
                  scale:   [0, 1.3, 0.4, 0],
                  opacity: [0, 1, 0.9, 0],
                }}
                transition={{
                  duration: 1.05,
                  times:    [0, 0.24, 0.82, 1],
                  ease:     'easeInOut',
                  delay:    p.delay,
                }}
                className="absolute rounded-full"
                style={{
                  left:      o.x - p.size / 2,
                  top:       o.y - p.size / 2,
                  width:     p.size,
                  height:    p.size,
                  background: attack.color,
                  boxShadow: `0 0 ${p.size * 3}px ${attack.glow}, 0 0 ${p.size}px ${attack.color}`,
                }}
              />
            ))}

            {/* ── SMALL WHITE SPARKS ─────────────────────────── */}
            {sparks.map(sp => (
              <motion.div
                key={sp.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x:       [0, sp.bx, dx + sp.ex],
                  y:       [0, sp.by, dy + sp.ey],
                  scale:   [0, 1, 0],
                  opacity: [0, 0.9, 0],
                }}
                transition={{
                  duration: 0.9,
                  times:    [0, 0.22, 1],
                  ease:     ['easeOut', 'easeIn'],
                  delay:    sp.delay,
                }}
                className="absolute rounded-full"
                style={{
                  left:      o.x - 2,
                  top:       o.y - 2,
                  width:     3,
                  height:    3,
                  background: 'white',
                  boxShadow: `0 0 5px ${attack.color}`,
                }}
              />
            ))}

            {/* ── MAIN EMOJI — arcs through air ──────────────── */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -15 }}
              animate={{
                x:       [0, dx * 0.12, dx],
                y:       [0, dy * 0.12 - 70, dy],
                scale:   [0, 2.4, 1.8, 0],
                opacity: [0, 1,   1,   0],
                rotate:  [-15, 8, 2],
              }}
              transition={{
                duration: 1.15,
                times:    [0, 0.18, 0.72, 1],
                ease:     'easeInOut',
                delay:    0.04,
              }}
              className="absolute"
              style={{
                left: o.x - 28,
                top:  o.y - 28,
                filter: `drop-shadow(0 0 18px ${attack.glow}) drop-shadow(0 0 8px ${attack.color})`,
              }}
            >
              <span className="text-[56px] leading-none">{attack.emoji}</span>
            </motion.div>

            {/* ── IMPACT RINGS at target ─────────────────────── */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={`ring-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3.5 + i * 1.2], opacity: [0, 0.85 - i * 0.2, 0] }}
                transition={{ duration: 0.45 + i * 0.07, delay: 0.88 + i * 0.06, ease: 'easeOut' }}
                className="absolute rounded-full border-2"
                style={{
                  left:        t.x - 28,
                  top:         t.y - 28,
                  width:       56,
                  height:      56,
                  borderColor: attack.color,
                  boxShadow:   `0 0 12px ${attack.glow}`,
                }}
              />
            ))}

            {/* ── IMPACT FLASH ───────────────────────────────── */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.5, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.35, delay: 0.86, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                left:       t.x - 35,
                top:        t.y - 35,
                width:      70,
                height:     70,
                background: `radial-gradient(circle, white 0%, ${attack.color}cc 35%, transparent 70%)`,
              }}
            />

            {/* ── EMOJI POP at avatar on impact ─────────────── */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.2, 1.4, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.65, times: [0, 0.28, 0.62, 1], delay: 0.85 }}
              className="absolute"
              style={{
                left:   t.x - 22,
                top:    t.y - 22,
                filter: `drop-shadow(0 0 14px ${attack.glow})`,
              }}
            >
              <span className="text-[44px] leading-none">{attack.emoji}</span>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
};
