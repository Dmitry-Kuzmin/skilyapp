import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface DailyStreakTrackerProps {
  currentStreak: number;
  onClaim: () => void;
  hasClaimedToday: boolean;
  weekNumber?: number;
}

const TOTAL_DAYS = 7;

export const DailyStreakTracker: React.FC<DailyStreakTrackerProps> = ({
  currentStreak,
  onClaim,
  hasClaimedToday,
  weekNumber = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    gravity: number;
  }>>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate progress
  const progress = (currentStreak % TOTAL_DAYS) || TOTAL_DAYS;
  const progressPercent = (progress / TOTAL_DAYS) * 100;
  const remaining = TOTAL_DAYS - progress;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Confetti animation
  const fireConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = ['#ff4d00', '#ffb700', '#2ECC71', '#ffffff'];
    
    // Используем сохраненную позицию клика или позицию кнопки как fallback
    let startX: number;
    let startY: number;
    
    if (clickPositionRef.current) {
      startX = clickPositionRef.current.x;
      startY = clickPositionRef.current.y;
    } else {
      // Fallback: используем позицию кнопки
      const button = buttonRef.current;
      if (!button) return;
      const buttonRect = button.getBoundingClientRect();
      startX = buttonRect.left + buttonRect.width / 2;
      startY = buttonRect.top + buttonRect.height / 2;
    }

    // Убеждаемся, что canvas имеет правильные размеры
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    for (let i = 0; i < 100; i++) {
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        size: Math.random() * 8 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100,
        gravity: 0.5,
      });
    }

    animateConfetti();
  }, []);

  const animateConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      p.size *= 0.96;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    animationFrameRef.current = requestAnimationFrame(animateConfetti);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const clickPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Сохраняем координаты клика для конфетти
    const rect = e.currentTarget.getBoundingClientRect();
    clickPositionRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    
    // Всегда запускаем конфетти для тестирования
    fireConfetti();
    // Вызываем onClaim только если еще не получили награду сегодня
    if (!hasClaimedToday) {
      onClaim();
    }
  };

  const getDayWord = (num: number) => {
    if (num === 1) return 'день';
    if (num > 1 && num < 5) return 'дня';
    return 'дней';
  };

  return (
    <div className="relative w-full max-w-[380px] mx-auto">
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Confetti Canvas - fixed position to cover entire viewport */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 pointer-events-none z-[100]"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* Card */}
      <div className="relative bg-[#0f1623] border border-[#1e293b] rounded-[40px] p-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white">Ежедневная серия</h1>
            <div className="inline-block bg-slate-800/50 border border-slate-700 rounded-full px-3 py-1 text-sm text-slate-300">
              Неделя {weekNumber}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-yellow-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l-8 4v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"></path>
              <path d="M12 22V6"></path>
              <path d="M12 6l4 2"></path>
              <path d="M12 6L8 8"></path>
            </svg>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 mb-8">
          <p className="text-sm text-slate-400">
            {remaining > 0 ? (
              <>
                До звания «Недельный герой» осталось{' '}
                <span className="text-white font-bold">{remaining}</span> {getDayWord(remaining)}
              </>
            ) : (
              <>
                <span className="text-yellow-400 font-bold">Поздравляем!</span> Вы — Недельный герой!
              </>
            )}
          </p>
        </div>

        {/* Main Circular Progress */}
        <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="w-full h-full absolute top-0 left-0" viewBox="0 0 120 120">
            {/* Background Circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#1e293b"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Gradient Def */}
            <defs>
              <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff4d00" />
                <stop offset="100%" stopColor="#ffb700" />
              </linearGradient>
            </defs>
            {/* Progress Circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#orangeGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>

          {/* Inner Content */}
          <div className="text-center z-10 flex flex-col items-center">
            {/* Fire Icon */}
            <motion.div
              className="mb-1"
              animate={{
                scale: [1, 1.1, 1],
                filter: ['drop-shadow(0 0 5px #ff7b00)', 'drop-shadow(0 0 15px #ff4d00)', 'drop-shadow(0 0 5px #ff7b00)'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#ff7b00">
                <path d="M12 2c-4 4-6 8-6 12 0 4 3 7 6 7s6-3 6-7c0-4-2-8-6-12zM12 19c-1.5 0-3-1.5-3-3 0-2 1-4 3-6 2 2 3 4 3 6 0 1.5-1.5 3-3 3z" />
                <path d="M12 12c0 2-1 3-1 3s2-1 2-3-1-3-1-3z" fill="#ffb700" />
              </svg>
            </motion.div>
            <div className="text-5xl font-bold leading-none mb-1 text-white">{progress}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">дней</div>
          </div>
        </div>

        {/* Weekly Dots */}
        <div className="flex justify-between px-4 mb-8">
          {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
            const isActive = i < progress;
            return (
              <div
                key={i}
                className={`w-8 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#ff4d00] to-[#ffb700] shadow-[0_0_10px_rgba(255,123,0,0.5)]'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Action Button */}
        <button
          ref={buttonRef}
          onClick={handleClick}
          className={`w-full py-4 rounded-2xl border font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
            hasClaimedToday
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20 active:scale-95'
              : 'bg-gradient-to-r from-[#ff4d00] to-[#ffb700] border-transparent text-white shadow-[0_4px_15px_rgba(255,123,0,0.3)] hover:brightness-110 active:scale-95'
          }`}
        >
          {hasClaimedToday ? (
            <>
              <Check className="w-5 h-5" />
              <span>МИССИЯ ВЫПОЛНЕНА</span>
            </>
          ) : (
            <span>ВЫПОЛНИТЬ МИССИЮ</span>
          )}
        </button>
      </div>
    </div>
  );
};

