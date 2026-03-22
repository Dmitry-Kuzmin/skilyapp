import { useState, useEffect, useRef, useCallback } from 'react';
import { Crown, Zap, BookOpen, Shield, Brain, Swords, Gift, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface PremiumPromoAdProps {
  onComplete: () => void;
  onSubscribe?: () => void; // Navigate to Premium purchase
}

const SLIDE_DURATION = 4; // 4 seconds per slide (was 3)

const SLIDES = [
  {
    icon: Crown,
    title: 'Premium',
    subtitle: 'Твой пропуск к\nуспеху на экзамене DGT',
    features: [
      { emoji: '⚡', text: 'X2 монеты за всё' },
      { emoji: '🚫', text: 'Ноль рекламы навсегда' },
      { emoji: '🤖', text: 'AI-наставник без лимитов' },
    ],
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    accentGradient: 'from-violet-400 to-purple-400',
    glow: 'bg-violet-500',
    iconColor: 'text-amber-300',
    bgPattern: 'radial-gradient(circle at 30% 20%, rgba(139,92,246,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99,102,241,0.2) 0%, transparent 50%)',
  },
  {
    icon: Brain,
    title: 'AI-разборы',
    subtitle: 'Умный анализ каждого\nнеправильного ответа',
    features: [
      { emoji: '🎯', text: 'Персональный разбор ошибок' },
      { emoji: '📊', text: 'Аналитика слабых тем' },
      { emoji: '💡', text: 'Объяснения простым языком' },
    ],
    gradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    accentGradient: 'from-cyan-400 to-blue-400',
    glow: 'bg-cyan-500',
    iconColor: 'text-cyan-300',
    bgPattern: 'radial-gradient(circle at 20% 30%, rgba(6,182,212,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.2) 0%, transparent 50%)',
  },
  {
    icon: Zap,
    title: 'X2 Монеты',
    subtitle: 'Удвоенные награды\nза каждое действие',
    features: [
      { emoji: '🏆', text: 'Двойные за тесты и дуэли' },
      { emoji: '📅', text: 'Двойные ежедневные бонусы' },
      { emoji: '⛏️', text: 'Двойной CryptoMiner' },
    ],
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    accentGradient: 'from-amber-400 to-orange-400',
    glow: 'bg-amber-500',
    iconColor: 'text-yellow-300',
    bgPattern: 'radial-gradient(circle at 40% 20%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 60% 80%, rgba(234,88,12,0.2) 0%, transparent 50%)',
  },
  {
    icon: Swords,
    title: '3 буста в дуэлях',
    subtitle: 'Преимущество в PvP —\n3 буста вместо 1',
    features: [
      { emoji: '🛡️', text: '3 активных буста' },
      { emoji: '⚔️', text: 'Доминируй в дуэлях' },
      { emoji: '🏅', text: 'Эксклюзивные скины' },
    ],
    gradient: 'from-emerald-500 via-green-600 to-teal-700',
    accentGradient: 'from-emerald-400 to-green-400',
    glow: 'bg-emerald-500',
    iconColor: 'text-emerald-300',
    bgPattern: 'radial-gradient(circle at 30% 70%, rgba(16,185,129,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(20,184,166,0.2) 0%, transparent 50%)',
  },
  {
    icon: BookOpen,
    title: 'Все вопросы',
    subtitle: 'Полный доступ к 3000+\nвопросов DGT Испании',
    features: [
      { emoji: '📝', text: 'Все темы без ограничений' },
      { emoji: '🔓', text: 'Закрытые тесты открыты' },
      { emoji: '🇪🇸', text: 'Актуальная база DGT' },
    ],
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    accentGradient: 'from-fuchsia-400 to-pink-400',
    glow: 'bg-fuchsia-500',
    iconColor: 'text-fuchsia-300',
    bgPattern: 'radial-gradient(circle at 60% 20%, rgba(192,38,211,0.3) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(219,39,119,0.2) 0%, transparent 50%)',
  },
  {
    icon: Gift,
    title: '500 монет',
    subtitle: 'Бонус при оплате\nгодовой подписки',
    features: [
      { emoji: '🎁', text: '500 монет сразу на счёт' },
      { emoji: '💰', text: 'Экономия 60% за год' },
      { emoji: '👑', text: 'Все функции навсегда' },
    ],
    gradient: 'from-yellow-500 via-amber-500 to-orange-600',
    accentGradient: 'from-yellow-400 to-amber-400',
    glow: 'bg-yellow-500',
    iconColor: 'text-yellow-200',
    bgPattern: 'radial-gradient(circle at 50% 30%, rgba(234,179,8,0.3) 0%, transparent 50%), radial-gradient(circle at 50% 70%, rgba(245,158,11,0.2) 0%, transparent 50%)',
  },
];

export function PremiumPromoAd({ onComplete, onSubscribe }: PremiumPromoAdProps) {
  const totalDuration = SLIDES.length * SLIDE_DURATION;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const slideIntervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDuration - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(intervalRef.current);
        clearInterval(slideIntervalRef.current);
        onComplete();
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [totalDuration, onComplete]);

  useEffect(() => {
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION * 1000);
    return () => clearInterval(slideIntervalRef.current);
  }, []);

  const handleSubscribe = useCallback(() => {
    completedRef.current = true;
    clearInterval(intervalRef.current);
    clearInterval(slideIntervalRef.current);
    onSubscribe?.();
  }, [onSubscribe]);

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;
  const slideProgress = ((Date.now() - startTimeRef.current) / 1000 - currentSlide * SLIDE_DURATION) / SLIDE_DURATION;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ minHeight: 'inherit' }}>
      {/* Animated background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          className={cn("absolute inset-0 bg-gradient-to-br", slide.gradient)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: slide.bgPattern }} />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
      }} />

      {/* Floating glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className={cn("absolute -top-20 -right-20 w-60 h-60 sm:w-80 sm:h-80 rounded-full blur-[80px] opacity-30", slide.glow)}
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className={cn("absolute -bottom-16 -left-16 w-48 h-48 sm:w-64 sm:h-64 rounded-full blur-[60px] opacity-20", slide.glow)}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* ═══ Top: progress bar + timer ═══ */}
      <div className="relative z-20 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4 pb-2 space-y-2 flex-shrink-0">
        {/* Segmented progress bar */}
        <div className="flex gap-[3px]">
          {SLIDES.map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] sm:h-[3px] rounded-full bg-white/20 overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 left-0 bg-white"
                initial={{ width: i < currentSlide ? '100%' : '0%' }}
                animate={{ width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' }}
                transition={{ duration: i === currentSlide ? SLIDE_DURATION : 0.2, ease: "linear" }}
              />
            </div>
          ))}
        </div>

        {/* Header line */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-300/70" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Skily Premium
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white/80 tabular-nums">
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Main content ═══ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 min-h-0 overflow-y-auto w-full overflow-x-hidden no-scrollbar py-2 sm:py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentSlide}`}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            {/* Icon */}
            <motion.div className="relative mb-3 sm:mb-5 lg:mb-6 mt-auto">
              <motion.div
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto rounded-[1.25rem] sm:rounded-[1.75rem] bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl"
                animate={{ rotateY: [0, 6, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <SlideIcon className={cn("w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 drop-shadow-lg", slide.iconColor)} />
              </motion.div>
              <motion.div
                className="absolute inset-x-0 mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-[1.25rem] sm:rounded-[1.75rem] border-2 border-white/25"
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </motion.div>>

            {/* Title */}
            <motion.h2
              className="text-[1.75rem] sm:text-3xl lg:text-[2.25rem] font-black text-white tracking-tight leading-none mb-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              {slide.title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="text-xs sm:text-sm lg:text-base text-white/55 font-medium max-w-[280px] leading-relaxed whitespace-pre-line mb-3 sm:mb-4 lg:mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {slide.subtitle}
            </motion.p>

            {/* Features */}
            <motion.div
              className="w-full space-y-1.5 sm:space-y-2 mb-auto pb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {slide.features.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] text-left"
                >
                  <span className="text-base sm:text-lg flex-shrink-0">{feature.emoji}</span>
                  <span className="text-[12px] sm:text-[13px] lg:text-sm font-semibold text-white/85">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ Bottom: CTA + dots ═══ */}
      <div className="relative z-20 px-5 sm:px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-3 flex-shrink-0">
        {/* Subscribe CTA */}
        {onSubscribe && (
          <motion.button
            onClick={handleSubscribe}
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-white text-gray-900 font-black text-[15px] sm:text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-2xl shadow-black/20"
            whileTap={{ scale: 0.97 }}
          >
            <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
            <span>Оформить Premium</span>
          </motion.button>
        )}

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === currentSlide
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/25"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
