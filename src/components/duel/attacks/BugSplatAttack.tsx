import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ShieldAlert, Crosshair, Skull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BugSplatAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

type BugKind = 'worm' | 'spike' | 'rogue' | 'queen';

interface BugState {
  id: number;
  kind: BugKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  rotation: number;
  hits: number;
  maxHits: number;
  alive: boolean;
  killedAt: number;
  size: number;
  trail: { x: number; y: number; t: number }[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;     // 0..1, 1 = fresh
  size: number;
  color: string;
  born: number;
}

const TOTAL_BUGS = 7;
const SPAWN_INTERVAL_MS = 650;
const HIT_RADIUS = 40;
const CRIT_RADIUS = 14;
const GLITCH_RADIUS_MULT = 1.6;
const GLITCH_DECAY_MS = 750;

const KIND_CONFIG: Record<BugKind, {
  hue: number;        // base hue (degrees)
  size: number;
  speed: number;
  hp: number;
  label: string;
}> = {
  worm:  { hue: 0,   size: 36, speed: 95,  hp: 1, label: 'WORM.exe' },
  spike: { hue: 14,  size: 32, speed: 135, hp: 1, label: 'SPIKE.bin' },
  rogue: { hue: 280, size: 44, speed: 70,  hp: 1, label: 'ROGUE.dll' },
  queen: { hue: 340, size: 64, speed: 110, hp: 3, label: 'QUEEN.exe' },
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnEdge(): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const margin = 80;
  const side = Math.floor(rand(0, 3));
  switch (side) {
    case 0: return { x: -margin, y: rand(180, h - 100) };
    case 1: return { x: w + margin, y: rand(180, h - 100) };
    default: return { x: rand(60, w - 60), y: h + margin };
  }
}

function pickTarget(): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: w / 2 + rand(-w * 0.35, w * 0.35),
    y: h / 2 + rand(-h * 0.22, h * 0.25),
  };
}

function buildBug(id: number, total: number): BugState {
  const isQueen = id === total;
  const r = Math.random();
  const kind: BugKind = isQueen
    ? 'queen'
    : r < 0.45 ? 'worm'
    : r < 0.78 ? 'spike'
    : 'rogue';

  const cfg = KIND_CONFIG[kind];
  const start = spawnEdge();
  const tgt = pickTarget();
  const ramp = 1 + (id - 1) / total * 0.45;

  return {
    id,
    kind,
    x: start.x,
    y: start.y,
    tx: tgt.x,
    ty: tgt.y,
    speed: cfg.speed * ramp,
    rotation: 0,
    hits: 0,
    maxHits: cfg.hp,
    alive: true,
    killedAt: 0,
    size: cfg.size,
    trail: [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Bug visual (SVG hexagonal "intrusion" — replaces the old emoji)
// ────────────────────────────────────────────────────────────────────────────
const BugGlyph: React.FC<{ kind: BugKind; size: number; hits: number; maxHits: number }> = ({
  kind, size, hits, maxHits,
}) => {
  const cfg = KIND_CONFIG[kind];
  const damaged = hits > 0;
  const gradId = `bug-${kind}-${size}`;
  const coreColor = `hsl(${cfg.hue} 100% 58%)`;
  const shellColor = `hsl(${cfg.hue} 60% ${damaged ? 35 : 22}%)`;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="45%" r="55%">
          <stop offset="0%"   stopColor={coreColor} stopOpacity="1" />
          <stop offset="50%"  stopColor={shellColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0204" stopOpacity="1" />
        </radialGradient>
        <filter id={`${gradId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Legs (8 angular spines) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="20" y1="20"
          x2={20 + Math.cos((deg * Math.PI) / 180) * 22}
          y2={20 + Math.sin((deg * Math.PI) / 180) * 22}
          stroke={`hsl(${cfg.hue} 70% 22%)`}
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.85"
        />
      ))}

      {/* Hex body */}
      <polygon
        points="20,4 33,12 33,28 20,36 7,28 7,12"
        fill={`url(#${gradId})`}
        stroke={`hsl(${cfg.hue} 80% 50%)`}
        strokeWidth="1"
        style={{
          filter: `drop-shadow(0 0 6px hsla(${cfg.hue}, 100%, 55%, 0.7))`,
        }}
      />

      {/* Inner pulse core */}
      <circle
        cx="20" cy="20"
        r={kind === 'queen' ? 7 : 4.5}
        fill={coreColor}
        opacity="0.95"
        style={{
          animation: 'bugCorePulse 1.1s ease-in-out infinite',
          filter: `drop-shadow(0 0 4px hsl(${cfg.hue}, 100%, 60%))`,
        }}
      />
      <circle
        cx="20" cy="20"
        r="1.6"
        fill="#fff"
        opacity="0.95"
      />

      {/* Queen extra rim */}
      {kind === 'queen' && (
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke={`hsl(${cfg.hue} 95% 65%)`}
          strokeWidth="0.5"
          strokeDasharray="2 2"
          opacity="0.8"
          style={{ animation: 'bugRingSpin 4s linear infinite', transformOrigin: '20px 20px' }}
        />
      )}

      {/* HP segments for multi-hit bugs (queen) */}
      {maxHits > 1 && (
        <>
          {Array.from({ length: maxHits }).map((_, i) => {
            const angle = -90 + (i - (maxHits - 1) / 2) * 18;
            const lost = i < hits;
            const x = 20 + Math.cos((angle * Math.PI) / 180) * 18;
            const y = 20 + Math.sin((angle * Math.PI) / 180) * 18;
            return (
              <rect
                key={i}
                x={x - 2.5} y={y - 1.2}
                width="5" height="2.4"
                rx="0.5"
                fill={lost ? '#1a0204' : `hsl(${cfg.hue} 95% 60%)`}
                stroke={lost ? '#3a0204' : '#000'}
                strokeWidth="0.4"
              />
            );
          })}
        </>
      )}
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Targeting reticle cursor
// ────────────────────────────────────────────────────────────────────────────
const Reticle: React.FC<{ x: number; y: number; locked: boolean; thwack: number }> = ({
  x, y, locked, thwack,
}) => {
  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{
        left: x, top: y,
        transform: 'translate(-50%, -50%)',
        width: 56, height: 56,
      }}
    >
      <div
        key={thwack}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          animation: thwack > 0 ? 'reticleThwack 0.18s ease-out' : undefined,
        }}
      >
        {/* Outer rotating ring */}
        <svg viewBox="0 0 56 56" style={{
          position: 'absolute', inset: 0, animation: 'reticleSpin 6s linear infinite',
          filter: `drop-shadow(0 0 6px ${locked ? 'rgba(239,68,68,0.9)' : 'rgba(52,211,153,0.7)'})`,
        }}>
          <circle cx="28" cy="28" r="26" fill="none"
            stroke={locked ? '#ef4444' : '#34d399'}
            strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
          {/* corner brackets */}
          {[[6, 6, 'M 14,6 L 6,6 L 6,14'],
            [42, 6, 'M 42,6 L 50,6 L 50,14'],
            [6, 42, 'M 6,42 L 6,50 L 14,50'],
            [42, 42, 'M 42,50 L 50,50 L 50,42']].map(([_x, _y, d], i) => (
              <path key={i} d={d as string}
                stroke={locked ? '#ef4444' : '#34d399'} strokeWidth="2"
                fill="none" strokeLinecap="round" />
            ))}
        </svg>
        {/* Center crosshair + dot */}
        <svg viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0 }}>
          <line x1="28" y1="20" x2="28" y2="26"
            stroke={locked ? '#fecaca' : '#a7f3d0'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="28" y1="30" x2="28" y2="36"
            stroke={locked ? '#fecaca' : '#a7f3d0'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="28" x2="26" y2="28"
            stroke={locked ? '#fecaca' : '#a7f3d0'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="30" y1="28" x2="36" y2="28"
            stroke={locked ? '#fecaca' : '#a7f3d0'} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="28" cy="28" r="1.5"
            fill={locked ? '#ef4444' : '#34d399'}
            style={{ filter: `drop-shadow(0 0 3px ${locked ? '#ef4444' : '#34d399'})` }} />
        </svg>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Main attack
// ────────────────────────────────────────────────────────────────────────────
export const BugSplatAttack: React.FC<BugSplatAttackProps> = ({
  isActive, onCleaned, expiresAt, exploitId,
}) => {
  const [bugs, setBugs] = useState<BugState[]>([]);
  const [spawnIdx, setSpawnIdx] = useState(0);
  const [killedTotal, setKilledTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ key: number; n: number } | null>(null);
  const [done, setDone] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: -300, y: -300 });
  const [thwack, setThwack] = useState(0);
  const [glitchTick, setGlitchTick] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const resolvedRef = useRef(false);
  const lastKillRef = useRef<number>(0);
  const particleIdRef = useRef(0);

  // Reset on activation
  useEffect(() => {
    if (!isActive) return;
    setBugs([]);
    setSpawnIdx(0);
    setKilledTotal(0);
    setCombo(0);
    setDone(false);
    setParticles([]);
    resolvedRef.current = false;
  }, [isActive, exploitId]);

  // Spawn bugs one by one
  useEffect(() => {
    if (!isActive || done) return;
    if (spawnIdx >= TOTAL_BUGS) return;
    const t = setTimeout(() => {
      const id = spawnIdx + 1;
      setBugs(prev => [...prev, buildBug(id, TOTAL_BUGS)]);
      setSpawnIdx(id);
    }, spawnIdx === 0 ? 250 : SPAWN_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [isActive, done, spawnIdx]);

  // Animation loop: move bugs + advance particles
  useEffect(() => {
    if (!isActive || done) return;

    const step = (ts: number) => {
      const dt = lastFrameRef.current ? (ts - lastFrameRef.current) / 1000 : 0;
      lastFrameRef.current = ts;

      setBugs(prev => {
        if (prev.length === 0) return prev;
        return prev.map(b => {
          if (!b.alive) return b;
          const dx = b.tx - b.x;
          const dy = b.ty - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 10) {
            const t = pickTarget();
            return { ...b, tx: t.x, ty: t.y };
          }
          const stepLen = Math.min(dist, b.speed * dt);
          const nx = b.x + (dx / dist) * stepLen;
          const ny = b.y + (dy / dist) * stepLen;
          const rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          // Update trail
          const now = ts;
          const trail = [{ x: nx, y: ny, t: now }, ...b.trail.filter(p => now - p.t < 380)].slice(0, 12);
          return { ...b, x: nx, y: ny, rotation, trail };
        });
      });

      // Particles
      setParticles(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        return prev
          .map(p => {
            const age = (now - p.born) / 600;
            return {
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vy: p.vy + 320 * dt,    // gravity
              life: Math.max(0, 1 - age),
            };
          })
          .filter(p => p.life > 0);
      });

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    };
  }, [isActive, done]);

  // Periodic ambient glitch (small chromatic flicker when bugs are alive)
  useEffect(() => {
    if (!isActive || done) return;
    const aliveCount = bugs.filter(b => b.alive).length;
    if (aliveCount === 0) return;
    const i = setInterval(() => {
      if (Math.random() < 0.35) setGlitchTick(g => g + 1);
    }, 1400);
    return () => clearInterval(i);
  }, [isActive, done, bugs]);

  // GC dead bugs after glitch decays
  useEffect(() => {
    const i = setInterval(() => {
      const now = Date.now();
      setBugs(prev => prev.filter(b => b.alive || now - b.killedAt < GLITCH_DECAY_MS + 250));
    }, 200);
    return () => clearInterval(i);
  }, []);

  // Win condition — uses killedTotal counter (independent of GC'd bug array)
  useEffect(() => {
    if (!isActive || done) return;
    if (spawnIdx < TOTAL_BUGS) return;
    if (killedTotal >= TOTAL_BUGS) {
      setDone(true);
      if (exploitId) {
        try {
          supabase.rpc('resolve_exploit', { p_exploit_id: exploitId })
            .then(({ error }) => {
              if (error) console.warn('[BugSplatAttack] resolve_exploit error:', error);
            });
        } catch (e) {
          console.warn('[BugSplatAttack] resolve_exploit exception:', e);
        }
      }
      const t = setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        onCleaned();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [killedTotal, spawnIdx, isActive, done, exploitId, onCleaned]);

  // Expiry guard — never deadlock the duel
  useEffect(() => {
    if (!isActive || !expiresAt || done) return;
    const remain = expiresAt - Date.now();
    if (remain <= 0) {
      const t = setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        onCleaned();
      }, 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onCleaned();
    }, remain);
    return () => clearTimeout(t);
  }, [isActive, expiresAt, done, onCleaned]);

  // Tap to kill
  const handleTap = useCallback((clientX: number, clientY: number) => {
    if (done) return;
    setThwack(t => t + 1);
    setBugs(prev => {
      let bestIdx = -1;
      let bestDist = HIT_RADIUS;
      prev.forEach((b, i) => {
        if (!b.alive) return;
        const dx = clientX - b.x;
        const dy = clientY - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      if (bestIdx === -1) {
        setCombo(0);
        return prev;
      }

      const target = prev[bestIdx];
      const newHits = target.hits + 1;
      const willDie = newHits >= target.maxHits;
      const isCrit = bestDist < CRIT_RADIUS;

      if (willDie) {
        const now = Date.now();
        const sinceLast = now - lastKillRef.current;
        lastKillRef.current = now;
        const newCombo = sinceLast < 1100 ? combo + 1 : 1;
        setCombo(newCombo);
        setKilledTotal(k => k + 1);
        if (newCombo >= 2) setComboFlash({ key: now, n: newCombo });
        try {
          if (navigator.vibrate) navigator.vibrate(target.kind === 'queen' ? [50, 25, 50] : isCrit ? [25, 15, 25] : 18);
        } catch { /* no-op */ }

        // Emit particles
        const cfg = KIND_CONFIG[target.kind];
        const count = target.kind === 'queen' ? 28 : isCrit ? 18 : 12;
        const burst: Particle[] = [];
        for (let i = 0; i < count; i++) {
          const angle = rand(0, Math.PI * 2);
          const speed = rand(120, isCrit ? 360 : 280);
          burst.push({
            id: ++particleIdRef.current,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 60,
            life: 1,
            size: rand(2, isCrit ? 5 : 4),
            color: isCrit && i % 3 === 0
              ? '#fde68a'
              : `hsl(${cfg.hue + rand(-15, 15)} 95% ${rand(55, 75)}%)`,
            born: Date.now(),
          });
        }
        setParticles(p => [...p, ...burst].slice(-180));
      } else {
        try { if (navigator.vibrate) navigator.vibrate(8); } catch { /* no-op */ }
      }

      return prev.map((b, i) =>
        i === bestIdx
          ? willDie
            ? { ...b, alive: false, hits: newHits, killedAt: Date.now() }
            : { ...b, hits: newHits }
          : b
      );
    });
  }, [done, combo]);

  // Cursor: red lock when over a live bug
  const reticleLocked = useMemo(() => {
    return bugs.some(b => {
      if (!b.alive) return false;
      const dx = pointer.x - b.x;
      const dy = pointer.y - b.y;
      return dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS;
    });
  }, [bugs, pointer]);

  // Clear combo flash
  useEffect(() => {
    if (!comboFlash) return;
    const t = setTimeout(() => setComboFlash(null), 700);
    return () => clearTimeout(t);
  }, [comboFlash]);

  if (!isActive) return null;

  const killedCount = killedTotal;
  const hasQueen = bugs.some(b => b.kind === 'queen' && b.alive);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none font-mono"
      style={{
        zIndex: 2147483647,
        background:
          'radial-gradient(ellipse at center, rgba(40,4,8,0.32) 0%, rgba(8,2,4,0.55) 100%), #050307',
        touchAction: 'none',
        cursor: done ? 'default' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onMouseMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
      onMouseDown={(e) => handleTap(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) setPointer({ x: t.clientX, y: t.clientY });
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) {
          setPointer({ x: t.clientX, y: t.clientY });
          handleTap(t.clientX, t.clientY);
        }
      }}
    >
      {/* Ambient: hexagonal grid + scanlines + vignette */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(239,68,68,0.4) 0 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(220,38,38,0.3) 0 1px, transparent 1px)',
          backgroundSize: '32px 32px, 32px 32px',
        }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(transparent 50%, rgba(220,38,38,0.06) 50%)',
          backgroundSize: '100% 3px',
        }}
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(180,20,20,0.18) 100%)',
        }}
      />

      {/* Ambient chromatic glitch flicker */}
      <div
        key={`glitch-${glitchTick}`}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 30%, transparent 70%, rgba(52,211,153,0.1) 100%)',
          mixBlendMode: 'screen',
          opacity: 0,
          animation: glitchTick > 0 ? 'glitchFlick 0.22s steps(2) 1' : undefined,
        }}
      />

      {/* Bug trails */}
      {bugs.map(b => b.alive && b.trail.length >= 2 ? (
        <svg
          key={`trail-${b.id}`}
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <polyline
            points={b.trail.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={`hsla(${KIND_CONFIG[b.kind].hue}, 95%, 60%, 0.45)`}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px hsl(${KIND_CONFIG[b.kind].hue}, 100%, 55%))` }}
          />
        </svg>
      ) : null)}

      {/* Bugs + glitch zones */}
      {bugs.map(b => {
        const cfg = KIND_CONFIG[b.kind];
        const glitchSize = b.size * GLITCH_RADIUS_MULT;
        let glitchOpacity = 0.7;
        if (!b.alive) {
          const elapsed = Date.now() - b.killedAt;
          glitchOpacity = Math.max(0, 0.7 * (1 - elapsed / GLITCH_DECAY_MS));
        }

        return (
          <React.Fragment key={b.id}>
            {/* Glitch corruption zone — red radial with scanlines */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: b.x - glitchSize / 2,
                top: b.y - glitchSize / 2,
                width: glitchSize,
                height: glitchSize,
                borderRadius: '50%',
                background: `radial-gradient(circle, hsla(${cfg.hue}, 90%, 30%, 0.85) 0%, hsla(${cfg.hue}, 80%, 15%, 0.45) 55%, transparent 100%)`,
                opacity: glitchOpacity,
                mixBlendMode: 'screen',
                transition: !b.alive ? `opacity ${GLITCH_DECAY_MS}ms ease-out` : undefined,
                animation: b.alive ? 'glitchZonePulse 1.6s ease-in-out infinite' : undefined,
              }}
            />
            {/* Scanline inside the zone */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: b.x - glitchSize / 2,
                top: b.y - glitchSize / 2,
                width: glitchSize,
                height: glitchSize,
                borderRadius: '50%',
                background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.4) 2px 3px)',
                opacity: glitchOpacity * 0.5,
                mixBlendMode: 'multiply',
                transition: !b.alive ? `opacity ${GLITCH_DECAY_MS}ms ease-out` : undefined,
              }}
            />

            {b.alive ? (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: b.x - b.size / 2,
                  top: b.y - b.size / 2,
                  width: b.size,
                  height: b.size,
                  transform: `rotate(${b.rotation}deg)`,
                }}
              >
                <BugGlyph kind={b.kind} size={b.size} hits={b.hits} maxHits={b.maxHits} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.life,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
          }}
        />
      ))}

      {/* Reticle cursor */}
      <Reticle x={pointer.x} y={pointer.y} locked={reticleLocked} thwack={thwack} />

      {/* HUD */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
        style={{
          top: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px) + 12px)',
        }}
      >
        <div className="bg-black/85 backdrop-blur-md border border-red-500/40 rounded-md px-4 py-2 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-red-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Intrusion</span>
            </div>
            <div className="w-px h-4 bg-red-500/30" />
            <div className="flex items-center gap-1">
              {Array.from({ length: TOTAL_BUGS }).map((_, i) => {
                const filled = i < killedCount;
                return (
                  <div
                    key={i}
                    className={`w-2 h-3.5 ${
                      filled
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                        : 'bg-red-900/50 border border-red-500/40'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-emerald-300 text-sm font-black tabular-nums">
              {killedCount.toString().padStart(2, '0')}/{TOTAL_BUGS.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Queen warning */}
      {hasQueen && (
        <div
          className="absolute left-1/2 pointer-events-none z-30"
          style={{
            top: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px) + 60px)',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-2 bg-red-950/95 border border-red-500 rounded-sm px-3 py-1 shadow-[0_0_25px_rgba(220,38,38,0.6)]">
            <Skull className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-red-200 text-[10px] tracking-[0.25em] font-black">QUEEN.EXE / 3 HP</span>
          </div>
        </div>
      )}

      {/* Combo flash — terminal style, lower-left */}
      {comboFlash && comboFlash.n >= 2 && (
        <div
          key={comboFlash.key}
          className="absolute left-6 bottom-24 pointer-events-none z-30"
          style={{ animation: 'comboTick 0.7s ease-out forwards' }}
        >
          <div className="text-emerald-300 text-sm font-mono font-bold tracking-widest"
            style={{ textShadow: '0 0 10px rgba(52,211,153,0.7)' }}>
            {'>'} CHAIN x{comboFlash.n}{comboFlash.n >= 4 ? ' — HUNTER' : ''}
          </div>
        </div>
      )}

      {/* Hint */}
      {bugs.length < 2 && !done && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20"
          style={{ bottom: '14%' }}
        >
          <div className="flex items-center gap-2 bg-black/80 border border-emerald-500/30 rounded-sm px-3 py-1.5 text-emerald-300/80 text-[10px] uppercase tracking-widest">
            <Crosshair className="w-3 h-3" />
            <span>Tap intrusions to terminate</span>
          </div>
        </div>
      )}

      {/* Success overlay — glitch reveal */}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-emerald-950/95 backdrop-blur-md border border-emerald-400 px-10 py-6 rounded-sm shadow-[0_0_80px_rgba(16,185,129,0.7)] text-center"
            style={{ animation: 'successGlitch 0.6s ease-out' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <div className="w-2 h-2 bg-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.4em]">System</span>
              </div>
              <h2 className="text-3xl font-black text-emerald-200 tracking-[0.15em] font-mono"
                style={{ textShadow: '0 0 20px rgba(52,211,153,0.6)' }}>
                THREAT NEUTRALIZED
              </h2>
              <p className="text-emerald-400/80 text-xs uppercase tracking-[0.3em]">
                {'>'} {TOTAL_BUGS}/{TOTAL_BUGS} intrusions terminated
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bugCorePulse {
          0%, 100% { transform-origin: center; transform: scale(1); opacity: 1; }
          50%      { transform-origin: center; transform: scale(0.7); opacity: 0.6; }
        }
        @keyframes bugRingSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes glitchZonePulse {
          0%, 100% { transform: scale(1);   filter: blur(0px); }
          50%      { transform: scale(1.08); filter: blur(0.5px); }
        }
        @keyframes glitchFlick {
          0%, 100% { opacity: 0; transform: translateX(0); }
          50%      { opacity: 0.9; transform: translateX(-2px); }
        }
        @keyframes reticleSpin { to { transform: rotate(360deg); } }
        @keyframes reticleThwack {
          0%   { transform: scale(1);   filter: brightness(1); }
          50%  { transform: scale(1.35); filter: brightness(1.6); }
          100% { transform: scale(1);   filter: brightness(1); }
        }
        @keyframes comboTick {
          0%   { transform: translateY(8px); opacity: 0; }
          25%  { transform: translateY(0);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-12px); opacity: 0; }
        }
        @keyframes successGlitch {
          0%   { transform: translateY(8px) skewX(2deg); opacity: 0; filter: hue-rotate(20deg); }
          30%  { transform: translateY(0) skewX(-1deg);  opacity: 1; filter: hue-rotate(-10deg); }
          60%  { transform: translateY(0) skewX(0.5deg); opacity: 1; filter: hue-rotate(0deg); }
          100% { transform: translateY(0);              opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BugSplatAttack;
