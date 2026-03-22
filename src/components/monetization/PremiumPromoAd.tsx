import { useState, useEffect, useRef } from 'react';
import { Crown, Zap, BookOpen, Shield, ChevronRight, Brain, Swords, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface PremiumPromoAdProps {
  duration?: number;        // Total duration in seconds
  onComplete: () => void;   // Called when promo finishes
  onTryPremium?: () => void; // Optional: navigate to Premium tab
}

const SLIDE_DURATION = 3; // 3 seconds per slide

const SLIDES = [
  {
    icon: Crown,
    title: 'Premium подписка',
    subtitle: 'Твой пропуск к успеху на экзамене DGT',
    features: [
      { emoji: '⚡', text: 'X2 монеты за всё' },
      { emoji: '🚫', text: 'Ноль рекламы навсегда' },
      { emoji: '🤖', text: 'Персональный AI-наставник' },
    ],
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    glow: 'bg-violet-500',
    iconColor: 'text-amber-300',
    particle: '👑',
  },
  {
    icon: Brain,
    title: 'AI-разборы ошибок',
    subtitle: 'Умный анализ каждого неправильного ответа',
    features: [
      { emoji: '🎯', text: 'Персональный разбор ошибок' },
      { emoji: '📊', text: 'Аналитика слабых тем' },
      { emoji: '💡', text: 'Объяснение на понятном языке' },
    ],
    gradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    glow: 'bg-cyan-500',
    iconColor: 'text-cyan-300',
    particle: '🧠',
  },
  {
    icon: Zap,
    title: 'X2 Монеты',
    subtitle: 'Удвоенные награды за каждое действие',
    features: [
      { emoji: '🏆', text: 'Двойные за тесты и дуэли' },
      { emoji: '📅', text: 'Двойные ежедневные бонусы' },
      { emoji: '⛏️', text: 'Двойной майнинг в CryptoMiner' },
    ],
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    glow: 'bg-amber-500',
    iconColor: 'text-yellow-300',
    particle: '🪙',
  },
  {
    icon: Swords,
    title: '3 слота для бустов',
    subtitle: 'Преимущество в дуэлях — 3 буста вместо 1',
    features: [
      { emoji: '🛡️', text: '3 активных буста одновременно' },
      { emoji: '⚔️', text: 'Доминируй в PvP-дуэлях' },
      { emoji: '🏅', text: 'Эксклюзивные скины рейтинга' },
    ],
    gradient: 'from-emerald-500 via-green-600 to-teal-700',
    glow: 'bg-emerald-500',
    iconColor: 'text-emerald-300',
    particle: '⚔️',
  },
  {
    icon: BookOpen,
    title: 'Все вопросы открыты',
    subtitle: 'Полный доступ к 3000+ вопросов DGT',
    features: [
      { emoji: '📝', text: 'Все темы без ограничений' },
      { emoji: '🔓', text: 'Закрытые тематические тесты' },
      { emoji: '🇪🇸', text: 'Актуальная база DGT Испании' },
    ],
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    glow: 'bg-fuchsia-500',
    iconColor: 'text-fuchsia-300',
    particle: '📚',
  },
  {
    icon: Gift,
    title: '500 монет в подарок',
    subtitle: 'Бонус при оплате годовой подписки',
    features: [
      { emoji: '🎁', text: '500 монет сразу на счёт' },
      { emoji: '💰', text: 'Экономия 60% за год' },
      { emoji: '👑', text: 'Все Premium-функции навсегда' },
    ],
    gradient: 'from-yellow-500 via-amber-500 to-orange-600',
    glow: 'bg-yellow-500',
    iconColor: 'text-yellow-200',
    particle: '🎁',
  },
];

export function PremiumPromoAd({
  onComplete,
  onTryPremium,
}: PremiumPromoAdProps) {
  const totalDuration = SLIDES.length * SLIDE_DURATION;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const slideIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Main timer
  useEffect(() => {
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDuration - elapsed);
      const pct = Math.min(100, (elapsed / totalDuration) * 100);

      setTimeLeft(Math.ceil(remaining));
      setProgress(pct);

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(intervalRef.current);
        clearInterval(slideIntervalRef.current);
        onComplete();
      }
    }, 100);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [totalDuration, onComplete]);

  // Slide auto-advance
  useEffect(() => {
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION * 1000);

    return () => {
      clearInterval(slideIntervalRef.current);
    };
  }, []);

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <motion.div
      className="relative w-full h-full min-h-[100dvh] sm:min-h-[520px] overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background gradient — fullscreen */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          className={cn("absolute inset-0 bg-gradient-to-br", slide.gradient)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      {/* Decorative layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Large glow orbs */}
        <motion.div
          className={cn("absolute -top-32 -right-32 w-80 h-80 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-25", slide.glow)}
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className={cn("absolute -bottom-24 -left-24 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-20", slide.glow)}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
        />
        <motion.div
          className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-10", slide.glow)}
          animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`p-${currentSlide}-${i}`}
            className="absolute text-lg sm:text-2xl select-none"
            initial={{
              x: `${15 + (i * 15)}%`,
              y: '110%',
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              y: '-10%',
              opacity: [0, 0.6, 0],
              rotate: [0, 180 + i * 30],
            }}
            transition={{
              duration: 2.5 + i * 0.3,
              delay: i * 0.4,
              ease: 'easeOut',
            }}
          >
            {slide.particle}
          </motion.div>
        ))}
      </div>

      {/* ═══ Top bar: progress segments + timer ═══ */}
      <div className="relative z-20 px-4 sm:px-6 pt-4 sm:pt-5 space-y-2.5">
        {/* Instagram-style progress segments */}
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: i < currentSlide
                    ? '100%'
                    : i === currentSlide
                      ? `${((progress - (i * (100 / SLIDES.length))) / (100 / SLIDES.length)) * 100}%`
                      : '0%',
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>

        {/* Badge + timer */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[10px] sm:text-[11px] font-bold text-white/50 uppercase tracking-[0.15em]">
              Skily Premium
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            <span className="text-[11px] sm:text-xs font-mono font-bold text-white/90 tabular-nums">
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Main content area — centered ═══ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentSlide}`}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.92 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center w-full max-w-md space-y-6 sm:space-y-8"
          >
            {/* Icon with glow ring */}
            <motion.div className="relative">
              <motion.div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-2xl"
                animate={{ rotateY: [0, 8, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <SlideIcon className={cn("w-12 h-12 sm:w-14 sm:h-14 drop-shadow-lg", slide.iconColor)} />
              </motion.div>
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-[2rem] border-2 border-white/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              {/* Second ring */}
              <motion.div
                className="absolute inset-0 rounded-[2rem] border border-white/15"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              />
            </motion.div>

            {/* Title + subtitle */}
            <div className="space-y-2 sm:space-y-3">
              <motion.h2
                className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {slide.title}
              </motion.h2>
              <motion.p
                className="text-sm sm:text-base text-white/65 font-medium max-w-xs mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {slide.subtitle}
              </motion.p>
            </div>

            {/* Feature cards */}
            <motion.div
              className="w-full space-y-2.5 sm:space-y-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {slide.features.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-left"
                >
                  <span className="text-xl sm:text-2xl flex-shrink-0">{feature.emoji}</span>
                  <span className="text-sm sm:text-base font-semibold text-white/90">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ Bottom: CTA + dots ═══ */}
      <div className="relative z-20 px-5 sm:px-8 pb-6 sm:pb-8 space-y-4">
        {onTryPremium && (
          <motion.button
            onClick={onTryPremium}
            className="w-full py-4 sm:py-4.5 rounded-2xl bg-white text-gray-900 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all shadow-2xl shadow-black/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Попробовать Premium</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.button>
        )}

        {/* Dot indicators */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === currentSlide
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/30"
              )}
              layout
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
