import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface IceScreenAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number;
  exploitId?: string;
}

interface Chip {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  points: string;
}

const randomPolygonPoints = (size: number): string => {
  const verts = 5 + Math.floor(Math.random() * 3);
  const pts: string[] = [];
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const r = size * (0.55 + Math.random() * 0.45);
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
};

let chipIdCounter = 0;

export const IceScreenAttack: React.FC<IceScreenAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iceCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [done, setDone] = useState(false);
  const [shattered, setShattered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chips, setChips] = useState<Chip[]>([]);
  const [cursor, setCursor] = useState({ x: -200, y: -200, visible: false });
  const [scraperAngle, setScraperAngle] = useState(-25);
  const [isDown, setIsDown] = useState(false);

  const lastPosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastChipTimeRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const totalTargetPxRef = useRef(1);

  // Initialize frost canvas with rich texture
  useEffect(() => {
    if (!isActive || !iceCanvasRef.current || !containerRef.current) return;
    const canvas = iceCanvasRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Base frost gradient
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, 'rgba(225, 240, 255, 0.97)');
    grad.addColorStop(0.5, 'rgba(200, 225, 245, 0.97)');
    grad.addColorStop(1, 'rgba(215, 235, 250, 0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Layered frosty blobs (large, soft)
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = 40 + Math.random() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.15 + Math.random() * 0.2})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cool blue tint blobs
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = 60 + Math.random() * 100;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(150, 200, 240, ${0.1 + Math.random() * 0.2})`);
      g.addColorStop(1, 'rgba(150, 200, 240, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fern-like ice crystals (fractal-ish lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const cx = Math.random() * rect.width;
      const cy = Math.random() * rect.height;
      const branches = 5 + Math.floor(Math.random() * 4);
      const baseLen = 8 + Math.random() * 18;
      for (let b = 0; b < branches; b++) {
        const angle = (b / branches) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const ex = cx + Math.cos(angle) * baseLen;
        const ey = cy + Math.sin(angle) * baseLen;
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // tiny ferns
        for (let k = 1; k <= 3; k++) {
          const fx = cx + Math.cos(angle) * (baseLen * k / 4);
          const fy = cy + Math.sin(angle) * (baseLen * k / 4);
          const sub = baseLen * 0.25;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(angle + 0.8) * sub, fy + Math.sin(angle + 0.8) * sub);
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(angle - 0.8) * sub, fy + Math.sin(angle - 0.8) * sub);
          ctx.stroke();
        }
      }
    }

    // Highlight sheen
    const sheen = ctx.createLinearGradient(0, 0, rect.width, 0);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Sample canvas for progress (low-res copy)
    const sampleCanvas = document.createElement('canvas');
    const sampleW = 80;
    const sampleH = 80;
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext('2d');
    if (sampleCtx) {
      sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    }
    sampleCanvasRef.current = sampleCanvas;

    // Compute total target pixels (within center ellipse, 60% area)
    let totalTarget = 0;
    const cx = sampleW / 2;
    const cy = sampleH / 2;
    const rx = sampleW * 0.4;
    const ry = sampleH * 0.4;
    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) totalTarget++;
      }
    }
    totalTargetPxRef.current = Math.max(1, totalTarget);
  }, [isActive]);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt || !isActive) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { onCleaned(); return; }
    const t = setTimeout(onCleaned, remaining);
    return () => clearTimeout(t);
  }, [expiresAt, onCleaned, isActive]);

  // Scrape sound (cached AudioContext)
  const playScrapeSound = useCallback((intensity: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Filtered white noise burst
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400 + Math.random() * 800;
      filter.Q.value = 1.5;

      const gain = ctx.createGain();
      gain.gain.value = Math.min(0.15, 0.04 + intensity * 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.08);
    } catch {}
  }, []);

  // Stamp a soft scrape into the ice canvas via destination-out
  const stampScrape = useCallback((x: number, y: number, dx: number, dy: number) => {
    const canvas = iceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Elongated soft brush along movement direction
    const len = Math.min(60, Math.hypot(dx, dy) * 2.5);
    const angle = Math.atan2(dy, dx);
    const halfW = 22;
    const halfL = Math.max(18, len);

    ctx.translate(x, y);
    ctx.rotate(angle);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, halfL);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL, halfW, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  // Sample progress via low-res copy of the ice canvas alpha
  const sampleProgress = useCallback(() => {
    const main = iceCanvasRef.current;
    const sample = sampleCanvasRef.current;
    if (!main || !sample) return;
    const sCtx = sample.getContext('2d');
    if (!sCtx) return;

    sCtx.clearRect(0, 0, sample.width, sample.height);
    sCtx.drawImage(main, 0, 0, sample.width, sample.height);
    const imgData = sCtx.getImageData(0, 0, sample.width, sample.height).data;

    const cx = sample.width / 2;
    const cy = sample.height / 2;
    const rx = sample.width * 0.4;
    const ry = sample.height * 0.4;

    let cleared = 0;
    for (let y = 0; y < sample.height; y++) {
      for (let x = 0; x < sample.width; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const idx = (y * sample.width + x) * 4 + 3; // alpha
        if (imgData[idx] < 40) cleared++;
      }
    }

    const pct = (cleared / totalTargetPxRef.current) * 100;
    return Math.min(100, pct);
  }, []);

  // Win → shatter
  const triggerShatter = useCallback(() => {
    if (shattered) return;
    setShattered(true);

    const canvas = iceCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Final radiating cracks
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          let x = cx, y = cy;
          for (let s = 0; s < 6; s++) {
            x += Math.cos(a + (Math.random() - 0.5) * 0.4) * 60;
            y += Math.sin(a + (Math.random() - 0.5) * 0.4) * 60;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }

    // Mass explosion of polygon shards
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const shards: Chip[] = [];
      for (let i = 0; i < 28; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 6 + Math.random() * 10;
        shards.push({
          id: chipIdCounter++,
          x: cx + (Math.random() - 0.5) * 80,
          y: cy + (Math.random() - 0.5) * 80,
          dx: Math.cos(a) * spd,
          dy: Math.sin(a) * spd,
          rot: Math.random() * 360,
          size: 14 + Math.random() * 18,
          points: randomPolygonPoints(14 + Math.random() * 18),
        });
      }
      setChips(prev => [...prev, ...shards]);
    }

    if (navigator.vibrate) navigator.vibrate([60, 30, 60, 40, 80]);
    setDone(true);
    setTimeout(() => onCleaned(), 700);
  }, [shattered, onCleaned]);

  // Mouse / touch handlers
  useEffect(() => {
    if (!isActive || done) return;
    const container = containerRef.current;
    if (!container) return;

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = container.getBoundingClientRect();
      if ('touches' in e) {
        const t = e.touches[0] || e.changedTouches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      const now = performance.now();
      setCursor({ x, y, visible: true });

      const last = lastPosRef.current;
      if (!last) {
        lastPosRef.current = { x, y, t: now };
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const dt = now - last.t || 1;
      const dist = Math.hypot(dx, dy);
      const speed = dist / dt; // px per ms

      if (dist > 0.5) {
        setScraperAngle(Math.atan2(dy, dx) * (180 / Math.PI) + 90);
      }
      lastPosRef.current = { x, y, t: now };

      // velocity gate
      const dragging = 'touches' in e ? true : isDown;
      if (!dragging || speed < 0.15) return;

      stampScrape(x, y, dx, dy);

      // Throttle chips and sounds
      if (now - lastChipTimeRef.current > 30) {
        lastChipTimeRef.current = now;
        playScrapeSound(Math.min(1, speed));

        const chipsCount = 2 + Math.floor(Math.random() * 2);
        const newChips: Chip[] = [];
        for (let i = 0; i < chipsCount; i++) {
          const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
          const sp = 3 + Math.random() * 5 + speed * 2;
          const size = 6 + Math.random() * 10;
          newChips.push({
            id: chipIdCounter++,
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            dx: Math.cos(ang) * sp,
            dy: Math.sin(ang) * sp - 1,
            rot: Math.random() * 360,
            size,
            points: randomPolygonPoints(size),
          });
        }
        setChips(prev => [...prev.slice(-40), ...newChips]);
      }

      // Sample progress at most every 100ms
      if (now - lastSampleTimeRef.current > 100) {
        lastSampleTimeRef.current = now;
        const pct = sampleProgress();
        if (pct !== undefined) {
          setProgress(pct);
          if (pct >= 60) triggerShatter();
        }
      }
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDown(true);
      const { x, y } = getPos(e);
      lastPosRef.current = { x, y, t: performance.now() };
      setCursor({ x, y, visible: true });
    };

    const handleUp = () => {
      setIsDown(false);
      lastPosRef.current = null;
    };

    const handleLeave = () => {
      setCursor(c => ({ ...c, visible: false }));
    };

    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mousedown', handleDown);
    container.addEventListener('mouseup', handleUp);
    container.addEventListener('mouseleave', handleLeave);
    container.addEventListener('touchstart', handleDown, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleUp);

    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mousedown', handleDown);
      container.removeEventListener('mouseup', handleUp);
      container.removeEventListener('mouseleave', handleLeave);
      container.removeEventListener('touchstart', handleDown);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleUp);
    };
  }, [isActive, done, isDown, stampScrape, playScrapeSound, sampleProgress, triggerShatter]);

  // GC chips after their animation completes
  useEffect(() => {
    if (chips.length === 0) return;
    const t = setTimeout(() => {
      setChips(prev => prev.slice(-20));
    }, 1200);
    return () => clearTimeout(t);
  }, [chips]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] overflow-hidden select-none"
          style={{ touchAction: 'none', cursor: 'none' }}
        >
          {/* Fake content under ice — visible but blurred */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none"
            style={{ filter: 'blur(6px)' }}
          >
            <div className="text-center max-w-md space-y-6">
              <div className="px-6 py-4 rounded-2xl bg-slate-700/90 text-white text-lg font-semibold leading-snug">
                En esta intersección sin señalizar se encuentra con un ciclista, ¿debe cederle el paso?
              </div>
              <div className="space-y-3">
                <div className="px-5 py-3 rounded-xl bg-slate-600/70 text-white text-base">
                  Sí, porque se aproxima por la derecha.
                </div>
                <div className="px-5 py-3 rounded-xl bg-slate-600/70 text-white text-base">
                  No, porque los vehículos de motor tienen preferencia.
                </div>
                <div className="px-5 py-3 rounded-xl bg-slate-600/70 text-white text-base">
                  Sí, porque los de dos ruedas siempre tienen preferencia.
                </div>
              </div>
            </div>
          </div>

          {/* The ice canvas — destination-out scraping */}
          <canvas
            ref={iceCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Subtle vignette to focus center */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 30%, rgba(50,80,120,0.25) 100%)',
            }}
          />

          {/* Target zone outline (faint guide) */}
          <div
            className="absolute pointer-events-none border-2 border-dashed border-cyan-300/30 rounded-full"
            style={{
              left: '20%',
              top: '15%',
              width: '60%',
              height: '70%',
            }}
          />

          {/* Top progress bar */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20 w-72 max-w-[80vw]"
            style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 24px))' }}
          >
            <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-xl">
              <motion.span
                className="text-2xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                🔥
              </motion.span>
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-400 via-yellow-300 to-cyan-300 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>
              <span className="text-white text-xs font-bold tabular-nums w-10 text-right">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="text-center text-white/80 text-xs mt-2 font-medium drop-shadow">
              Скреби лёд скребком ❄️
            </div>
          </div>

          {/* Audi A3 sticker */}
          <div
            className="absolute bottom-6 right-6 z-20 pointer-events-none"
            style={{ transform: 'rotate(-4deg)' }}
          >
            <div className="bg-white/85 backdrop-blur-sm rounded-md px-3 py-1.5 text-[11px] font-mono font-bold text-slate-800 border border-slate-300 shadow-md">
              Audi A3 — Andorra ❄️
            </div>
          </div>

          {/* Flying ice chips */}
          {chips.map(chip => (
            <motion.svg
              key={chip.id}
              className="absolute pointer-events-none z-30"
              width={chip.size * 2}
              height={chip.size * 2}
              viewBox={`${-chip.size} ${-chip.size} ${chip.size * 2} ${chip.size * 2}`}
              style={{ left: chip.x - chip.size, top: chip.y - chip.size }}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: chip.rot }}
              animate={{
                opacity: 0,
                scale: 0.4,
                x: chip.dx * 18,
                y: chip.dy * 18 + 60,
                rotate: chip.rot + (Math.random() > 0.5 ? 540 : -540),
              }}
              transition={{ duration: 0.9, ease: [0.2, 0.7, 0.4, 1] }}
            >
              <polygon
                points={chip.points}
                fill="rgba(220, 240, 255, 0.95)"
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="1"
              />
              <polygon
                points={chip.points}
                fill="none"
                stroke="rgba(120, 180, 220, 0.5)"
                strokeWidth="0.5"
              />
            </motion.svg>
          ))}

          {/* Shatter overlay */}
          <AnimatePresence>
            {shattered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.5, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.3, 1] }}
                  className="text-white text-7xl drop-shadow-2xl"
                >
                  ✨
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SVG Scraper cursor */}
          {cursor.visible && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: `translate(-50%, -90%) rotate(${scraperAngle}deg)`,
                transition: 'transform 0.06s linear',
                transformOrigin: '50% 90%',
              }}
            >
              <svg width="64" height="84" viewBox="0 0 64 84">
                <defs>
                  <linearGradient id="scraperHandle" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#1e3a5f" />
                    <stop offset="0.5" stopColor="#4a7bb5" />
                    <stop offset="1" stopColor="#1e3a5f" />
                  </linearGradient>
                  <linearGradient id="scraperBlade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#e8f4ff" />
                    <stop offset="1" stopColor="#a8c8e8" />
                  </linearGradient>
                </defs>
                {/* Handle */}
                <rect x="22" y="6" width="20" height="44" rx="4" fill="url(#scraperHandle)" stroke="#0a1a2e" strokeWidth="1.2" />
                {/* Handle grip lines */}
                <line x1="24" y1="16" x2="40" y2="16" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
                <line x1="24" y1="22" x2="40" y2="22" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
                <line x1="24" y1="28" x2="40" y2="28" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
                <line x1="24" y1="34" x2="40" y2="34" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
                <line x1="24" y1="40" x2="40" y2="40" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
                {/* Handle highlight */}
                <line x1="26" y1="8" x2="26" y2="48" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
                {/* Neck */}
                <rect x="20" y="50" width="24" height="6" fill="#0a1a2e" />
                {/* Blade */}
                <polygon points="10,56 54,56 50,78 14,78" fill="url(#scraperBlade)" stroke="#3a5a8a" strokeWidth="1" />
                {/* Blade edge */}
                <line x1="14" y1="78" x2="50" y2="78" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
                <line x1="16" y1="60" x2="48" y2="60" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                {/* Brand text */}
                <text x="32" y="30" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6" fontFamily="sans-serif" fontWeight="bold">
                  ICE
                </text>
              </svg>
            </div>
          )}

          {/* Pressed-down state visual indicator */}
          {isDown && cursor.visible && (
            <div
              className="absolute pointer-events-none z-40 rounded-full"
              style={{
                left: cursor.x - 30,
                top: cursor.y - 30,
                width: 60,
                height: 60,
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
